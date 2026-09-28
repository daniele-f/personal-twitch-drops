import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusBadgeVariant = 'active' | 'inactive' | 'unavailable' | 'pending';

@Component({ selector: 'app-status-badge', templateUrl: './status-badge.html', styleUrl: './status-badge.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class StatusBadgeComponent { readonly status = input.required<StatusBadgeVariant>(); }
