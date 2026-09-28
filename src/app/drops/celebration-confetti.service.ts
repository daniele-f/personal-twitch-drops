import { inject, Injectable, InjectionToken } from '@angular/core';
import confetti from '@hiseb/confetti';

export const CONFETTI_LAUNCHER = new InjectionToken<typeof confetti>('CONFETTI_LAUNCHER', {
  providedIn: 'root',
  factory: () => confetti,
});

@Injectable({ providedIn: 'root' })
export class CelebrationConfettiService {
  private readonly launchConfetti = inject(CONFETTI_LAUNCHER);

  launch(): void {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const options = {
      count: 180,
      size: 1.2,
      velocity: 500,
      fade: true,
      color: ['#9147ff', '#4bd865', '#f5c542', '#5ba8ff', '#f06daa'],
    };
    this.launchConfetti({ ...options, position: { x: 0, y: window.innerHeight } });
    this.launchConfetti({ ...options, position: { x: window.innerWidth, y: window.innerHeight } });
  }
}
