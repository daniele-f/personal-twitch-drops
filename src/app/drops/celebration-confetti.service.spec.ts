import { TestBed } from '@angular/core/testing';
import { CelebrationConfettiService, CONFETTI_LAUNCHER } from './celebration-confetti.service';

describe('CelebrationConfettiService', () => {
  const launchConfetti = vi.fn();

  beforeEach(() => {
    launchConfetti.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: CONFETTI_LAUNCHER, useValue: launchConfetti }] });
  });

  it('launches high-volume bursts from both bottom corners', () => {
    const service = TestBed.inject(CelebrationConfettiService);

    service.launch();

    expect(launchConfetti).toHaveBeenCalledTimes(2);
    expect(launchConfetti).toHaveBeenNthCalledWith(1, expect.objectContaining({ position: { x: 0, y: window.innerHeight }, count: 180, velocity: 500 }));
    expect(launchConfetti).toHaveBeenNthCalledWith(2, expect.objectContaining({ position: { x: window.innerWidth, y: window.innerHeight }, count: 180, velocity: 500 }));
  });
});
