import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RefreshLoaderComponent } from './refresh-loader';

@Component({ imports: [RefreshLoaderComponent], template: '<app-refresh-loader [spinning]="true" />' })
class TestHostComponent {}

type Point = { x: number; y: number };

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const segment = { x: end.x - start.x, y: end.y - start.y };
  const lengthSquared = segment.x ** 2 + segment.y ** 2;
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSquared));
  return Math.hypot(point.x - (start.x + projection * segment.x), point.y - (start.y + projection * segment.y));
}

describe('RefreshLoaderComponent', () => {
  it('adds the spinning class when requested', async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loader')?.classList).toContain('loader--spinning');
  });

  it('uses the parent text color for its shaft and arrow', async () => {
    await TestBed.configureTestingModule({ imports: [RefreshLoaderComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RefreshLoaderComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.style.color = 'rgb(12, 34, 56)';
    const shaft = element.querySelector<SVGPathElement>('.loader__shaft')!;
    const arrow = element.querySelector<SVGPolygonElement>('.loader__arrow')!;

    expect(getComputedStyle(shaft).color).toBe('rgb(12, 34, 56)');
    expect(getComputedStyle(shaft).stroke).toBe('currentcolor');
    expect(getComputedStyle(arrow).fill).toBe('currentcolor');
  });

  it('joins a wide arrowhead to the clockwise end of the shaft', async () => {
    await TestBed.configureTestingModule({ imports: [RefreshLoaderComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RefreshLoaderComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const shaft = element.querySelector<SVGPathElement>('.loader__shaft');
    const arrow = element.querySelector<SVGPolygonElement>('.loader__arrow');
    const shaftCoordinates = shaft?.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const arrowCoordinates = arrow?.getAttribute('points')?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];

    expect(shaftCoordinates.length).toBeGreaterThanOrEqual(4);
    expect(arrowCoordinates).toHaveLength(6);

    const shaftEnd = { x: shaftCoordinates.at(-2)!, y: shaftCoordinates.at(-1)! };
    const [tipX, tipY, baseAX, baseAY, baseBX, baseBY] = arrowCoordinates;
    const baseCenter = { x: (baseAX + baseBX) / 2, y: (baseAY + baseBY) / 2 };
    const baseWidth = Math.hypot(baseBX - baseAX, baseBY - baseAY);
    const shaftWidth = Number(shaft?.getAttribute('stroke-width'));
    const clockwiseTangent = { x: -(shaftEnd.y - 14), y: shaftEnd.x - 14 };
    const headDirection = { x: tipX - baseCenter.x, y: tipY - baseCenter.y };

    expect(baseCenter.x).toBeCloseTo(shaftEnd.x, 1);
    expect(baseCenter.y).toBeCloseTo(shaftEnd.y, 1);
    expect(baseWidth).toBeGreaterThan(shaftWidth * 1.5);
    expect(headDirection.x * clockwiseTangent.x + headDirection.y * clockwiseTangent.y).toBeGreaterThan(0);
  });

  it('leaves a visible gap between the shaft tail and arrowhead', async () => {
    await TestBed.configureTestingModule({ imports: [RefreshLoaderComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RefreshLoaderComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const shaft = element.querySelector<SVGPathElement>('.loader__shaft');
    const arrow = element.querySelector<SVGPolygonElement>('.loader__arrow');
    const shaftCoordinates = shaft?.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const arrowCoordinates = arrow?.getAttribute('points')?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const shaftTail = { x: shaftCoordinates[0], y: shaftCoordinates[1] };
    const arrowPoints = [
      { x: arrowCoordinates[0], y: arrowCoordinates[1] },
      { x: arrowCoordinates[2], y: arrowCoordinates[3] },
      { x: arrowCoordinates[4], y: arrowCoordinates[5] },
    ];
    const distanceToArrow = Math.min(...arrowPoints.map((point, index) => distanceToSegment(shaftTail, point, arrowPoints[(index + 1) % arrowPoints.length])));
    const visibleGap = distanceToArrow - Number(shaft?.getAttribute('stroke-width')) / 2;

    expect(visibleGap).toBeGreaterThan(3);
  });
});
