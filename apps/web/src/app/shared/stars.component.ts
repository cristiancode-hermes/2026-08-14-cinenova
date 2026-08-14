import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stars',
  standalone: true,
  template: `
    <span class="star-static" [attr.aria-label]="'Puntuación: ' + rating() + ' sobre 5'">
      @for (i of [].constructor(5); track $index) {
        <span [class.off]="$index + 0.5 > rating()">★</span>
      }
    </span>
  `,
})
export class StarsComponent {
  readonly rating = input<number>(0);
}
