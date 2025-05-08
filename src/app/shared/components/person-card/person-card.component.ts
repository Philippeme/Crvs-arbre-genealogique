import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Personne } from '../../../core/models/personne.model';

@Component({
    selector: 'app-person-card',
    templateUrl: './person-card.component.html',
    styleUrls: ['./person-card.component.scss']
})
export class PersonCardComponent {
    @Input() personne!: Personne;
    @Input() isSelected = false;
    @Input() isMain = false; // Utilise une valeur par défaut pour éviter les problèmes de null
    @Input() showActions = true;

    @Output() editClicked = new EventEmitter<Personne>();
    @Output() detailsClicked = new EventEmitter<Personne>();
    @Output() deleteClicked = new EventEmitter<Personne>();
    @Output() selected = new EventEmitter<Personne>();

    onEdit(): void {
        this.editClicked.emit(this.personne);
    }

    onDetails(): void {
        this.detailsClicked.emit(this.personne);
    }

    onDelete(): void {
        this.deleteClicked.emit(this.personne);
    }

    onSelect(): void {
        this.selected.emit(this.personne);
    }
}