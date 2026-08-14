import { Component, computed, input } from '@angular/core';

export type BookingStatus = 'pending' | 'confirmed' | 'used' | 'cancelled';

const LABELS: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  used: 'Usada',
  cancelled: 'Cancelada',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge badge-{{ status() }}">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input<BookingStatus>('pending');
  readonly label = computed(() => LABELS[this.status()] ?? this.status());
}
