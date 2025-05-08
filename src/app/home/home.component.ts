import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PersonneService } from '../core/services/personne.service';
import { Personne } from '../core/models/personne.model';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    recentPersonnes: Personne[] = [];
    isLoading = false;
    error: string | null = null;

    constructor(
        private personneService: PersonneService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadRecentPersonnes();
    }

    loadRecentPersonnes(): void {
        this.isLoading = true;
        this.error = null;

        this.personneService.getAllPersonnes().subscribe({
            next: (personnes) => {
                // Trier par ID (supposant que les IDs les plus récents sont plus grands)
                this.recentPersonnes = personnes.slice().reverse().slice(0, 5);
                this.isLoading = false;
            },
            error: (err) => {
                this.error = `Erreur lors du chargement des personnes récentes: ${err.message}`;
                this.isLoading = false;
            }
        });
    }

    onPersonDetails(personne: Personne): void {
        this.router.navigate(['/person-details', personne.id]);
    }

    onViewArbre(personne: Personne): void {
        this.router.navigate(['/arbre', personne.id]);
    }

    onEditPerson(personne: Personne): void {
        this.router.navigate(['/person-edit', personne.id]);
    }

    onDeletePerson(personne: Personne): void {
        if (confirm(`Êtes-vous sûr de vouloir supprimer ${personne.prenom} ${personne.nom} ?`)) {
            this.personneService.deletePersonne(personne.id).subscribe({
                next: () => {
                    this.loadRecentPersonnes();
                },
                error: (err) => {
                    this.error = `Erreur lors de la suppression: ${err.message}`;
                }
            });
        }
    }

    createNewPerson(): void {
        this.router.navigate(['/person-edit', 'new']);
    }
}