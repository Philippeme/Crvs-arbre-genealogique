// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PersonCardComponent } from './components/person-card/person-card.component';
import { PersonSearchComponent } from './components/person-search/person-search.component';
import { TreeNodeComponent } from './components/tree-node/tree-node.component';
import { HighlightNodeDirective } from './directives/highlight-node.directive';
import { NinaFormatPipe } from './pipes/nina-format.pipe';

@NgModule({
    declarations: [
        PersonCardComponent,
        PersonSearchComponent,
        TreeNodeComponent,
        HighlightNodeDirective,
        NinaFormatPipe
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule
    ],
    exports: [
        // Components
        PersonCardComponent,
        PersonSearchComponent,
        TreeNodeComponent,

        // Directives
        HighlightNodeDirective,

        // Pipes
        NinaFormatPipe,

        // Modules for shared components
        CommonModule,
        ReactiveFormsModule
    ]
})
export class SharedModule { }