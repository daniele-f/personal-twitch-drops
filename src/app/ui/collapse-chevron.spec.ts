import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CollapseChevronComponent } from './collapse-chevron';

@Component({ imports: [CollapseChevronComponent], template: '<app-collapse-chevron [expanded]="true" />' })
class HostComponent {}

describe('CollapseChevronComponent', () => {
  it('renders its expanded visual state without creating a control', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const chevron = fixture.nativeElement.querySelector('.app-collapse-chevron');
    expect(chevron.classList).toContain('app-collapse-chevron--expanded');
    expect(chevron.querySelector('button')).toBeNull();
  });
});
