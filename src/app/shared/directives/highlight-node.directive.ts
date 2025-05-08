import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
    selector: '[appHighlightNode]'
})
export class HighlightNodeDirective implements OnChanges {
    @Input() appHighlightNode = false;

    constructor(private el: ElementRef) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['appHighlightNode']) {
            if (this.appHighlightNode) {
                this.highlight();
            } else {
                this.removeHighlight();
            }
        }
    }

    private highlight(): void {
        this.el.nativeElement.classList.add('highlighted');
    }

    private removeHighlight(): void {
        this.el.nativeElement.classList.remove('highlighted');
    }
}