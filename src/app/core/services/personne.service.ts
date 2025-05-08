// src/app/core/services/personne.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { Personne, PersonneSearchCriteria } from '../models/personne.model';
import { DataStorageService } from './data-storage.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root'
})
export class PersonneService {

    constructor(private dataStorageService: DataStorageService) { }

    /**
     * Récupère toutes les personnes
     */
    getAllPersonnes(): Observable<Personne[]> {
        return of(this.dataStorageService.getPersonnes());
    }

    /**
     * Récupère une personne par son ID
     */
    getPersonneById(id: string): Observable<Personne> {
        const personne = this.dataStorageService.getPersonneById(id);
        if (personne) {
            return of(personne);
        }
        return throwError(() => new Error(`Personne avec l'ID ${id} non trouvée`));
    }

    /**
     * Récupère une personne par son NINA
     */
    getPersonneByNina(nina: string): Observable<Personne> {
        const personne = this.dataStorageService.getPersonneByNina(nina);
        if (personne) {
            return of(personne);
        }
        return throwError(() => new Error(`Personne avec le NINA ${nina} non trouvée`));
    }

    /**
     * Crée une nouvelle personne
     */
    createPersonne(personne: Omit<Personne, 'id'>): Observable<Personne> {
        // Validation du NINA (doit avoir exactement 15 chiffres)
        if (!/^\d{15}$/.test(personne.nina)) {
            return throwError(() => new Error('Le NINA doit contenir exactement 15 chiffres'));
        }

        // Vérifier si une personne avec ce NINA existe déjà
        const existingPersonne = this.dataStorageService.getPersonneByNina(personne.nina);
        if (existingPersonne) {
            return throwError(() => new Error(`Une personne avec le NINA ${personne.nina} existe déjà`));
        }

        const nouvellePersonne: Personne = {
            ...personne,
            id: uuidv4() // Générer un nouvel UUID
        };

        return of(this.dataStorageService.savePersonne(nouvellePersonne));
    }

    /**
     * Met à jour une personne existante
     */
    updatePersonne(personne: Personne): Observable<Personne> {
        // Vérifier si la personne existe
        if (!this.dataStorageService.getPersonneById(personne.id)) {
            return throwError(() => new Error(`Personne avec l'ID ${personne.id} non trouvée`));
        }

        // Validation du NINA
        if (!/^\d{15}$/.test(personne.nina)) {
            return throwError(() => new Error('Le NINA doit contenir exactement 15 chiffres'));
        }

        return of(this.dataStorageService.savePersonne(personne));
    }

    /**
     * Supprime une personne
     */
    deletePersonne(id: string): Observable<void> {
        // Vérifier si la personne existe
        if (!this.dataStorageService.getPersonneById(id)) {
            return throwError(() => new Error(`Personne avec l'ID ${id} non trouvée`));
        }

        this.dataStorageService.deletePersonne(id);
        return of(void 0);
    }

    /**
     * Recherche des personnes selon des critères
     */
    searchPersonnes(criteria: PersonneSearchCriteria): Observable<Personne[]> {
        return this.getAllPersonnes().pipe(
            map(personnes => {
                return personnes.filter(p => {
                    // Filtrer selon les critères fournis
                    if (criteria.nom && !p.nom.toLowerCase().includes(criteria.nom.toLowerCase())) {
                        return false;
                    }
                    if (criteria.prenom && !p.prenom.toLowerCase().includes(criteria.prenom.toLowerCase())) {
                        return false;
                    }
                    if (criteria.nina && !p.nina.includes(criteria.nina)) {
                        return false;
                    }
                    if (criteria.nomPere && !p.nomPere?.toLowerCase().includes(criteria.nomPere.toLowerCase())) {
                        return false;
                    }
                    if (criteria.nomMere && !p.nomMere?.toLowerCase().includes(criteria.nomMere.toLowerCase())) {
                        return false;
                    }
                    return true;
                });
            })
        );
    }

    /**
     * Vérifier si un NINA est valide (15 chiffres)
     */
    validateNina(nina: string): boolean {
        return /^\d{15}$/.test(nina);
    }
}