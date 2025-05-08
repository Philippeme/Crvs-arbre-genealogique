import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Modules fonctionnels
import { SharedModule } from './shared/shared.module';
import { ArbreViewModule } from './features/arbre-view/arbre-view.module';
import { PersonDetailsModule } from './features/person-details/person-details.module';
import { PersonEditModule } from './features/person-edit/person-edit.module';

// Composants de pages
import { HomeComponent } from './home/home.component';
import { SearchPageComponent } from './search-page/search-page.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SearchPageComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule,

    // Modules fonctionnels
    SharedModule,
    ArbreViewModule,
    PersonDetailsModule,
    PersonEditModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }