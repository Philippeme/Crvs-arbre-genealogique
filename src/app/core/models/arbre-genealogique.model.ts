import { Personne } from './personne.model'; 

export interface ArbreGenealogique {
  personneprincipale: Personne;
  membres: Personne[];
}

// Modèle plus élaboré pour la visualisation D3 de l'arbre
export interface TreeNode {
  id: string;
  nina: string;
  nom: string;
  prenom: string;
  genre: 'M' | 'F';
  generation: number;
  relation: string;
  children?: TreeNode[];
  x?: number; // Ajout pour D3
  y?: number; // Ajout pour D3
}

export interface TreeLink {
  source: string; // ID du nœud source
  target: string; // ID du nœud cible
  type: 'parent-enfant' | 'conjoint';
}

export interface TreeData {
  nodes: TreeNode[];
  links: TreeLink[];
}

// Pour les réponses de l'API (simulation)
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}