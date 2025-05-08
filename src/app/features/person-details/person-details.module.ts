import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { PersonDetailsComponent } from './person-details/person-details.component';

const routes: Routes = [
  { path: 'person-details/:id', component: PersonDetailsComponent }
];

@NgModule({
  declarations: [
    PersonDetailsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class PersonDetailsModule { }