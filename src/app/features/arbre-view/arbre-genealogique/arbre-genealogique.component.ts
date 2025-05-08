import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';

import { Personne } from '../../../core/models/personne.model';
import { ArbreGenealogique, TreeData, TreeNode } from '../../../core/models/arbre-genealogique.model';
import { ArbreGenealogiqueService } from '../../../core/services/arbre-genealogique.service';
import { PersonneService } from '../../../core/services/personne.service';
import { TreeLayoutUtils } from '../../../core/utils/tree-layout.utils';

// Interface pour les données D3
interface D3Node {
  data: TreeNode;
  x: number;
  y: number;
  children?: D3Node[];
}

interface D3Link {
  source: D3Node;
  target: D3Node;
}

@Component({
  selector: 'app-arbre-genealogique',
  templateUrl: './arbre-genealogique.component.html',
  styleUrls: ['./arbre-genealogique.component.scss']
})
export class ArbreGenealogiqueComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('treeContainer') treeContainer!: ElementRef;

  arbre: ArbreGenealogique | null = null;
  treeData: TreeData | null = null;
  selectedPerson: Personne | null = null;
  isLoading = false;
  error: string | null = null;

  // Nouvelle propriété pour la recherche par NINA
  searchNina: string = '';
  isNinaValid: boolean = false;

  private subscriptions: Subscription[] = [];
  private svg: any;
  private zoom: any;
  public viewMode: 'generational' | 'hierarchical' = 'generational';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private arbreService: ArbreGenealogiqueService,
    private personneService: PersonneService
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.route.paramMap.subscribe(params => {
        const personneId = params.get('id');
        if (personneId) {
          this.loadArbre(personneId);
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.initializeTreeView();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Valide l'entrée NINA
   */
  validateNinaInput(event?: Event): void {
    // Nettoyer l'entrée pour s'assurer qu'elle ne contient que des chiffres
    this.searchNina = this.searchNina.replace(/[^0-9]/g, '');

    // Limiter à 15 chiffres au maximum
    if (this.searchNina.length > 15) {
      this.searchNina = this.searchNina.substring(0, 15);
    }

    // Vérifier la validité
    this.isNinaValid = this.searchNina.length === 15;
  }

  /**
   * Recherche une personne par son NINA et affiche son arbre
   */
  findPersonByNina(): void {
    if (!this.isNinaValid) {
      this.error = 'Le NINA doit contenir exactement 15 chiffres';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.personneService.getPersonneByNina(this.searchNina).subscribe({
      next: (personne) => {
        this.loadArbre(personne.id);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = `Aucune personne trouvée avec le NINA ${this.searchNina}`;
      }
    });
  }

  /**
   * Charge l'arbre généalogique d'une personne
   */
  loadArbre(personneId: string): void {
    this.isLoading = true;
    this.error = null;

    this.subscriptions.push(
      this.arbreService.getArbreGenealogique(personneId).subscribe({
        next: (arbre) => {
          this.arbre = arbre;
          this.treeData = this.arbreService.transformToTreeData(arbre);
          this.selectedPerson = arbre.personneprincipale;
          this.isLoading = false;

          // Redessiner l'arbre après le chargement des données
          setTimeout(() => this.renderTree(), 0);
        },
        error: (err) => {
          this.error = `Erreur lors du chargement de l'arbre: ${err.message}`;
          this.isLoading = false;
        }
      })
    );
  }

  selectPerson(person: Personne): void {
    this.selectedPerson = person;
  }

  onPersonDetails(person: Personne): void {
    this.router.navigate(['/person-details', person.id]);
  }

  onTreeNodeClick(node: TreeNode): void {
    if (this.arbre) {
      const person = this.arbre.membres.find(m => m.id === node.id);
      if (person) {
        this.selectPerson(person);
      }
    }
  }

  switchViewMode(mode: 'generational' | 'hierarchical'): void {
    this.viewMode = mode;
    this.renderTree();
  }

  /**
   * Initialise la vue de l'arbre avec un zoom adapté pour voir toutes les générations
   */
  private initializeTreeView(): void {
    const container = this.treeContainer.nativeElement;

    // Créer l'élément SVG
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('overflow', 'visible');

    // Configurer le zoom
    this.zoom = d3.zoom()
      .scaleExtent([0.2, 3]) // Permettre un zoom arrière plus important pour voir l'arbre complet
      .on('zoom', (event: any) => {
        this.svg.select('g.tree-content')
          .attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Créer un groupe pour contenir tout le contenu de l'arbre
    this.svg.append('g')
      .attr('class', 'tree-content');

    // Ajouter des contrôles visuels de zoom
    const zoomControls = d3.select(container)
      .append('div')
      .attr('class', 'zoom-controls')
      .style('position', 'absolute')
      .style('bottom', '20px')
      .style('right', '20px')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('background', 'rgba(255, 255, 255, 0.8)')
      .style('border-radius', '4px')
      .style('padding', '5px')
      .style('box-shadow', '0 2px 5px rgba(0, 0, 0, 0.2)');

    zoomControls.append('button')
      .attr('class', 'zoom-in-btn')
      .text('+')
      .style('width', '30px')
      .style('height', '30px')
      .style('font-size', '18px')
      .style('margin-bottom', '5px')
      .style('cursor', 'pointer')
      .on('click', () => {
        this.svg.transition().duration(300).call(
          this.zoom.scaleBy, 1.3
        );
      });

    zoomControls.append('button')
      .attr('class', 'zoom-out-btn')
      .text('-')
      .style('width', '30px')
      .style('height', '30px')
      .style('font-size', '18px')
      .style('cursor', 'pointer')
      .on('click', () => {
        this.svg.transition().duration(300).call(
          this.zoom.scaleBy, 0.7
        );
      });

    zoomControls.append('button')
      .attr('class', 'zoom-reset-btn')
      .text('↻')
      .style('width', '30px')
      .style('height', '30px')
      .style('font-size', '14px')
      .style('margin-top', '5px')
      .style('cursor', 'pointer')
      .on('click', () => {
        this.applyInitialZoom();
      });

    // Si des données sont déjà disponibles, rendre l'arbre
    if (this.treeData) {
      this.renderTree();
    }
  }

  /**
   * Applique un zoom initial optimal pour voir tout l'arbre
   */
  private applyInitialZoom(): void {
    if (!this.svg || !this.zoom) return;

    const container = this.treeContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Définir un facteur de zoom réduit pour voir tout l'arbre
    const scale = this.viewMode === 'hierarchical' ? 0.35 : 0.5;

    // Centrer l'arbre
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale);

    // Appliquer la transformation avec une animation
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, transform);
  }

  /**
   * Rend l'arbre selon le mode d'affichage sélectionné
   */
  private renderTree(): void {
    if (!this.treeData || !this.svg) return;

    // Récupérer les dimensions du conteneur
    const container = this.treeContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Effacer le contenu précédent
    this.svg.select('g.tree-content').selectAll('*').remove();

    // Dessiner l'arbre selon le mode d'affichage sélectionné
    if (this.viewMode === 'hierarchical') {
      this.renderHierarchicalTree(width, height);
    } else {
      this.renderGenerationalTree(width, height);
    }

    // Ajuster automatiquement le zoom pour voir tout l'arbre
    this.applyInitialZoom();
  }

  private renderHierarchicalTree(width: number, height: number): void {
    if (!this.treeData) return;

    try {
      // Créer une disposition hiérarchique
      const root = TreeLayoutUtils.createHierarchicalLayout(this.treeData, width, height);

      // Groupe pour les liens avec classe spécifique pour faciliter le styling
      const linksGroup = this.svg.select('g.tree-content')
        .append('g')
        .attr('class', 'links-group');

      // Groupe pour les nœuds au-dessus des liens
      const nodesGroup = this.svg.select('g.tree-content')
        .append('g')
        .attr('class', 'nodes-group');

      // Dessiner les liens avec une courbe plus élégante
      linksGroup.selectAll('path.tree-link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'tree-link')
        .attr('d', d3.linkHorizontal<any, any>()
          .x((d: any) => d.y)
          .y((d: any) => d.x))
        .style('stroke', '#b3b3b3')
        .style('stroke-width', 1.5)
        .style('fill', 'none')
        .style('stroke-opacity', 0.8);

      // Dessiner les nœuds
      const nodes = nodesGroup.selectAll('g.tree-node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'tree-node')
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .on('click', (event: any, d: any) => {
          this.onTreeNodeClick(d.data);
        })
        // Utiliser des fonctions fléchées pour éviter les problèmes de 'this'
        .on('mouseover', (event: any, d: any) => {
          // Utiliser event.currentTarget au lieu de this
          d3.select(event.currentTarget).select('rect')
            .transition()
            .duration(300)
            .attr('width', 220) // Augmenté
            .attr('height', 80) // Augmenté
            .attr('x', -110) // Ajusté
            .attr('y', -40); // Ajusté
        })
        .on('mouseout', (event: any, d: any) => {
          // Utiliser event.currentTarget au lieu de this
          d3.select(event.currentTarget).select('rect')
            .transition()
            .duration(300)
            .attr('width', 200) // Augmenté
            .attr('height', 70) // Augmenté
            .attr('x', -100) // Ajusté
            .attr('y', -35); // Ajusté
        });

      // Ajouter des rectangles aux nœuds pour une meilleure visualisation
      nodes.append('rect')
        .attr('x', -100) // Augmenté
        .attr('y', -35) // Ajusté
        .attr('width', 200) // Augmenté
        .attr('height', 70) // Augmenté
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', (d: any) => {
          // Couleurs différentes selon le genre et la génération
          const baseColor = d.data.genre === 'M' ? '#e3f2fd' : '#fce4ec';
          const alpha = d.data.relation === 'principal' ? 1 : 0.7 + (0.3 / (d.data.generation + 1));
          return baseColor;
        })
        .style('stroke', (d: any) => d.data.genre === 'M' ? '#2196f3' : '#e91e63')
        .style('stroke-width', (d: any) => d.data.relation === 'principal' ? 3 : 1.5);

      // Ajouter des étiquettes aux nœuds pour le nom
      nodes.append('text')
        .attr('dy', '-15') // Ajusté pour laisser de la place pour le NINA
        .attr('text-anchor', 'middle')
        .text((d: any) => `${d.data.nom} ${d.data.prenom}`)
        .style('font-size', '14px')
        .style('font-weight', (d: any) => d.data.relation === 'principal' ? 'bold' : 'normal')
        .style('fill', '#333');

      // Ajouter une étiquette pour le NINA
      nodes.append('text')
        .attr('dy', '5')
        .attr('text-anchor', 'middle')
        .text((d: any) => `NINA: ${d.data.nina}`)
        .style('font-size', '12px')
        .style('fill', '#1976d2');

      // Ajouter une étiquette pour le type de relation
      nodes.append('text')
        .attr('dy', '25')
        .attr('text-anchor', 'middle')
        .text((d: any) => d.data.relation !== 'principal' ? d.data.relation : '')
        .style('font-size', '11px')
        .style('fill', '#666')
        .style('font-style', 'italic');

    } catch (error) {
      console.error('Erreur lors du rendu de l\'arbre hiérarchique:', error);
      this.error = 'Erreur lors du rendu de l\'arbre. Essayez un autre mode d\'affichage.';

      // Basculer vers le mode générationnel en cas d'erreur
      this.viewMode = 'generational';
      this.renderGenerationalTree(width, height);
    }
  }

  private renderGenerationalTree(width: number, height: number): void {
    if (!this.treeData) return;

    // Créer une disposition par génération
    const layoutData = TreeLayoutUtils.createGenerationalLayout(this.treeData, width, height);

    // Groupe pour les liens
    const linksGroup = this.svg.select('g.tree-content')
      .append('g')
      .attr('class', 'links-group');

    // Groupe pour les nœuds
    const nodesGroup = this.svg.select('g.tree-content')
      .append('g')
      .attr('class', 'nodes-group');

    // Dessiner les liens avec des courbes Bézier plus élégantes
    layoutData.links.forEach(link => {
      const source = layoutData.nodes.find(n => n.id === link.source);
      const target = layoutData.nodes.find(n => n.id === link.target);

      if (source && target && source.x !== undefined && source.y !== undefined &&
        target.x !== undefined && target.y !== undefined) {

        // Utiliser des points de contrôle pour créer des courbes plus agréables
        // Ajuster la force de la courbe selon la distance
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Créer des points de contrôle pour une courbe en S plus naturelle
        linksGroup.append('path')
          .attr('class', 'tree-link')
          .attr('d', `M${source.x},${source.y} 
                    C${source.x},${source.y + distance / 3} 
                      ${target.x},${target.y - distance / 3} 
                      ${target.x},${target.y}`)
          .style('stroke', '#b3b3b3')
          .style('stroke-width', 1.5)
          .style('fill', 'none')
          .style('stroke-opacity', 0.8);
      }
    });

    // Dessiner les nœuds avec un style amélioré
    const nodes = nodesGroup.selectAll('g.tree-node')
      .data(layoutData.nodes)
      .enter()
      .append('g')
      .attr('class', (d: any) => `tree-node ${d.genre === 'M' ? 'male' : 'female'} ${d.relation === 'principal' ? 'principal' : ''}`)
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .on('click', (event: any, d: any) => {
        this.onTreeNodeClick(d);
      })
      // Utiliser des fonctions fléchées pour éviter les problèmes de 'this'
      .on('mouseover', (event: any, d: any) => {
        // Utiliser event.currentTarget au lieu de this
        d3.select(event.currentTarget).select('rect')
          .transition()
          .duration(300)
          .attr('width', 200) // Augmenté
          .attr('height', 100) // Augmenté
          .attr('x', -100) // Ajusté
          .attr('y', -50); // Ajusté
      })
      .on('mouseout', (event: any, d: any) => {
        // Utiliser event.currentTarget au lieu de this
        d3.select(event.currentTarget).select('rect')
          .transition()
          .duration(300)
          .attr('width', 180) // Augmenté
          .attr('height', 90) // Augmenté
          .attr('x', -90) // Ajusté
          .attr('y', -45); // Ajusté
      });

    // Ajouter des rectangles aux nœuds avec des coins arrondis et des styles améliorés
    nodes.append('rect')
      .attr('x', -90) // Augmenté
      .attr('y', -45) // Ajusté
      .attr('width', 180) // Augmenté
      .attr('height', 90) // Augmenté
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d: any) => {
        // Couleurs plus douces pour chaque génération
        const baseColor = d.genre === 'M' ? '#e3f2fd' : '#fce4ec';
        const alpha = d.relation === 'principal' ? 1 : 0.7 + (0.3 / (d.generation + 1));
        return baseColor;
      })
      .style('stroke', (d: any) => d.genre === 'M' ? '#2196f3' : '#e91e63')
      .style('stroke-width', (d: any) => d.relation === 'principal' ? 3 : 1.5)
      .style('filter', (d: any) => d.relation === 'principal' ?
        'drop-shadow(0 2px 5px rgba(0,0,0,0.2))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))');

    // Ajouter un icône de genre
    nodes.append('text')
      .attr('class', 'gender-icon')
      .attr('dy', '-25') // Ajusté pour laisser place aux autres informations
      .attr('text-anchor', 'middle')
      .attr('font-family', 'FontAwesome')
      .text((d: any) => d.genre === 'M' ? '\uf222' : '\uf221') // Icônes Font Awesome pour homme/femme
      .style('font-size', '14px')
      .style('fill', (d: any) => d.genre === 'M' ? '#1976d2' : '#d81b60');

    // Ajouter les noms des personnes (nom et prénom)
    nodes.append('text')
      .attr('dy', '-5') // Ajusté
      .attr('text-anchor', 'middle')
      .attr('class', 'node-name')
      .text((d: any) => `${d.nom} ${d.prenom}`)
      .style('font-size', '13px')
      .style('font-weight', (d: any) => d.relation === 'principal' ? 'bold' : 'normal')
      .style('fill', '#333');

    // Ajouter le NINA
    nodes.append('text')
      .attr('dy', '15') // Ajusté
      .attr('text-anchor', 'middle')
      .attr('class', 'node-nina')
      .text((d: any) => `NINA: ${d.nina}`)
      .style('font-size', '11px')
      .style('fill', '#1976d2');

    // Ajouter les relations avec un style plus visible
    nodes.append('text')
      .attr('dy', '35') // Ajusté
      .attr('text-anchor', 'middle')
      .attr('class', 'node-relation')
      .text((d: any) => d.relation !== 'principal' ? d.relation : '')
      .style('font-size', '10px')
      .style('font-style', 'italic')
      .style('fill', '#555');
  }
}