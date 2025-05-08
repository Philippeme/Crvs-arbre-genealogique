import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ninaFormat'
})
export class NinaFormatPipe implements PipeTransform {
    transform(value: string): string {
        if (!value || value.length !== 15) {
            return value;
        }

        // Formatter le NINA pour une meilleure lisibilité (ex: 123456-789012-345)
        return `${value.substr(0, 6)}-${value.substr(6, 6)}-${value.substr(12, 3)}`;
    }
}