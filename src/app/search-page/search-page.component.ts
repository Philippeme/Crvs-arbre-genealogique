import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Personne } from '../core/models/personne.model';

@Component({
    selector: 'app-search-page',
    templateUrl: './search-page.component.html',
    styleUrls: ['./search-page.component.scss']
})
export class SearchPageComponent {
    searchResults: Personne[] = [];

    constructor(private router: Router) { }

    onSearchResults(results: Personne[]): void {
        this.searchResults = results;
    }

    onPersonDetails(personne: Personne): void {
        this.router.navigate(['/person-details', personne.id]);
    }

    onEditPerson(personne: Personne): void {
        this.router.navigate(['/person-edit', personne.id]);
    }

    onDeletePerson(personne: Personne): void {
        // Cette logique sera gérée par le composant de la carte personne
    }

    onViewArbre(personne: Personne): void {
        this.router.navigate(['/arbre', personne.id]);
    }
}