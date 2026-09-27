import { TestBed } from '@angular/core/testing';
import confetti from '@hiseb/confetti';
import { CelebrationConfettiService } from './celebration-confetti.service';

vi.mock('@hiseb/confetti', () => ({ default: vi.fn() }));

describe('CelebrationConfettiService', () => {
  it('launches high-volume bursts from both bottom corners', () => {
    const service = TestBed.inject(CelebrationConfettiService);

    service.launch();

    expect(confetti).toHaveBeenCalledTimes(2);
    expect(confetti).toHaveBeenNthCalledWith(1, expect.objectContaining({ position: { x: 0, y: window.innerHeight }, count: 180, velocity: 500 }));
    expect(confetti).toHaveBeenNthCalledWith(2, expect.objectContaining({ position: { x: window.innerWidth, y: window.innerHeight }, count: 180, velocity: 500 }));
  });
});
