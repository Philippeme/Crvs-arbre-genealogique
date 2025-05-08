import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap, catchError, finalize } from 'rxjs/operators';

import { Personne } from '../../../core/models/personne.model';
import { PersonneService } from '../../../core/services/personne.service';

@Component({
  selector: 'app-person-details',
  templateUrl: './person-details.component.html',
  styleUrls: ['./person-details.component.scss']
})
export class PersonDetailsComponent implements OnInit, OnDestroy {
  personne$: Observable<Personne> = of();
  pere$: Observable<Personne | null> = of(null);
  mere$: Observable<Personne | null> = of(null);
  isLoading = false;
  error: string | null = null;

  // Propriété pour stocker la personne actuelle
  currentPersonne: Personne | null = null;

  // Tableau pour stocker les souscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private personneService: PersonneService
  ) { }

  ngOnInit(): void {
    this.loadPersonne();
  }

  ngOnDestroy(): void {
    // Se désabonner de toutes les souscriptions pour éviter les fuites de mémoire
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  loadPersonne(): void {
    this.isLoading = true;
    this.error = null;

    // Créer l'observable pour charger la personne
    this.personne$ = this.route.paramMap.pipe(
      switchMap(params => {
        const personneId = params.get('id');
        if (!personneId) {
          throw new Error('ID de personne non spécifié');
        }
        return this.personneService.getPersonneById(personneId).pipe(
          finalize(() => {
            this.isLoading = false;
          })
        );
      })
    );

    // S'abonner à l'observable pour charger les informations sur le père et la mère
    this.subscriptions.push(
      this.personne$.subscribe({
        next: (personne) => {
          // Stocker la personne pour l'utiliser dans les actions
          this.currentPersonne = personne;

          if (personne.ninaPere) {
            this.pere$ = this.personneService.getPersonneByNina(personne.ninaPere).pipe(
              catchError(() => of(null))
            );
          }

          if (personne.ninaMere) {
            this.mere$ = this.personneService.getPersonneByNina(personne.ninaMere).pipe(
              catchError(() => of(null))
            );
          }
        },
        error: (err) => {
          this.error = `Erreur lors du chargement des détails: ${err.message}`;
          console.error('Erreur lors du chargement des détails:', err);
        }
      })
    );
  }

  onEdit(personne: Personne): void {
    this.router.navigate(['/person-edit', personne.id]);
  }

  /**
   * Navigue vers la vue de l'arbre de la personne
   */
  onViewArbre(personne: Personne): void {
    if (personne && personne.id) {
      // Navigation vers la route /arbre/:id avec l'ID de la personne
      this.router.navigate(['/arbre', personne.id]);
    } else {
      this.error = "Impossible d'afficher l'arbre: information d'identification manquante";
    }
  }

  onGoBack(): void {
    this.location.back();
  }
}