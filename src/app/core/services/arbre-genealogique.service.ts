import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators'; // Ajout de catchError manquant

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
        // Vérifier d'abord si l'arbre existe déjà
        const arbreExistant = this.dataStorageService.getArbreByPersonneId(personneId);
        if (arbreExistant) {
            return of(arbreExistant);
        }

        // Sinon, construire un nouvel arbre
        return this.personneService.getPersonneById(personneId).pipe(
            switchMap(personneprincipale => {
                return this.construireArbre(personneprincipale);
            })
        );
    }

    /**
     * Construit un arbre généalogique complet pour une personne
     */
    private construireArbre(personneprincipale: Personne): Observable<ArbreGenealogique> {
        // Initialiser l'arbre avec la personne principale
        const arbre: ArbreGenealogique = {
            personneprincipale,
            membres: [personneprincipale]
        };

        // Si nous n'avons pas les NINA des parents, retourner l'arbre avec juste la personne principale
        if (!personneprincipale.ninaPere && !personneprincipale.ninaMere) {
            return of(arbre);
        }

        // Récupérer tous les membres potentiels de l'arbre (jusqu'à 3 générations)
        return this.getAllFamilyMembers(personneprincipale).pipe(
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

                if (pere) membres.push(pere);
                if (mere) membres.push(mere);

                // Identifier les grands-parents paternels
                if (pere) {
                    const grandPerePaternel = allPersons.find(p => p.nina === pere.ninaPere);
                    const grandMerePaternelle = allPersons.find(p => p.nina === pere.ninaMere);

                    if (grandPerePaternel) membres.push(grandPerePaternel);
                    if (grandMerePaternelle) membres.push(grandMerePaternelle);

                    // Identifier les arrière-grands-parents côté paternel
                    if (grandPerePaternel) {
                        const arriereGPPP = allPersons.find(p => p.nina === grandPerePaternel.ninaPere);
                        const arriereGMPP = allPersons.find(p => p.nina === grandPerePaternel.ninaMere);

                        if (arriereGPPP) membres.push(arriereGPPP);
                        if (arriereGMPP) membres.push(arriereGMPP);
                    }

                    if (grandMerePaternelle) {
                        const arriereGPPM = allPersons.find(p => p.nina === grandMerePaternelle.ninaPere);
                        const arriereGMPM = allPersons.find(p => p.nina === grandMerePaternelle.ninaMere);

                        if (arriereGPPM) membres.push(arriereGPPM);
                        if (arriereGMPM) membres.push(arriereGMPM);
                    }
                }

                // Identifier les grands-parents maternels
                if (mere) {
                    const grandPereMaternel = allPersons.find(p => p.nina === mere.ninaPere);
                    const grandMereMaternelle = allPersons.find(p => p.nina === mere.ninaMere);

                    if (grandPereMaternel) membres.push(grandPereMaternel);
                    if (grandMereMaternelle) membres.push(grandMereMaternelle);

                    // Identifier les arrière-grands-parents côté maternel
                    if (grandPereMaternel) {
                        const arriereGPMP = allPersons.find(p => p.nina === grandPereMaternel.ninaPere);
                        const arriereGMMP = allPersons.find(p => p.nina === grandPereMaternel.ninaMere);

                        if (arriereGPMP) membres.push(arriereGPMP);
                        if (arriereGMMP) membres.push(arriereGMMP);
                    }

                    if (grandMereMaternelle) {
                        const arriereGPMM = allPersons.find(p => p.nina === grandMereMaternelle.ninaPere);
                        const arriereGMMM = allPersons.find(p => p.nina === grandMereMaternelle.ninaMere);

                        if (arriereGPMM) membres.push(arriereGPMM);
                        if (arriereGMMM) membres.push(arriereGMMM);
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
            nodes.push({
                id: membre.id,
                nina: membre.nina,
                nom: membre.nom,
                prenom: membre.prenom,
                genre: membre.genre,
                generation: membre.generation || 0,
                relation: membre.relationTypeAvecPrincipal || 'inconnu'
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