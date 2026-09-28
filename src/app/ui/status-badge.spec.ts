import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge';

@Component({ imports: [StatusBadgeComponent], template: '<app-status-badge status="active">Active</app-status-badge>' })
class HostComponent {}

describe('StatusBadgeComponent', () => {
  it('renders projected status text with its status variant', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.app-status-badge');
    expect(badge.textContent.trim()).toBe('Active');
    expect(badge.classList).toContain('app-status-badge--active');
  });
});
