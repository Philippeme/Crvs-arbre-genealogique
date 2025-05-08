import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import {
    ArbreGenealogique,
    TreeNode,
    TreeLink,
    TreeData
} from '../models/arbre-genealogique.model';
import { Personne } from '../models/personne.model';
import { DataStorageService } from './data-storage.service';
import { PersonneService } from './personne.service';

@Injectable({
    providedIn: 'root'
})
export class ArbreGenealogiqueService {

    constructor(
        private dataStorageService: DataStorageService,
        private personneService: PersonneService
    ) { }

    /**
     * Récupère ou crée un arbre généalogique pour une personne
     */
    getArbreGenealogique(personneId: string): Observable<ArbreGenealogique> {
        // Récupérer la personne d'abord
        return this.personneService.getPersonneById(personneId).pipe(
            switchMap(personneprincipale => {
                // Vérifier d'abord si l'arbre existe déjà pour cette personne
                // Si c'est le cas et que la personne est déjà la principale, utiliser cet arbre
                const arbreExistant = this.dataStorageService.getArbreByPersonneId(personneId);
                if (arbreExistant && arbreExistant.personneprincipale.id === personneId) {
                    console.log("Utilisation d'un arbre existant pour", personneprincipale.nom, personneprincipale.prenom);
                    return of(arbreExistant);
                }

                // Sinon, construire un nouvel arbre avec cette personne comme principale
                console.log("Construction d'un nouvel arbre pour", personneprincipale.nom, personneprincipale.prenom);
                return this.construireArbre(personneprincipale);
            })
        );
    }

    /**
     * Construit un arbre généalogique complet pour une personne
     */
    private construireArbre(personneprincipale: Personne): Observable<ArbreGenealogique> {
        // Préparer la personne comme principale en réinitialisant les attributs pertinents
        const personneModifiee: Personne = {
            ...personneprincipale,
            relationTypeAvecPrincipal: 'principal'
        };

        // Initialiser l'arbre avec la personne principale
        const arbre: ArbreGenealogique = {
            personneprincipale: personneModifiee,
            membres: [personneModifiee]
        };

        // Si nous n'avons pas les NINA des parents, retourner l'arbre avec juste la personne principale
        if (!personneModifiee.ninaPere && !personneModifiee.ninaMere) {
            this.dataStorageService.saveArbre(arbre);
            return of(arbre);
        }

        // Récupérer tous les membres potentiels de l'arbre (jusqu'à 3 générations)
        return this.getAllFamilyMembers(personneModifiee).pipe(
            map(membres => {
                arbre.membres = membres;
                // Enregistrer et retourner l'arbre complet
                this.dataStorageService.saveArbre(arbre);
                return arbre;
            })
        );
    }

