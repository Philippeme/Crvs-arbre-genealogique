// src/app/shared/components/tree-node/tree-node.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TreeNode } from '../../../core/models/arbre-genealogique.model';

@Component({
    selector: 'app-tree-node',
    templateUrl: './tree-node.component.html',
    styleUrls: ['./tree-node.component.scss']
})
export class TreeNodeComponent {
    @Input() node!: TreeNode & { x: number; y: number; };
    @Input() isSelected = false;

    @Output() nodeClick = new EventEmitter<TreeNode>();

    onClick(): void {
        this.nodeClick.emit(this.node);
    }

    get nodeClass(): string {
        const classes = ['tree-node'];

        if (this.node.genre === 'M') {
            classes.push('male');
        } else if (this.node.genre === 'F') {
            classes.push('female');
        }

        if (this.node.relation === 'principal') {
            classes.push('principal');
        }

        if (this.isSelected) {
            classes.push('selected');
        }

        return classes.join(' ');
    }
}