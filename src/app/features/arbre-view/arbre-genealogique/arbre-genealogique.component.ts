import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { delay, finalize } from 'rxjs/operators';
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

  // Propriété pour la recherche par NINA
  searchNina: string = '';
  isNinaValid: boolean = false;
  isDirty: boolean = false; // Indique si l'arbre a été modifié et nécessite un rendu

  private subscriptions: Subscription[] = [];
  private svg: any;
  private zoom: any;
  public viewMode: 'generational' | 'hierarchical' = 'generational';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private arbreService: ArbreGenealogiqueService,
    private personneService: PersonneService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Écouter les changements de paramètres de route
    this.subscriptions.push(
      this.route.paramMap.subscribe(params => {
        const personneId = params.get('id');
        if (personneId) {
          // Nettoyer l'état actuel avant de charger un nouvel arbre
          this.clearCurrentTree();
          this.loadArbre(personneId);
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.initializeTreeView();
  }

  ngOnDestroy(): void {
    // Se désabonner de toutes les souscriptions pour éviter les fuites de mémoire
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
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

    // Réinitialiser l'erreur si l'utilisateur modifie le NINA
    if (this.error && this.searchNina.length > 0) {
      this.error = null;
    }
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

    // Réinitialiser l'état avant de rechercher
    this.clearCurrentTree();

    // Rechercher la personne par NINA
    this.subscriptions.push(
      this.personneService.getPersonneByNina(this.searchNina)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.changeDetectorRef.detectChanges();
          })
        )
        .subscribe({
          next: (personne) => {
            if (personne && personne.id) {
              // Charger directement l'arbre de la personne trouvée
              this.loadArbre(personne.id);
            } else {
              this.error = `Aucune personne trouvée avec le NINA ${this.searchNina}`;
            }
          },
          error: (err) => {
            this.error = `Aucune personne trouvée avec le NINA ${this.searchNina}`;
            console.error('Erreur lors de la recherche par NINA:', err);
          }
        })
    );
  }

  /**
   * Réinitialise complètement l'affichage de l'arbre courant
   */
  private clearCurrentTree(): void {
    this.arbre = null;
    this.treeData = null;
    this.selectedPerson = null;
    this.error = null;
    this.isDirty = true;

    // Nettoyer le contenu SVG si présent
    if (this.svg) {
      this.svg.select('g.tree-content').selectAll('*').remove();
    }
  }

  /**
   * Charge l'arbre généalogique d'une personne
   */
  loadArbre(personneId: string): void {
    if (!personneId) {
      this.error = 'ID de personne non spécifié';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.isDirty = true;

    this.subscriptions.push(
      this.arbreService.getArbreGenealogique(personneId)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.changeDetectorRef.detectChanges();
          })
        )
        .subscribe({
          next: (arbre) => {
            this.arbre = arbre;
            this.treeData = this.arbreService.transformToTreeData(arbre);
            this.selectedPerson = arbre.personneprincipale;

            // Utiliser un délai court pour s'assurer que le DOM est prêt
            of(null).pipe(delay(50)).subscribe(() => {
              // Redessiner l'arbre après le chargement des données
              this.renderTree();
              // Ajuster le zoom pour voir tout l'arbre
              of(null).pipe(delay(50)).subscribe(() => {
                this.applyInitialZoom();
              });
            });
          },
          error: (err) => {
            this.error = `Erreur lors du chargement de l'arbre: ${err.message}`;
            console.error('Erreur lors du chargement de l\'arbre:', err);
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
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      this.isDirty = true;
      // Redessiner l'arbre uniquement si nous avons des données
      if (this.treeData) {
        this.renderTree();
        // Ajuster le zoom après le rendu
        of(null).pipe(delay(50)).subscribe(() => {
          this.applyInitialZoom();
        });
      }
    }
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
    if (this.treeData && this.isDirty) {
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
        scale = 0.15; // Zoom plus faible pour les grands arbres
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

    // Marquer l'arbre comme propre (pas besoin de rendu)
    this.isDirty = false;
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

    try {
      // Dessiner l'arbre selon le mode d'affichage sélectionné
      if (this.viewMode === 'hierarchical') {
        this.renderHierarchicalTree(width, height);
      } else {
        this.renderGenerationalTree(width, height);
      }
    } catch (err) {
      console.error('Erreur lors du rendu de l\'arbre:', err);
      this.error = 'Erreur lors du rendu de l\'arbre. Veuillez réessayer.';
    }
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

  /**
   * Cette fonction modifiée améliore le rendu de l'arbre par génération
   * en assurant une meilleure séparation des branches et en évitant les croisements
   */
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

    // Création d'une map des nœuds par ID pour faciliter l'accès
    const nodesById = new Map<string, PositionedTreeNode>();
    layoutData.nodes.forEach(node => {
      nodesById.set(node.id, node);
    });

    // Création d'une map des liens par paires source-target pour éviter les doublons
    const linkKeys = new Set<string>();

    // MODIFICATION: Utiliser exactement le même style de courbe que dans la vue étalée
    this.treeData.links.forEach(link => {
      const source = nodesById.get(link.source);
      const target = nodesById.get(link.target);

      if (!source || !target || !source.x || !source.y || !target.x || !target.y) {
        return; // Ignorer les liens incomplets
      }

      // Éviter les doublons de liens
      const linkKey = `${link.source}-${link.target}`;
      if (linkKeys.has(linkKey)) return;
      linkKeys.add(linkKey);

      // Déterminer si c'est un lien paternel ou maternel
      let linkType = 'default-link';
      let linkColor = '#bdbdbd';
      let strokeWidth = 2;

      // Déterminer si l'un des nœuds est la personne principale
      const isMainPersonInvolved = source.relation === 'principal' || target.relation === 'principal';


      // MODIFICATION: Utiliser exactement le même code que dans renderHierarchicalTree
      // pour dessiner les courbes avec d3.linkHorizontal
      const diagonal = d3.linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x);

      // Adapter les données pour le format attendu par d3.linkHorizontal
      const linkData = {
        source: {
          x: source.y, // Inverser x et y pour linkHorizontal (qui travaille horizontalement)
          y: source.x
        },
        target: {
          x: target.y,
          y: target.x
        }
      };

      // Dessiner le lien avec la courbe d3.linkHorizontal
      linksGroup.append('path')
        .attr('class', `tree-link ${linkType} ${isMainPersonInvolved ? 'principal-link' : ''}`)
        .attr('d', diagonal(linkData))
        .style('stroke', linkColor)
        .style('stroke-width', strokeWidth)
        .style('fill', 'none')
        .style('stroke-opacity', 0.8);
    });

    // Dessiner les nœuds de l'arbre avec des styles améliorés
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
          .filter((linkData: any) => {
            const link = linkData as any;
            if (!link.source || !link.target) return false;
            return link.source === d.id || link.target === d.id ||
              link.source.id === d.id || link.target.id === d.id;
          })
          .style('stroke-opacity', 1)
          .style('stroke-width', (link: any) => {
            const currentWidth = parseFloat(d3.select(link).style('stroke-width') || '2');
            return currentWidth + 1;
          });
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
          .style('stroke-opacity', 0.8)
          .style('stroke-width', (link: any) => {
            // Récupérer la classe du lien pour déterminer son épaisseur d'origine
            const linkElement = d3.select(link);
            const classes = linkElement.attr('class') || '';
            if (classes.includes('paternal-link') || classes.includes('maternal-link')) {
              return 2.5;
            }
            return classes.includes('principal-link') ? 3 : 2;
          });
      });

    // Ajouter des rectangles aux nœuds avec les couleurs selon le genre
    // Harmoniser le style avec la vue hiérarchique
    nodes.append('rect')
      .attr('x', -90)
      .attr('y', -45)
      .attr('width', 180)
      .attr('height', 90)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d: PositionedTreeNode) => {
        // Couleurs basées sur le genre et la relation, harmonisées avec la vue hiérarchique
        if (d.relation === 'principal') {
          return '#e8f5e9'; // Vert pâle pour la personne principale
        } else {
          return d.genre === 'M' ? '#e3f2fd' : '#fce4ec'; // Bleu pâle pour les hommes, rose pâle pour les femmes
        }
      })
      .style('stroke', (d: PositionedTreeNode) => {
        // Couleur de bordure basée sur le genre, harmonisée avec la vue hiérarchique
        if (d.relation === 'principal') {
          return '#4caf50'; // Vert pour la personne principale
        } else {
          return d.genre === 'M' ? '#2196f3' : '#e91e63'; // Bleu pour les hommes, rose pour les femmes
        }
      })
      .style('stroke-width', (d: PositionedTreeNode) => {
        // Bordure plus épaisse pour la personne principale, harmonisée avec la vue hiérarchique
        return d.relation === 'principal' ? 3 : 1.5;
      })
      .style('filter', (d: PositionedTreeNode) => {
        // Ombre portée plus marquée pour la personne principale, harmonisée avec la vue hiérarchique
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