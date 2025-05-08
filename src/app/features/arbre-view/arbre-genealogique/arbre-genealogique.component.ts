import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';

import { Personne } from '../../../core/models/personne.model';
import { ArbreGenealogique, TreeData, TreeNode } from '../../../core/models/arbre-genealogique.model';
import { ArbreGenealogiqueService } from '../../../core/services/arbre-genealogique.service';
import { PersonneService } from '../../../core/services/personne.service';
import { TreeLayoutUtils } from '../../../core/utils/tree-layout.utils';

// Interfaces pour les types utilisés dans le rendu
interface PositionedTreeNode extends TreeNode {
  x: number;
  y: number;
}

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
      .scaleExtent([0.1, 3]) // Permettre un zoom arrière plus important pour voir l'arbre complet
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

    // Facteur de zoom plus faible pour garantir que tout l'arbre est visible
    let scale = this.viewMode === 'hierarchical' ? 0.3 : 0.2;

    // Ajuster en fonction du nombre de générations
    if (this.viewMode === 'generational' && this.treeData) {
      const generations = this.treeData.nodes.reduce((max, node) =>
        Math.max(max, node.generation), 0) || 0;

      if (generations >= 3) {
        scale = 0.18; // Zoom plus faible pour les grands arbres
      }
    }

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

    // Ajouter la classe spécifique en mode génération
    if (this.viewMode === 'generational') {
      this.svg.classed('tree-branches', true);
    } else {
      this.svg.classed('tree-branches', false);
    }

    // Dessiner l'arbre selon le mode d'affichage sélectionné
    if (this.viewMode === 'hierarchical') {
      this.renderHierarchicalTree(width, height);
    } else {
      this.renderGenerationalTree(width, height);
    }

    // Ajuster automatiquement le zoom pour voir tout l'arbre
    setTimeout(() => this.applyInitialZoom(), 100);
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
        .attr('data-generation', (d: any) => d.data.generation)
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

    // Créer une disposition par génération optimisée pour éviter les entre-coupages
    const layoutData = TreeLayoutUtils.createGenerationalLayout(this.treeData, width, height);

    // Groupe pour les liens
    const linksGroup = this.svg.select('g.tree-content')
      .append('g')
      .attr('class', 'links-group');

    // Groupe pour les nœuds
    const nodesGroup = this.svg.select('g.tree-content')
      .append('g')
      .attr('class', 'nodes-group');

    // Vérifier que tous les nœuds ont une position
    if (layoutData.nodes.length !== this.treeData.nodes.length) {
      console.warn(`Certains nœuds n'ont pas de position: ${this.treeData.nodes.length - layoutData.nodes.length} nœuds manquants`);
    }

    // Dessiner les liens avec des courbes optimisées pour éviter les croisements
    this.treeData.links.forEach(link => {
      // Utiliser le type correct pour source et target
      const source = layoutData.nodes.find(n => n.id === link.source) as PositionedTreeNode | undefined;
      const target = layoutData.nodes.find(n => n.id === link.target) as PositionedTreeNode | undefined;

      if (source && target && source.x !== undefined && source.y !== undefined &&
        target.x !== undefined && target.y !== undefined) {

        // Déterminer si c'est un lien paternel ou maternel
        let linkType = 'default-link';
        let linkColor = '#b3b3b3';

        if (source.relation.includes('pere') || target.relation.includes('pere') ||
          source.relation.includes('paternel') || target.relation.includes('paternel')) {
          linkType = 'paternal-link';
          linkColor = '#2196f3'; // Bleu pour les liens paternels
        } else if (source.relation.includes('mere') || target.relation.includes('mere') ||
          source.relation.includes('maternel') || target.relation.includes('maternel')) {
          linkType = 'maternal-link';
          linkColor = '#e91e63'; // Rose pour les liens maternels
        }

        // Calculer les points de contrôle pour une courbe adaptée
        // Plus le lien est long, plus la courbe est prononcée
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Ajuster les courbes selon le type de lien
        let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;

        // Décalage horizontal plus important pour les liens plus longs
        const horizontalOffset = Math.min(Math.abs(dx) * 0.3, 100);

        if (linkType === 'paternal-link') {
          // Les liens paternels s'incurvent vers la gauche
          controlPoint1X = source.x - horizontalOffset;
          controlPoint1Y = source.y + distance * 0.4;
          controlPoint2X = target.x - horizontalOffset;
          controlPoint2Y = target.y - distance * 0.4;
        } else if (linkType === 'maternal-link') {
          // Les liens maternels s'incurvent vers la droite
          controlPoint1X = source.x + horizontalOffset;
          controlPoint1Y = source.y + distance * 0.4;
          controlPoint2X = target.x + horizontalOffset;
          controlPoint2Y = target.y - distance * 0.4;
        } else {
          // Liens neutres
          controlPoint1X = source.x;
          controlPoint1Y = source.y + distance * 0.4;
          controlPoint2X = target.x;
          controlPoint2Y = target.y - distance * 0.4;
        }

        // Dessiner le lien avec des courbes de Bézier
        linksGroup.append('path')
          .attr('class', `tree-link ${linkType}`)
          .attr('d', `M${source.x},${source.y} 
                    C${controlPoint1X},${controlPoint1Y} 
                      ${controlPoint2X},${controlPoint2Y} 
                      ${target.x},${target.y}`)
          .style('stroke', linkColor)
          .style('stroke-width', 2)
          .style('fill', 'none')
          .style('stroke-opacity', 0.7);
      }
    });

    // Dessiner les nœuds de l'arbre
    const nodes = nodesGroup.selectAll('g.tree-node')
      .data(layoutData.nodes)
      .enter()
      .append('g')
      .attr('class', (d: PositionedTreeNode) => `tree-node ${d.genre === 'M' ? 'male' : 'female'} ${d.relation === 'principal' ? 'principal' : ''}`)
      .attr('transform', (d: PositionedTreeNode) => `translate(${d.x},${d.y})`)
      .attr('data-generation', (d: PositionedTreeNode) => d.generation)
      .attr('data-relation', (d: PositionedTreeNode) => d.relation)
      .on('click', (event: any, d: PositionedTreeNode) => {
        this.onTreeNodeClick(d);
      })
      // Effets d'interaction pour une meilleure expérience utilisateur
      .on('mouseover', (event: any, d: PositionedTreeNode) => {
        // Animation d'agrandissement au survol
        d3.select(event.currentTarget).select('rect')
          .transition()
          .duration(300)
          .attr('width', 200)
          .attr('height', 100)
          .attr('x', -100)
          .attr('y', -50);

        // Mettre en évidence ce nœud
        d3.select(event.currentTarget)
          .style('filter', 'drop-shadow(0 0 5px rgba(0,0,0,0.3))');

        // Mettre en évidence les liens connectés à ce nœud
        linksGroup.selectAll('path.tree-link')
          .filter((link: any) => {
            const linkData = link as any;
            return linkData.source?.id === d.id || linkData.target?.id === d.id;
          })
          .style('stroke-opacity', 1)
          .style('stroke-width', 3);
      })
      .on('mouseout', (event: any, d: PositionedTreeNode) => {
        // Retour à la taille normale
        d3.select(event.currentTarget).select('rect')
          .transition()
          .duration(300)
          .attr('width', 180)
          .attr('height', 90)
          .attr('x', -90)
          .attr('y', -45);

        // Réinitialiser l'ombre
        d3.select(event.currentTarget)
          .style('filter', null);

        // Réinitialiser les liens
        linksGroup.selectAll('path.tree-link')
          .style('stroke-opacity', 0.7)
          .style('stroke-width', 2);
      });

    // Ajouter des rectangles aux nœuds avec les couleurs précédentes selon le genre
    nodes.append('rect')
      .attr('x', -90)
      .attr('y', -45)
      .attr('width', 180)
      .attr('height', 90)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d: PositionedTreeNode) => {
        // Restaurer les couleurs basées sur le genre
        if (d.relation === 'principal') {
          return '#e8f5e9'; // Vert pâle pour la personne principale
        } else {
          return d.genre === 'M' ? '#e3f2fd' : '#fce4ec'; // Bleu pâle pour les hommes, rose pâle pour les femmes
        }
      })
      .style('stroke', (d: PositionedTreeNode) => {
        // Couleur de bordure basée sur le genre
        if (d.relation === 'principal') {
          return '#4caf50'; // Vert pour la personne principale
        } else {
          return d.genre === 'M' ? '#2196f3' : '#e91e63'; // Bleu pour les hommes, rose pour les femmes
        }
      })
      .style('stroke-width', (d: PositionedTreeNode) => {
        // Bordure plus épaisse pour la personne principale
        return d.relation === 'principal' ? 3 : 1.5;
      })
      .style('filter', (d: PositionedTreeNode) => {
        // Ombre portée plus marquée pour la personne principale
        return d.relation === 'principal'
          ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.2))'
          : 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))';
      });

    // Ajouter un icône de genre
    nodes.append('text')
      .attr('class', 'gender-icon')
      .attr('dy', '-25')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'FontAwesome')
      .text((d: PositionedTreeNode) => d.genre === 'M' ? '\uf222' : '\uf221') // Icônes Font Awesome pour homme/femme
      .style('font-size', '14px')
      .style('fill', (d: PositionedTreeNode) => d.genre === 'M' ? '#1976d2' : '#d81b60');

    // Ajouter les noms des personnes (nom et prénom)
    nodes.append('text')
      .attr('dy', '-5')
      .attr('text-anchor', 'middle')
      .attr('class', 'node-name')
      .text((d: PositionedTreeNode) => `${d.nom} ${d.prenom}`)
      .style('font-size', '13px')
      .style('font-weight', (d: PositionedTreeNode) => d.relation === 'principal' ? 'bold' : 'normal')
      .style('fill', '#333');

    // Ajouter le NINA
    nodes.append('text')
      .attr('dy', '15')
      .attr('text-anchor', 'middle')
      .attr('class', 'node-nina')
      .text((d: PositionedTreeNode) => `NINA: ${d.nina}`)
      .style('font-size', '11px')
      .style('fill', '#1976d2');

    // Ajouter les relations avec un style plus visible
    nodes.append('text')
      .attr('dy', '35')
      .attr('text-anchor', 'middle')
      .attr('class', 'node-relation')
      .text((d: PositionedTreeNode) => d.relation !== 'principal' ? d.relation : '')
      .style('font-size', '10px')
      .style('font-style', 'italic')
      .style('fill', '#555');
  }
}
