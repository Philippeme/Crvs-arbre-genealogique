import * as d3 from 'd3';
import { TreeData, TreeNode } from '../models/arbre-genealogique.model';

// Interface pour les nœuds avec position
interface PositionedTreeNode extends TreeNode {
    x: number;
    y: number;
}

export class TreeLayoutUtils {
    /**
     * Crée une disposition hiérarchique pour un arbre généalogique
     * Optimisé pour afficher les trois générations complètes
     */
    static createHierarchicalLayout(treeData: TreeData, width: number, height: number) {
        // Créer un objet map des nœuds pour faciliter l'accès
        const nodesMap = new Map<string, TreeNode>();
        treeData.nodes.forEach(node => {
            nodesMap.set(node.id, { ...node, children: [] });
        });

        // Organiser les nœuds par génération
        const nodesByGeneration: Map<number, TreeNode[]> = new Map();
        treeData.nodes.forEach(node => {
            if (!nodesByGeneration.has(node.generation)) {
                nodesByGeneration.set(node.generation, []);
            }
            nodesByGeneration.get(node.generation)?.push(node);
        });

        // Trouver la personne principale (génération 0)
        const principal = treeData.nodes.find(node => node.generation === 0);
        if (!principal) {
            throw new Error('Personne principale non trouvée dans les données de l\'arbre');
        }

        // Construire les liens pour l'arbre hiérarchique inversé (de bas en haut)
        // En commençant par la personne principale qui sera la racine
        treeData.links.forEach(link => {
            const sourceNode = nodesMap.get(link.source);
            const targetNode = nodesMap.get(link.target);

            if (sourceNode && targetNode) {
                // Dans un arbre généalogique, le lien va généralement du parent vers l'enfant
                // Pour un affichage ascendant, nous voulons que l'enfant ait des références à ses parents
                if (targetNode.generation < sourceNode.generation) {
                    // Ici targetNode est l'enfant et sourceNode est le parent
                    if (!targetNode.children) targetNode.children = [];
                    targetNode.children.push(sourceNode);
                }
            }
        });

        // Récupérer la racine (personne principale)
        const rootNode = nodesMap.get(principal.id);
        if (!rootNode) {
            throw new Error('Racine non trouvée pour l\'arbre');
        }

        // Créer une hiérarchie D3
        const hierarchy = d3.hierarchy(rootNode);

        // Configurer une mise en page d'arbre qui utilise l'espace disponible efficacement
        const treeLayout = d3.tree<TreeNode>()
            .size([width * 0.90, height * 0.90])
            .nodeSize([220, 300]) // Nœuds plus larges et plus espacés verticalement
            .separation((a, b) => {
                // Augmenter considérablement la séparation entre les nœuds
                return (a.parent === b.parent ? 2.5 : 3.5);
            });

        // Calculer les positions des nœuds
        return treeLayout(hierarchy);
    }

    /**
     * Crée une disposition par génération pour un arbre généalogique
     * Garantit l'affichage complet de tous les nœuds
     */
    static createGenerationalLayout(treeData: TreeData, width: number, height: number): { nodes: PositionedTreeNode[], links: { source: string, target: string, type: string }[] } {
        // Grouper les nœuds par génération
        const nodesByGeneration = new Map<number, TreeNode[]>();

        treeData.nodes.forEach(node => {
            if (!nodesByGeneration.has(node.generation)) {
                nodesByGeneration.set(node.generation, []);
            }
            nodesByGeneration.get(node.generation)?.push(node);
        });

        // Calculer les positions des nœuds pour chaque génération
        const generations = Array.from(nodesByGeneration.keys()).sort();
        const maxGeneration = Math.max(...generations);

        // Répartir verticalement les générations
        const totalHeight = height * 0.9;

        // Espacement vertical entre les générations
        const verticalSpacing = totalHeight / (maxGeneration + 1);

        // Positions verticales pour chaque génération (du bas vers le haut)
        const verticalPositions = new Map<number, number>();
        generations.forEach(gen => {
            // Position verticale pour cette génération
            verticalPositions.set(gen, height - (verticalSpacing * (gen + 0.5)));
        });

        // Résultats pour les nœuds positionnés
        const positionedNodes: PositionedTreeNode[] = [];

        // Traiter chaque génération
        generations.forEach(generation => {
            const nodesInGen = nodesByGeneration.get(generation) || [];
            const count = nodesInGen.length;

            if (count === 0) return;

            // Position verticale pour cette génération
            const y = verticalPositions.get(generation) || 0;

            // Trier les nœuds par relation pour un meilleur arrangement
            const sortedNodes = [...nodesInGen].sort((a, b) => {
                // La personne principale est toujours au centre
                if (a.relation === 'principal') return -1;
                if (b.relation === 'principal') return 1;

                // Grouper par côté paternel/maternel
                const aPaternel = a.relation.includes('pere') || a.relation.includes('paternel');
                const bPaternel = b.relation.includes('pere') || b.relation.includes('paternel');

                if (aPaternel && !bPaternel) return -1;
                if (!aPaternel && bPaternel) return 1;

                return a.relation.localeCompare(b.relation);
            });

            // Utilisation de toute la largeur disponible
            const usableWidth = width * 0.9;
            const nodeSpacing = usableWidth / (count + 1);

            // Distribuer les nœuds horizontalement
            sortedNodes.forEach((node, index) => {
                // Position horizontale calculée
                let x = nodeSpacing * (index + 1);

                // Ajustement spécial pour les arbres avec peu de nœuds par génération
                if (count <= 2 && node.relation === 'principal') {
                    x = width / 2; // Centrer la personne principale
                }

                // Ajout aux résultats
                positionedNodes.push({
                    ...node,
                    x,
                    y
                });
            });
        });

        // Vérifier si tous les nœuds sont inclus
        const allNodeIds = new Set(treeData.nodes.map(n => n.id));
        const positionedIds = new Set(positionedNodes.map(n => n.id));

        // Ajouter les nœuds manquants avec une position par défaut
        treeData.nodes.forEach(node => {
            if (!positionedIds.has(node.id)) {
                const y = verticalPositions.get(node.generation) || (height / 2);
                let x = width / 2; // Position par défaut au centre

                // Ajustement selon la relation
                if (node.relation.includes('pere') || node.relation.includes('paternel')) {
                    x = width * 0.25; // Côté gauche
                } else if (node.relation.includes('mere') || node.relation.includes('maternel')) {
                    x = width * 0.75; // Côté droit
                }

                positionedNodes.push({
                    ...node,
                    x,
                    y
                });
            }
        });

        return {
            nodes: positionedNodes,
            links: treeData.links
        };
    }
}