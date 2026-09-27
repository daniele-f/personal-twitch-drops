import { Injectable } from '@angular/core';
import confetti from '@hiseb/confetti';

@Injectable({ providedIn: 'root' })
export class CelebrationConfettiService {
  launch(): void {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const options = {
      count: 180,
      size: 1.2,
      velocity: 500,
      fade: true,
      color: ['#9147ff', '#4bd865', '#f5c542', '#5ba8ff', '#f06daa'],
    };
    confetti({ ...options, position: { x: 0, y: window.innerHeight } });
    confetti({ ...options, position: { x: window.innerWidth, y: window.innerHeight } });
  }
}
