import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Composants pour les routes
import { ArbreGenealogiqueComponent } from './features/arbre-view/arbre-genealogique/arbre-genealogique.component';
import { PersonDetailsComponent } from './features/person-details/person-details/person-details.component';
import { PersonEditComponent } from './features/person-edit/person-edit/person-edit.component';

// Page d'accueil qui sera créée ultérieurement
import { HomeComponent } from './home/home.component';
import { SearchPageComponent } from './search-page/search-page.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchPageComponent },
  { path: 'arbre/:id', component: ArbreGenealogiqueComponent },
  { path: 'person-details/:id', component: PersonDetailsComponent },
  { path: 'person-edit/:id', component: PersonEditComponent },
  // Redirection par défaut
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }