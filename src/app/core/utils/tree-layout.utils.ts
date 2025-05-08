import * as d3 from 'd3';
import { TreeData, TreeNode } from '../models/arbre-genealogique.model';

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
     * Optimisé pour afficher les trois générations complètes
     */
    static createGenerationalLayout(treeData: TreeData, width: number, height: number) {
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

        // Vérifier si nous avons bien 3 générations (0, 1, 2, 3)
        if (maxGeneration < 3) {
            console.warn('L\'arbre ne contient pas 3 générations complètes');
        }

        // Répartir verticalement les générations
        // Avec plus d'espace pour les générations supérieures qui ont plus de personnes
        const totalHeight = height * 0.85;

        // Espacement vertical entre les générations, calculé pour maximiser l'utilisation de l'espace
        const verticalSpacing = totalHeight / (maxGeneration + 1);

        // Répartir les nœuds de chaque génération horizontalement
        const nodesWithPositions = treeData.nodes.map(node => {
            const nodesInGen = nodesByGeneration.get(node.generation) || [];
            const nodeIndex = nodesInGen.findIndex(n => n.id === node.id);
            const totalNodesInGen = nodesInGen.length;

            // Calculer l'espace horizontal disponible
            const horizontalPadding = width * 0.1; // 10% de marge de chaque côté
            const usableWidth = width - (2 * horizontalPadding);

            // Calculer l'espacement horizontal de manière dynamique, en fonction du nombre de nœuds
            // mais avec un minimum pour éviter le chevauchement
            const minSpacing = 200; // Espacement minimum entre les nœuds
            const totalSpacingNeeded = minSpacing * (totalNodesInGen - 1);
            const widthPerNode = Math.max(usableWidth / totalNodesInGen, minSpacing);

            // Calculer la position horizontale en fonction de l'index
            const x = horizontalPadding + (widthPerNode * nodeIndex) + (widthPerNode / 2);

            // Calculer la position verticale inversée (génération 0 en bas, 3 en haut)
            const y = height - (verticalSpacing * (node.generation + 0.5));

            return {
                ...node,
                x,
                y
            };
        });

        return {
            nodes: nodesWithPositions,
            links: treeData.links
        };
    }
}