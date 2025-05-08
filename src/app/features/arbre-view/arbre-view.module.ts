import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms'; 

import { SharedModule } from '../../shared/shared.module';
import { ArbreGenealogiqueComponent } from './arbre-genealogique/arbre-genealogique.component';

const routes: Routes = [
    { path: 'arbre/:id', component: ArbreGenealogiqueComponent }
];

@NgModule({
    declarations: [
        ArbreGenealogiqueComponent
    ],
    imports: [
        CommonModule,
        SharedModule,
        FormsModule, 
        RouterModule.forChild(routes)
    ],
    exports: [
        ArbreGenealogiqueComponent
    ]
})
export class ArbreViewModule { }