import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { PersonEditComponent } from './person-edit/person-edit.component';

const routes: Routes = [
    { path: 'person-edit/:id', component: PersonEditComponent }
];

@NgModule({
    declarations: [
        PersonEditComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class PersonEditModule { }