    /**
     * Récupère tous les membres de la famille jusqu'à 3 générations
     * Ajuste également les relations pour refléter la nouvelle personne principale
     */
    private getAllFamilyMembers(personneprincipale: Personne): Observable<Personne[]> {
        // Commencer avec la personne principale
        const membres: Personne[] = [personneprincipale];
        const personnes$ = this.personneService.getAllPersonnes();

        return personnes$.pipe(
            map(allPersons => {
                // Identifier les parents
                const pere = allPersons.find(p => p.nina === personneprincipale.ninaPere);
                const mere = allPersons.find(p => p.nina === personneprincipale.ninaMere);

                // Ajouter les parents avec les relations ajustées
                if (pere) {
                    const pereAjuste: Personne = { ...pere, relationTypeAvecPrincipal: 'pere' };
                    membres.push(pereAjuste);
                }

                if (mere) {
                    const mereAjustee: Personne = { ...mere, relationTypeAvecPrincipal: 'mere' };
                    membres.push(mereAjustee);
                }

                // Identifier les grands-parents paternels
                if (pere) {
                    const grandPerePaternel = allPersons.find(p => p.nina === pere.ninaPere);
                    const grandMerePaternelle = allPersons.find(p => p.nina === pere.ninaMere);

                    if (grandPerePaternel) {
                        const gppAjuste: Personne = {
                            ...grandPerePaternel,
                            relationTypeAvecPrincipal: 'grand-pere-paternel'
                        };
                        membres.push(gppAjuste);
                    }

                    if (grandMerePaternelle) {
                        const gmpAjustee: Personne = {
                            ...grandMerePaternelle,
                            relationTypeAvecPrincipal: 'grand-mere-paternelle'
                        };
                        membres.push(gmpAjustee);
                    }

                    // Identifier les arrière-grands-parents côté paternel
                    if (grandPerePaternel) {
                        const arriereGPPP = allPersons.find(p => p.nina === grandPerePaternel.ninaPere);
                        const arriereGMPP = allPersons.find(p => p.nina === grandPerePaternel.ninaMere);

                        if (arriereGPPP) {
                            const agpppAjuste: Personne = {
                                ...arriereGPPP,
                                relationTypeAvecPrincipal: 'arriere-grand-pere-paternel-paternel'
                            };
                            membres.push(agpppAjuste);
                        }

                        if (arriereGMPP) {
                            const agmppAjustee: Personne = {
                                ...arriereGMPP,
                                relationTypeAvecPrincipal: 'arriere-grand-mere-paternelle-paternelle'
                            };
                            membres.push(agmppAjustee);
                        }
                    }

                    if (grandMerePaternelle) {
                        const arriereGPPM = allPersons.find(p => p.nina === grandMerePaternelle.ninaPere);
                        const arriereGMPM = allPersons.find(p => p.nina === grandMerePaternelle.ninaMere);

                        if (arriereGPPM) {
                            const agppmAjuste: Personne = {
                                ...arriereGPPM,
                                relationTypeAvecPrincipal: 'arriere-grand-pere-paternel-maternel'
                            };
                            membres.push(agppmAjuste);
                        }

                        if (arriereGMPM) {
                            const agmpmAjustee: Personne = {
                                ...arriereGMPM,
                                relationTypeAvecPrincipal: 'arriere-grand-mere-paternelle-maternelle'
                            };
                            membres.push(agmpmAjustee);
                        }
                    }
                }

                // Identifier les grands-parents maternels
                if (mere) {
                    const grandPereMaternel = allPersons.find(p => p.nina === mere.ninaPere);
                    const grandMereMaternelle = allPersons.find(p => p.nina === mere.ninaMere);

                    if (grandPereMaternel) {
                        const gpmAjuste: Personne = {
                            ...grandPereMaternel,
                            relationTypeAvecPrincipal: 'grand-pere-maternel'
                        };
                        membres.push(gpmAjuste);
                    }

                    if (grandMereMaternelle) {
                        const gmmAjustee: Personne = {
                            ...grandMereMaternelle,
                            relationTypeAvecPrincipal: 'grand-mere-maternelle'
                        };
                        membres.push(gmmAjustee);
                    }

                    // Identifier les arrière-grands-parents côté maternel
                    if (grandPereMaternel) {
                        const arriereGPMP = allPersons.find(p => p.nina === grandPereMaternel.ninaPere);
                        const arriereGMMP = allPersons.find(p => p.nina === grandPereMaternel.ninaMere);

                        if (arriereGPMP) {
                            const agpmpAjuste: Personne = {
                                ...arriereGPMP,
                                relationTypeAvecPrincipal: 'arriere-grand-pere-maternel-paternel'
                            };
                            membres.push(agpmpAjuste);
                        }

                        if (arriereGMMP) {
                            const agmmpAjustee: Personne = {
                                ...arriereGMMP,
                                relationTypeAvecPrincipal: 'arriere-grand-mere-maternelle-paternelle'
                            };
                            membres.push(agmmpAjustee);
                        }
                    }

                    if (grandMereMaternelle) {
                        const arriereGPMM = allPersons.find(p => p.nina === grandMereMaternelle.ninaPere);
                        const arriereGMMM = allPersons.find(p => p.nina === grandMereMaternelle.ninaMere);

                        if (arriereGPMM) {
                            const agpmmAjuste: Personne = {
                                ...arriereGPMM,
                                relationTypeAvecPrincipal: 'arriere-grand-pere-maternel-maternel'
                            };
                            membres.push(agpmmAjuste);
                        }

                        if (arriereGMMM) {
                            const agmmmAjustee: Personne = {
                                ...arriereGMMM,
                                relationTypeAvecPrincipal: 'arriere-grand-mere-maternelle-maternelle'
                            };
                            membres.push(agmmmAjustee);
                        }
                    }
                }

                return membres;
            })
        );
    }

    /**
     * Transforme un arbre généalogique en format adapté pour l'affichage D3
     */
    transformToTreeData(arbre: ArbreGenealogique): TreeData {
        const nodes: TreeNode[] = [];
        const links: TreeLink[] = [];

        // Ajouter tous les membres comme nœuds
        arbre.membres.forEach(membre => {
            // S'assurer que la personne principale est correctement identifiée
            const isPrincipal = membre.id === arbre.personneprincipale.id;

            nodes.push({
                id: membre.id,
                nina: membre.nina,
                nom: membre.nom,
                prenom: membre.prenom,
                genre: membre.genre,
                generation: membre.generation || 0,
                relation: isPrincipal ? 'principal' : (membre.relationTypeAvecPrincipal || 'inconnu'),
                // Ajouter les propriétés ninaPere et ninaMere pour les utiliser dans TreeLayoutUtils
                ninaPere: membre.ninaPere,
                ninaMere: membre.ninaMere
            });

            // Créer des liens parent-enfant
            if (membre.ninaPere) {
                const pere = arbre.membres.find(p => p.nina === membre.ninaPere);
                if (pere) {
                    links.push({
                        source: pere.id,
                        target: membre.id,
                        type: 'parent-enfant'
                    });
                }
            }

            if (membre.ninaMere) {
                const mere = arbre.membres.find(p => p.nina === membre.ninaMere);
                if (mere) {
                    links.push({
                        source: mere.id,
                        target: membre.id,
                        type: 'parent-enfant'
                    });
                }
            }
        });

        return { nodes, links };
    }

    /**
     * Met à jour l'arbre avec une nouvelle personne ou une personne modifiée
     */
    updateArbreAvecPersonne(arbre: ArbreGenealogique, personne: Personne): ArbreGenealogique {
        // Vérifier si la personne est déjà dans l'arbre
        const index = arbre.membres.findIndex(m => m.id === personne.id);

        if (index >= 0) {
            // Mettre à jour la personne existante
            arbre.membres[index] = personne;
        } else {
            // Ajouter la nouvelle personne
            arbre.membres.push(personne);
        }

        // Si c'est la personne principale, mettre à jour la référence
        if (arbre.personneprincipale.id === personne.id) {
            arbre.personneprincipale = personne;
        }

        // Sauvegarder et retourner l'arbre mis à jour
        this.dataStorageService.saveArbre(arbre);
        return arbre;
    }
}