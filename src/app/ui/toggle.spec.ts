import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToggleComponent } from './toggle';

@Component({ imports: [ToggleComponent], template: '<app-toggle controlId="example-toggle" label="Example" [checked]="false" (checkedChange)="changed = $event" />' })
class HostComponent { changed: boolean | undefined; }

describe('ToggleComponent', () => {
  it('shows the supplied tooltip when the toggle is hovered', async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ToggleComponent);
    fixture.componentRef.setInput('controlId', 'subscription-toggle');
    fixture.componentRef.setInput('label', 'Subs');
    fixture.componentRef.setInput('tooltip', 'Show/hide rewards requiring a subscription');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-toggle')?.getAttribute('title')).toBe('Show/hide rewards requiring a subscription');
    expect(fixture.nativeElement.querySelector('.app-toggle > label')?.getAttribute('title')).toBe('Show/hide rewards requiring a subscription');
  });

  it('uses a help cursor for a tooltip-bearing toggle', async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ToggleComponent);
    fixture.componentRef.setInput('controlId', 'subscription-toggle');
    fixture.componentRef.setInput('label', 'Subs');
    fixture.componentRef.setInput('tooltip', 'Show/hide rewards requiring a subscription');
    fixture.detectChanges();

    expect(getComputedStyle(fixture.nativeElement.querySelector('.app-toggle > label')).cursor).toBe('help');
  });

  it('associates its label with a native checkbox and emits the new value', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#example-toggle') as HTMLInputElement;
    expect(fixture.nativeElement.querySelector('label')?.htmlFor).toBe('example-toggle');
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.changed).toBe(true);
  });
});
