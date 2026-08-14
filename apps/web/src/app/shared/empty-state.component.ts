import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty">
      <div class="big" aria-hidden="true">{{ icon() }}</div>
      <p><strong>{{ title() }}</strong></p>
      @if (text()) {
        <p style="margin-top:6px;font-size:0.9rem">{{ text() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('🎬');
  readonly title = input('Sin datos');
  readonly text = input('');
}
