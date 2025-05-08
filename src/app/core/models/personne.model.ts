export interface Personne {
    id: string;
    nina: string; // Numéro d'Identification Nationale (15 chiffres)
    nom: string;
    prenom: string;
    genre: 'M' | 'F'; // M pour masculin, F pour féminin
    dateNaissance?: Date;
    lieuNaissance?: string;

    // Informations sur les parents
    nomPere?: string;
    nomMere?: string;
    ninaPere?: string;
    ninaMere?: string;

    // Utilisé pour construire l'arbre généalogique
    generation?: number; // 0 = personne principale, 1 = parents, 2 = grands-parents, 3 = arrière-grands-parents
    relationTypeAvecPrincipal?: 'pere' | 'mere' | 'grand-pere-paternel' | 'grand-mere-paternelle' |
    'grand-pere-maternel' | 'grand-mere-maternelle' | 'arriere-grand-pere-paternel-paternel' |
    'arriere-grand-mere-paternelle-paternelle' | 'arriere-grand-pere-paternel-maternel' |
    'arriere-grand-mere-paternelle-maternelle' | 'arriere-grand-pere-maternel-paternel' |
    'arriere-grand-mere-maternelle-paternelle' | 'arriere-grand-pere-maternel-maternel' |
    'arriere-grand-mere-maternelle-maternelle' | 'principal';
}

// Interface pour les critères de recherche 
export interface PersonneSearchCriteria {
    nom?: string;
    prenom?: string;
    nina?: string;
    nomPere?: string;
    nomMere?: string;
}