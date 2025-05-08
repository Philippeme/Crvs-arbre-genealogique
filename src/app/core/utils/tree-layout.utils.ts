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

        // Trouver la personne principale (par relation = 'principal')
        const principal = treeData.nodes.find(node => node.relation === 'principal');
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
                if (targetNode.id === principal.id || targetNode.generation < sourceNode.generation) {
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
     * Garantit l'affichage complet de tous les nœuds avec un espacement optimal
     * et une séparation claire des branches paternelles et maternelles
     */
    static createGenerationalLayout(treeData: TreeData, width: number, height: number): { nodes: PositionedTreeNode[], links: { source: string, target: string, type: string }[] } {
        // Grouper les nœuds par génération
        const nodesByGeneration = new Map<number, TreeNode[]>();
        const nodesMap = new Map<string, TreeNode>();

        // Carte des relations parent-enfant pour tracer correctement les liens
        const childToParents = new Map<string, { father?: string, mother?: string }>();

        // Trouver la personne principale (par relation = 'principal')
        const principal = treeData.nodes.find(node => node.relation === 'principal');
        if (!principal) {
            console.error('Personne principale non trouvée dans les données de l\'arbre');
            return { nodes: [], links: [] };
        }

        // Remplir les maps
        treeData.nodes.forEach(node => {
            // Ajouter le nœud à la map par ID
            nodesMap.set(node.id, node);

            // Grouper par génération
            if (!nodesByGeneration.has(node.generation)) {
                nodesByGeneration.set(node.generation, []);
            }
            nodesByGeneration.get(node.generation)?.push(node);
        });

        // Établir les relations parent-enfant
        treeData.links.forEach(link => {
            const sourceNode = nodesMap.get(link.source);
            const targetNode = nodesMap.get(link.target);

            if (sourceNode && targetNode) {
                // Si la source et la cible ont une relation parent-enfant
                if (sourceNode.generation > targetNode.generation ||
                    (targetNode.id === principal.id &&
                        (sourceNode.relation.includes('pere') || sourceNode.relation.includes('mere')))) {

                    if (!childToParents.has(targetNode.id)) {
                        childToParents.set(targetNode.id, {});
                    }

                    // Déterminer s'il s'agit du père ou de la mère
                    const relationInfo = childToParents.get(targetNode.id)!;

                    if (sourceNode.genre === 'M' || sourceNode.relation.includes('pere') || sourceNode.relation.includes('paternel')) {
                        relationInfo.father = sourceNode.id;
                    } else if (sourceNode.genre === 'F' || sourceNode.relation.includes('mere') || sourceNode.relation.includes('maternel')) {
                        relationInfo.mother = sourceNode.id;
                    }
                }
            }
        });

        // Calculer les positions des nœuds pour chaque génération
        const generations = Array.from(nodesByGeneration.keys()).sort();
        const maxGeneration = Math.max(...generations);

        // Répartir verticalement les générations avec un espacement plus important
        const totalHeight = height * 0.85;

        // Augmenter l'espacement vertical entre les générations
        const verticalSpacing = totalHeight / (maxGeneration + 1) * 1.8;

        // Positions verticales pour chaque génération (du bas vers le haut)
        const verticalPositions = new Map<number, number>();
        generations.forEach(gen => {
            // Position verticale pour cette génération
            verticalPositions.set(gen, height - (verticalSpacing * (gen + 0.5)));
        });

        // Stocker les positions horizontales calculées pour chaque nœud
        const nodePositions = new Map<string, { x: number, y: number }>();

        // Positions horizontales de référence pour chaque branche
        const centerX = width / 2;

        // Résultats pour les nœuds positionnés
        const positionedNodes: PositionedTreeNode[] = [];

        // Placer la personne principale au centre
        if (principal) {
            const y = verticalPositions.get(principal.generation) || height * 0.9;
            nodePositions.set(principal.id, { x: centerX, y });

            // Identifier les parents et les placer de manière appropriée
            const parentGen = principal.generation + 1;
            const parents = nodesByGeneration.get(parentGen) || [];

            // Filtrer les pères et mères en fonction des relations et ninaPere/ninaMere
            const fatherNodes = parents.filter(n =>
                n.genre === 'M' || n.relation.includes('pere')
            );

            const motherNodes = parents.filter(n =>
                n.genre === 'F' || n.relation.includes('mere')
            );

            const parentY = verticalPositions.get(parentGen) || height * 0.6;

            // Placer le père à gauche
            if (fatherNodes.length > 0) {
                const fatherX = centerX - width * 0.15;
                fatherNodes.forEach(father => {
                    nodePositions.set(father.id, { x: fatherX, y: parentY });
                });
            }

            // Placer la mère à droite
            if (motherNodes.length > 0) {
                const motherX = centerX + width * 0.15;
                motherNodes.forEach(mother => {
                    nodePositions.set(mother.id, { x: motherX, y: parentY });
                });
            }

            // Calculer un espacement égal pour les grands-parents (génération + 2)
            const grandParentGen = principal.generation + 2;
            const grandparents = nodesByGeneration.get(grandParentGen) || [];
            const grandParentY = verticalPositions.get(grandParentGen) || height * 0.3;

            // Diviser la largeur en sections égales pour les grands-parents
            const gen2Spacing = width / 5; // Divisé par 5 pour avoir 4 espaces égaux avec marge

            // Identifier les différents types de grands-parents par leurs relations
            const paternalGrandfather = grandparents.find(n => n.relation.includes('grand-pere-paternel'));
            const paternalGrandmother = grandparents.find(n => n.relation.includes('grand-mere-paternelle'));
            const maternalGrandfather = grandparents.find(n => n.relation.includes('grand-pere-maternel'));
            const maternalGrandmother = grandparents.find(n => n.relation.includes('grand-mere-maternelle'));

            // Placer les grands-parents avec un espacement équidistant
            if (paternalGrandfather) {
                nodePositions.set(paternalGrandfather.id, { x: gen2Spacing * 1, y: grandParentY });
            }
            if (paternalGrandmother) {
                nodePositions.set(paternalGrandmother.id, { x: gen2Spacing * 2, y: grandParentY });
            }
            if (maternalGrandfather) {
                nodePositions.set(maternalGrandfather.id, { x: gen2Spacing * 3, y: grandParentY });
            }
            if (maternalGrandmother) {
                nodePositions.set(maternalGrandmother.id, { x: gen2Spacing * 4, y: grandParentY });
            }

            // Placer les arrière-grands-parents (génération + 3)
            const greatGrandParentGen = principal.generation + 3;
            const greatGrandparents = nodesByGeneration.get(greatGrandParentGen) || [];
            const greatGrandParentY = verticalPositions.get(greatGrandParentGen) || height * 0.1;
            const gen3Spacing = gen2Spacing;

            // Grouper les arrière-grands-parents par leurs relations
            const ppGrandfather = greatGrandparents.find(n => n.relation.includes('arriere-grand-pere-paternel-paternel'));
            const ppGrandmother = greatGrandparents.find(n => n.relation.includes('arriere-grand-mere-paternelle-paternelle'));
            const pmGrandfather = greatGrandparents.find(n => n.relation.includes('arriere-grand-pere-paternel-maternel'));
            const pmGrandmother = greatGrandparents.find(n => n.relation.includes('arriere-grand-mere-paternelle-maternelle'));
            const mpGrandfather = greatGrandparents.find(n => n.relation.includes('arriere-grand-pere-maternel-paternel'));
            const mpGrandmother = greatGrandparents.find(n => n.relation.includes('arriere-grand-mere-maternelle-paternelle'));
            const mmGrandfather = greatGrandparents.find(n => n.relation.includes('arriere-grand-pere-maternel-maternel'));
            const mmGrandmother = greatGrandparents.find(n => n.relation.includes('arriere-grand-mere-maternelle-maternelle'));

            // Positionner les arrière-grands-parents
            if (ppGrandfather) nodePositions.set(ppGrandfather.id, { x: gen2Spacing * 0.5, y: greatGrandParentY });
            if (ppGrandmother) nodePositions.set(ppGrandmother.id, { x: gen2Spacing * 1.5, y: greatGrandParentY });
            if (pmGrandfather) nodePositions.set(pmGrandfather.id, { x: gen2Spacing * 2.5, y: greatGrandParentY });
            if (pmGrandmother) nodePositions.set(pmGrandmother.id, { x: gen2Spacing * 3.5, y: greatGrandParentY });
            if (mpGrandfather) nodePositions.set(mpGrandfather.id, { x: gen2Spacing * 4.5, y: greatGrandParentY });
            if (mpGrandmother) nodePositions.set(mpGrandmother.id, { x: gen2Spacing * 5.5, y: greatGrandParentY });
            if (mmGrandfather) nodePositions.set(mmGrandfather.id, { x: gen2Spacing * 6.5, y: greatGrandParentY });
            if (mmGrandmother) nodePositions.set(mmGrandmother.id, { x: gen2Spacing * 7.5, y: greatGrandParentY });

            // Pour les nœuds qui n'auraient pas de position calculée (cas rares)
            // Attribuer une position par défaut basée sur leur relation
            treeData.nodes.forEach(node => {
                if (!nodePositions.has(node.id)) {
                    const y = verticalPositions.get(node.generation) || height / 2;
                    let x = width / 2; // Position par défaut au centre

                    // Ajustement selon la relation familiale
                    if (node.relation.includes('pere') || node.relation.includes('paternel')) {
                        x = width * 0.25; // Côté gauche
                    } else if (node.relation.includes('mere') || node.relation.includes('maternel')) {
                        x = width * 0.75; // Côté droit
                    }

                    nodePositions.set(node.id, { x, y });
                }

                // Créer le nœud positionné
                const position = nodePositions.get(node.id)!;
                positionedNodes.push({
                    ...node,
                    x: position.x,
                    y: position.y
                });
            });
        }

        return {
            nodes: positionedNodes,
            links: treeData.links
        };
    }
}