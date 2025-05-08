import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators'; // Ajout de catchError manquant

import { Personne } from '../../../core/models/personne.model';
import { PersonneService } from '../../../core/services/personne.service';

@Component({
  selector: 'app-person-details',
  templateUrl: './person-details.component.html',
  styleUrls: ['./person-details.component.scss']
})
export class PersonDetailsComponent implements OnInit {
  personne$: Observable<Personne> = of();
  pere$: Observable<Personne | null> = of(null);
  mere$: Observable<Personne | null> = of(null);
  isLoading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private personneService: PersonneService
  ) { }

  ngOnInit(): void {
    this.loadPersonne();
  }

  loadPersonne(): void {
    this.isLoading = true;
    this.error = null;

    this.personne$ = this.route.paramMap.pipe(
      switchMap(params => {
        const personneId = params.get('id');
        if (!personneId) {
          throw new Error('ID de personne non spécifié');
        }
        return this.personneService.getPersonneById(personneId);
      })
    );

    // Charger les informations sur le père et la mère si disponibles
    this.personne$.subscribe({
      next: (personne) => {
        this.isLoading = false;

        if (personne.ninaPere) {
          this.pere$ = this.personneService.getPersonneByNina(personne.ninaPere).pipe(
            switchMap(pere => of(pere)),
            // Ignorer les erreurs, simplement retourner null si le père n'est pas trouvé
            catchError(() => of(null))
          );
        }

        if (personne.ninaMere) {
          this.mere$ = this.personneService.getPersonneByNina(personne.ninaMere).pipe(
            switchMap(mere => of(mere)),
            catchError(() => of(null))
          );
        }
      },
      error: (err) => {
        this.error = `Erreur lors du chargement des détails: ${err.message}`;
        this.isLoading = false;
      }
    });
  }

  onEdit(personne: Personne): void {
    this.router.navigate(['/person-edit', personne.id]);
  }

  onViewArbre(personne: Personne): void {
    this.router.navigate(['/arbre', personne.id]);
  }

  onGoBack(): void {
    this.location.back();
  }
}