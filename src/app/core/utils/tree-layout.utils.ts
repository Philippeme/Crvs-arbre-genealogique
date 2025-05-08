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
     * Garantit l'affichage complet de tous les nœuds avec un espacement optimal
     * et une séparation claire des branches paternelles et maternelles
     */
    static createGenerationalLayout(treeData: TreeData, width: number, height: number): { nodes: PositionedTreeNode[], links: { source: string, target: string, type: string }[] } {
        // Grouper les nœuds par génération
        const nodesByGeneration = new Map<number, TreeNode[]>();
        const nodesMap = new Map<string, TreeNode>();

        // Carte des relations parent-enfant pour tracer correctement les liens
        const childToParents = new Map<string, { father?: string, mother?: string }>();

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
                // Si la source a une génération plus élevée que la cible, c'est un parent
                if (sourceNode.generation > targetNode.generation) {
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
        // Plus l'arbre est grand, plus l'espacement est important
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

        // Commencer par placer la personne principale (génération 0)
        const principal = treeData.nodes.find(n => n.generation === 0);
        if (principal) {
            const y = verticalPositions.get(0) || height * 0.9;
            nodePositions.set(principal.id, { x: centerX, y });

            // Placer les nœuds de la génération 1 (parents)
            const parents = nodesByGeneration.get(1) || [];
            const fatherNodes = parents.filter(n => n.genre === 'M' || n.relation.includes('pere'));
            const motherNodes = parents.filter(n => n.genre === 'F' || n.relation.includes('mere'));

            const gen1Y = verticalPositions.get(1) || height * 0.6;

            // Placer le père à gauche
            if (fatherNodes.length > 0) {
                const fatherX = centerX - width * 0.15;
                fatherNodes.forEach(father => {
                    nodePositions.set(father.id, { x: fatherX, y: gen1Y });
                });
            }

            // Placer la mère à droite
            if (motherNodes.length > 0) {
                const motherX = centerX + width * 0.15;
                motherNodes.forEach(mother => {
                    nodePositions.set(mother.id, { x: motherX, y: gen1Y });
                });
            }

            // Placer les grands-parents (génération 2)
            const grandparents = nodesByGeneration.get(2) || [];
            const gen2Y = verticalPositions.get(2) || height * 0.3;

            // Identifier les différents types de grands-parents
            const paternalGrandparents = grandparents.filter(n =>
                n.relation.includes('grand-pere-paternel') || n.relation.includes('grand-mere-paternelle'));
            const maternalGrandparents = grandparents.filter(n =>
                n.relation.includes('grand-pere-maternel') || n.relation.includes('grand-mere-maternelle'));

            // Regrouper les grands-parents paternels (père du père, mère du père)
            const paternalGrandfather = paternalGrandparents.find(n => n.relation.includes('grand-pere-paternel'));
            const paternalGrandmother = paternalGrandparents.find(n => n.relation.includes('grand-mere-paternelle'));

            // Regrouper les grands-parents maternels (père de la mère, mère de la mère)
            const maternalGrandfather = maternalGrandparents.find(n => n.relation.includes('grand-pere-maternel'));
            const maternalGrandmother = maternalGrandparents.find(n => n.relation.includes('grand-mere-maternelle'));

            // Calculer les positions horizontales avec un écart plus important pour cette génération
            const quarterWidth = width * 0.25;

            // Placer les grands-parents paternels dans le quart gauche
            if (paternalGrandfather) {
                nodePositions.set(paternalGrandfather.id, { x: quarterWidth * 0.5, y: gen2Y });
            }
            if (paternalGrandmother) {
                nodePositions.set(paternalGrandmother.id, { x: quarterWidth * 1.5, y: gen2Y });
            }

            // Placer les grands-parents maternels dans le quart droit
            if (maternalGrandfather) {
                nodePositions.set(maternalGrandfather.id, { x: quarterWidth * 2.5, y: gen2Y });
            }
            if (maternalGrandmother) {
                nodePositions.set(maternalGrandmother.id, { x: quarterWidth * 3.5, y: gen2Y });
            }

            // Placer les arrière-grands-parents (génération 3)
            const greatGrandparents = nodesByGeneration.get(3) || [];
            const gen3Y = verticalPositions.get(3) || height * 0.1;

            // Espacement de la génération 2
            const gen2Spacing = quarterWidth;
            // L'espacement de la génération 3 doit être la moitié de celui de la génération 2
            const gen3Spacing = gen2Spacing / 2;

            // Calculer le nombre total de positions nécessaires pour la génération 3
            const totalGreatGrandparents = greatGrandparents.length;
            // S'assurer qu'il y a au moins 8 espaces même si tous ne sont pas utilisés
            const minPositions = 8;
            const numPositions = Math.max(totalGreatGrandparents, minPositions);

            // Diviser la largeur totale par le nombre de positions pour obtenir un espacement égal
            const sectionWidth = width / numPositions;

            // Grouper les arrière-grands-parents par relation avec leurs grands-parents
            // Branche paternelle-paternelle (côté père du père)
            const ppBranch = greatGrandparents.filter(n =>
                n.relation.includes('arriere-grand-pere-paternel-paternel') ||
                n.relation.includes('arriere-grand-mere-paternelle-paternelle'));

            // Branche paternelle-maternelle (côté mère du père)
            const pmBranch = greatGrandparents.filter(n =>
                n.relation.includes('arriere-grand-pere-paternel-maternel') ||
                n.relation.includes('arriere-grand-mere-paternelle-maternelle'));

            // Branche maternelle-paternelle (côté père de la mère)
            const mpBranch = greatGrandparents.filter(n =>
                n.relation.includes('arriere-grand-pere-maternel-paternel') ||
                n.relation.includes('arriere-grand-mere-maternelle-paternelle'));

            // Branche maternelle-maternelle (côté mère de la mère)
            const mmBranch = greatGrandparents.filter(n =>
                n.relation.includes('arriere-grand-pere-maternel-maternel') ||
                n.relation.includes('arriere-grand-mere-maternelle-maternelle'));

            // Placer chaque branche dans sa section avec un espacement équidistant
            const placeBranch = (branch: TreeNode[], startPos: number, numPositions: number) => {
                if (branch.length === 0) return;

                // Calculer l'espacement entre les nœuds de cette branche
                const branchSpacing = gen3Spacing;

                // Placer les nœuds avec un espacement égal
                branch.forEach((node, i) => {
                    // Position horizontale basée sur l'indice dans la branche
                    const x = startPos + (i * branchSpacing);
                    nodePositions.set(node.id, { x, y: gen3Y });
                });
            };

            // Placer les 4 branches avec leurs positions de départ respectives
            placeBranch(ppBranch, sectionWidth * 0.5, 2);
            placeBranch(pmBranch, sectionWidth * 2.5, 2);
            placeBranch(mpBranch, sectionWidth * 4.5, 2);
            placeBranch(mmBranch, sectionWidth * 6.5, 2);

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