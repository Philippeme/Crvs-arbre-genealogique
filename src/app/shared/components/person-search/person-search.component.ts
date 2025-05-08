// src/app/shared/components/person-search/person-search.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PersonneService } from '../../../core/services/personne.service';
import { Personne, PersonneSearchCriteria } from '../../../core/models/personne.model';

@Component({
  selector: 'app-person-search',
  templateUrl: './person-search.component.html',
  styleUrls: ['./person-search.component.scss']
})
export class PersonSearchComponent implements OnInit {
  @Output() searchResults = new EventEmitter<Personne[]>();

  searchForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private personneService: PersonneService
  ) {
    this.searchForm = this.fb.group({
      nom: [''],
      prenom: [''],
      nina: [''],
      nomPere: [''],
      nomMere: ['']
    });
  }

  ngOnInit(): void {
    // Appliquer un délai pour éviter trop de requêtes pendant la saisie
    this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(values => {
        this.search(values);
      });

    // Recherche initiale pour charger toutes les personnes
    this.search({});
  }

  search(criteria: PersonneSearchCriteria): void {
    this.isLoading = true;

    // Filtrer les critères vides
    const filteredCriteria: PersonneSearchCriteria = {};
    Object.keys(criteria).forEach(key => {
      const typedKey = key as keyof PersonneSearchCriteria;
      if (criteria[typedKey] && criteria[typedKey]!.trim() !== '') {
        filteredCriteria[typedKey] = criteria[typedKey];
      }
    });

    this.personneService.searchPersonnes(filteredCriteria)
      .subscribe({
        next: (results) => {
          this.searchResults.emit(results);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche:', error);
          this.isLoading = false;
        }
      });
  }

  resetSearch(): void {
    this.searchForm.reset();
    this.search({});
  }
}