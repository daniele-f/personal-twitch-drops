import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToggleComponent } from './toggle';

@Component({ imports: [ToggleComponent], template: '<app-toggle controlId="example-toggle" label="Example" [checked]="false" (checkedChange)="changed = $event" />' })
class HostComponent { changed: boolean | undefined; }

describe('ToggleComponent', () => {
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
