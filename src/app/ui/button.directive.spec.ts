import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonDirective } from './button.directive';

@Component({ imports: [ButtonDirective], template: '<a appButton="primary" href="/preferences">Preferences</a><button appButton="destructive" type="button">Delete</button>' })
class HostComponent {}

describe('ButtonDirective', () => {
  it('adds button classes without changing anchor semantics', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.classList).toContain('app-button');
    expect(link.classList).toContain('app-button--primary');
    expect(link.getAttribute('role')).toBeNull();
  });

  it('marks destructive actions with a reusable destructive variant class', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList).toContain('app-button');
    expect(button.classList).toContain('app-button--destructive');
  });
});
