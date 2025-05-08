import { Injectable } from '@angular/core';
import { Personne } from '../models/personne.model';
import { ArbreGenealogique } from '../models/arbre-genealogique.model';

@Injectable({
    providedIn: 'root'
})
export class DataStorageService {
    private readonly PERSONNE_STORAGE_KEY = 'crvs-personnes';
    private readonly ARBRE_STORAGE_KEY = 'crvs-arbres';

    constructor() {
        // Initialiser le stockage avec des données d'exemple si vide
        if (!this.getPersonnes().length) {
            this.initDonneesExemple();
        }
    }

    /**
     * Récupère toutes les personnes du localStorage
     */
    getPersonnes(): Personne[] {
        const personnesJson = localStorage.getItem(this.PERSONNE_STORAGE_KEY);
        return personnesJson ? JSON.parse(personnesJson) : [];
    }

    /**
     * Sauvegarde une liste de personnes dans le localStorage
     */
    savePersonnes(personnes: Personne[]): void {
        localStorage.setItem(this.PERSONNE_STORAGE_KEY, JSON.stringify(personnes));
    }

    /**
     * Récupère une personne par son ID
     */
    getPersonneById(id: string): Personne | undefined {
        const personnes = this.getPersonnes();
        return personnes.find(p => p.id === id);
    }

    /**
     * Récupère une personne par son NINA
     */
    getPersonneByNina(nina: string): Personne | undefined {
        const personnes = this.getPersonnes();
        return personnes.find(p => p.nina === nina);
    }

    /**
     * Ajoute ou met à jour une personne
     */
    savePersonne(personne: Personne): Personne {
        const personnes = this.getPersonnes();
        const index = personnes.findIndex(p => p.id === personne.id);

        if (index >= 0) {
            // Mise à jour d'une personne existante
            personnes[index] = { ...personne };
        } else {
            // Ajout d'une nouvelle personne
            personnes.push(personne);
        }

        this.savePersonnes(personnes);
        return personne;
    }

    /**
     * Supprime une personne par son ID
     */
    deletePersonne(id: string): void {
        let personnes = this.getPersonnes();
        personnes = personnes.filter(p => p.id !== id);
        this.savePersonnes(personnes);
    }

    /**
     * Récupère tous les arbres généalogiques du localStorage
     */
    getArbres(): ArbreGenealogique[] {
        const arbresJson = localStorage.getItem(this.ARBRE_STORAGE_KEY);
        return arbresJson ? JSON.parse(arbresJson) : [];
    }

    /**
     * Sauvegarde un arbre généalogique
     */
    saveArbre(arbre: ArbreGenealogique): void {
        const arbres = this.getArbres();
        const index = arbres.findIndex(a => a.personneprincipale.id === arbre.personneprincipale.id);

        if (index >= 0) {
            arbres[index] = arbre;
        } else {
            arbres.push(arbre);
        }

        localStorage.setItem(this.ARBRE_STORAGE_KEY, JSON.stringify(arbres));
    }

    /**
     * Récupère un arbre par l'ID de la personne principale
     */
    getArbreByPersonneId(personneId: string): ArbreGenealogique | undefined {
        const arbres = this.getArbres();
        return arbres.find(a => a.personneprincipale.id === personneId);
    }

