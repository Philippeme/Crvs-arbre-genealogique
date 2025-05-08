// src/app/features/person-edit/person-edit/person-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Personne } from '../../../core/models/personne.model';
import { PersonneService } from '../../../core/services/personne.service';
import { ArbreGenealogiqueService } from '../../../core/services/arbre-genealogique.service';

@Component({
  selector: 'app-person-edit',
  templateUrl: './person-edit.component.html',
  styleUrls: ['./person-edit.component.scss']
})
export class PersonEditComponent implements OnInit {
  personForm: FormGroup;
  isNewPerson = false;
  isLoading = false;
  isSaving = false;
  error: string | null = null;

  // Pour l'ajout d'un enfant ou d'un parent
  parentId: string | null = null;
  parentType: 'pere' | 'mere' | null = null;
  parentInfo: Personne | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private personneService: PersonneService,
    private arbreService: ArbreGenealogiqueService
  ) {
    this.personForm = this.createForm();
  }

  ngOnInit(): void {
    // Récupérer les paramètres de requête pour l'ajout d'un parent
    this.route.queryParams.subscribe(params => {
      this.parentId = params['parentId'] || null;
      this.parentType = params['parentType'] as 'pere' | 'mere' | null;

      if (this.parentId) {
        this.loadParentInfo();
      }
    });

    this.route.paramMap.subscribe(params => {
      const personneId = params.get('id');

      if (personneId === 'new') {
        this.isNewPerson = true;
        this.personForm.reset();

        // Si c'est un parent, définir le genre approprié
        if (this.parentType === 'pere') {
          this.personForm.patchValue({ genre: 'M' });
        } else if (this.parentType === 'mere') {
          this.personForm.patchValue({ genre: 'F' });
        }
      } else if (personneId) {
        this.loadPersonne(personneId);
      } else {
        this.error = 'ID de personne non spécifié';
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      id: [''],
      nina: ['', [Validators.required, Validators.pattern(/^\d{15}$/)]],
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      genre: ['M', [Validators.required]],
      dateNaissance: [null],
      lieuNaissance: [''],
      nomPere: [''],
      nomMere: [''],
      ninaPere: ['', [Validators.pattern(/^\d{15}$/)]],
      ninaMere: ['', [Validators.pattern(/^\d{15}$/)]],
      generation: [0],
      relationTypeAvecPrincipal: ['principal']
    });
  }

  loadPersonne(id: string): void {
    this.isLoading = true;
    this.error = null;

    this.personneService.getPersonneById(id).subscribe({
      next: (personne) => {
        this.personForm.patchValue(personne);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Erreur lors du chargement: ${err.message}`;
        this.isLoading = false;
      }
    });
  }

  loadParentInfo(): void {
    if (!this.parentId) return;

    this.personneService.getPersonneById(this.parentId).subscribe({
      next: (personne) => {
        this.parentInfo = personne;

        // Si on ajoute un père ou une mère
        if (this.parentType) {
          // Mise à jour du formulaire avec les informations de la relation
          if (this.parentType === 'pere') {
            this.personForm.patchValue({
              nomMere: personne.nom,
              ninaMere: personne.nina,
              relationTypeAvecPrincipal: 'pere',
              genre: 'M'
            });
          } else if (this.parentType === 'mere') {
            this.personForm.patchValue({
              nomPere: personne.nom,
              ninaPere: personne.nina,
              relationTypeAvecPrincipal: 'mere',
              genre: 'F'
            });
          }
        }
      },
      error: (err) => {
        this.error = `Erreur lors du chargement des informations du parent: ${err.message}`;
      }
    });
  }

  onSubmit(): void {
    if (this.personForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.personForm.controls).forEach(key => {
        const control = this.personForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;

    const personneData: Personne = this.personForm.value;

    let saveOperation: Observable<Personne>;

    if (this.isNewPerson) {
      // Suppression de l'ID pour la création (il sera généré par le service)
      const { id, ...newPersonneData } = personneData;
      saveOperation = this.personneService.createPersonne(newPersonneData);
    } else {
      saveOperation = this.personneService.updatePersonne(personneData);
    }

    saveOperation.subscribe({
      next: (savedPersonne) => {
        this.isSaving = false;

        // Si c'est un parent ajouté pour une personne, mettre à jour cette personne
        if (this.parentId && this.parentType && this.parentInfo) {
          const updatedParentInfo = { ...this.parentInfo };

          if (this.parentType === 'pere') {
            updatedParentInfo.nomPere = savedPersonne.nom;
            updatedParentInfo.ninaPere = savedPersonne.nina;
          } else if (this.parentType === 'mere') {
            updatedParentInfo.nomMere = savedPersonne.nom;
            updatedParentInfo.ninaMere = savedPersonne.nina;
          }

          this.personneService.updatePersonne(updatedParentInfo).subscribe({
            next: () => {
              this.navigateAfterSave(savedPersonne.id);
            },
            error: (err) => {
              this.error = `Erreur lors de la mise à jour du lien parent: ${err.message}`;
              this.isSaving = false;
            }
          });
        } else {
          this.navigateAfterSave(savedPersonne.id);
        }
      },
      error: (err) => {
        this.error = `Erreur lors de l'enregistrement: ${err.message}`;
        this.isSaving = false;
      }
    });
  }

  navigateAfterSave(personneId: string): void {
    // Rediriger vers la page de détails
    this.router.navigate(['/person-details', personneId]);
  }

  onCancel(): void {
    this.location.back();
  }

  // Getter pour faciliter l'accès aux contrôles du formulaire dans le template
  get f() {
    return this.personForm.controls;
  }
}