    /**
     * Initialise des données d'exemple pour le développement
     */
    private initDonneesExemple(): void {
        const personnes: Personne[] = [
            // Personne principale (génération 0)
            {
                id: '1',
                nina: '123456789012345',
                nom: 'Keita',
                prenom: 'Amadou',
                genre: 'M',
                dateNaissance: new Date(2000, 5, 15),
                lieuNaissance: 'Bamako',
                nomPere: 'Keita',
                nomMere: 'Coulibaly',
                ninaPere: '123456789054321',
                ninaMere: '123456789098765',
                generation: 0,
                relationTypeAvecPrincipal: 'principal'
            },

            // Parents (génération 1)
            {
                id: '2',
                nina: '123456789054321',
                nom: 'Keita',
                prenom: 'Ibrahim',
                genre: 'M',
                dateNaissance: new Date(1970, 3, 10),
                lieuNaissance: 'Sikasso',
                nomPere: 'Keita',
                nomMere: 'Diallo',
                ninaPere: '123456789011111',
                ninaMere: '123456789022222',
                generation: 1,
                relationTypeAvecPrincipal: 'pere'
            },
            {
                id: '3',
                nina: '123456789098765',
                nom: 'Coulibaly',
                prenom: 'Fatoumata',
                genre: 'F',
                dateNaissance: new Date(1975, 7, 22),
                lieuNaissance: 'Kayes',
                nomPere: 'Coulibaly',
                nomMere: 'Toure',
                ninaPere: '123456789033333',
                ninaMere: '123456789044444',
                generation: 1,
                relationTypeAvecPrincipal: 'mere'
            },

            // Grands-parents paternels (génération 2)
            {
                id: '4',
                nina: '123456789011111',
                nom: 'Keita',
                prenom: 'Moussa',
                genre: 'M',
                dateNaissance: new Date(1945, 2, 5),
                lieuNaissance: 'Koulikoro',
                nomPere: 'Keita',
                nomMere: 'Sylla',
                ninaPere: '123456789111111',
                ninaMere: '123456789222222',
                generation: 2,
                relationTypeAvecPrincipal: 'grand-pere-paternel'
            },
            {
                id: '5',
                nina: '123456789022222',
                nom: 'Diallo',
                prenom: 'Aminata',
                genre: 'F',
                dateNaissance: new Date(1950, 9, 17),
                lieuNaissance: 'Mopti',
                nomPere: 'Diallo',
                nomMere: 'Traore',
                ninaPere: '123456789333333',
                ninaMere: '123456789444444',
                generation: 2,
                relationTypeAvecPrincipal: 'grand-mere-paternelle'
            },

            // Grands-parents maternels (génération 2)
            {
                id: '6',
                nina: '123456789033333',
                nom: 'Coulibaly',
                prenom: 'Bakary',
                genre: 'M',
                dateNaissance: new Date(1948, 11, 30),
                lieuNaissance: 'Segou',
                nomPere: 'Coulibaly',
                nomMere: 'Sangare',
                ninaPere: '123456789555555',
                ninaMere: '123456789666666',
                generation: 2,
                relationTypeAvecPrincipal: 'grand-pere-maternel'
            },
            {
                id: '7',
                nina: '123456789044444',
                nom: 'Toure',
                prenom: 'Maimouna',
                genre: 'F',
                dateNaissance: new Date(1952, 1, 25),
                lieuNaissance: 'Gao',
                nomPere: 'Toure',
                nomMere: 'Maiga',
                ninaPere: '123456789777777',
                ninaMere: '123456789888888',
                generation: 2,
                relationTypeAvecPrincipal: 'grand-mere-maternelle'
            },

            // Arrière-grands-parents paternels côté paternel (génération 3)
            {
                id: '8',
                nina: '123456789111111',
                nom: 'Keita',
                prenom: 'Seydou',
                genre: 'M',
                dateNaissance: new Date(1920, 5, 10),
                lieuNaissance: 'Kati',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-pere-paternel-paternel'
            },
            {
                id: '9',
                nina: '123456789222222',
                nom: 'Sylla',
                prenom: 'Kadiatou',
                genre: 'F',
                dateNaissance: new Date(1925, 8, 15),
                lieuNaissance: 'Koulikoro',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-mere-paternelle-paternelle'
            },

            // Arrière-grands-parents paternels côté maternel (génération 3)
            {
                id: '10',
                nina: '123456789333333',
                nom: 'Diallo',
                prenom: 'Oumar',
                genre: 'M',
                dateNaissance: new Date(1922, 3, 20),
                lieuNaissance: 'Mopti',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-pere-paternel-maternel'
            },
            {
                id: '11',
                nina: '123456789444444',
                nom: 'Traore',
                prenom: 'Oumou',
                genre: 'F',
                dateNaissance: new Date(1927, 10, 5),
                lieuNaissance: 'Djenné',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-mere-paternelle-maternelle'
            },

            // Arrière-grands-parents maternels côté paternel (génération 3)
            {
                id: '12',
                nina: '123456789555555',
                nom: 'Coulibaly',
                prenom: 'Modibo',
                genre: 'M',
                dateNaissance: new Date(1918, 7, 12),
                lieuNaissance: 'Segou',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-pere-maternel-paternel'
            },
            {
                id: '13',
                nina: '123456789666666',
                nom: 'Sangare',
                prenom: 'Mariam',
                genre: 'F',
                dateNaissance: new Date(1923, 2, 8),
                lieuNaissance: 'Sikasso',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-mere-maternelle-paternelle'
            },

            // Arrière-grands-parents maternels côté maternel (génération 3)
            {
                id: '14',
                nina: '123456789777777',
                nom: 'Toure',
                prenom: 'Amadou',
                genre: 'M',
                dateNaissance: new Date(1921, 1, 15),
                lieuNaissance: 'Tombouctou',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-pere-maternel-maternel'
            },
            {
                id: '15',
                nina: '123456789888888',
                nom: 'Maiga',
                prenom: 'Fanta',
                genre: 'F',
                dateNaissance: new Date(1926, 6, 28),
                lieuNaissance: 'Gao',
                generation: 3,
                relationTypeAvecPrincipal: 'arriere-grand-mere-maternelle-maternelle'
            }
        ];

        // Effacer les données existantes et sauvegarder les nouvelles personnes
        localStorage.removeItem(this.PERSONNE_STORAGE_KEY);
        localStorage.removeItem(this.ARBRE_STORAGE_KEY);

        this.savePersonnes(personnes);

        // Créer un arbre généalogique complet incluant tous les membres
        const arbreExemple: ArbreGenealogique = {
            personneprincipale: personnes[0],
            membres: personnes
        };

        this.saveArbre(arbreExemple);
    }
}