import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ActiveDrop } from '../drops/active-drop';
import { DropsProvider } from '../drops/drops-provider';
import { PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesService } from '../preferences/preferences.service';
import { DropsPageComponent } from './drops-page';

class TestDropsProvider extends DropsProvider {
  readonly requests: Subject<readonly ActiveDrop[]>[] = [];
  loadActiveDrops(): Subject<readonly ActiveDrop[]> { const request = new Subject<readonly ActiveDrop[]>(); this.requests.push(request); return request; }
}

describe('DropsPageComponent', () => {
  it('hides blacklisted active drops', async () => {
    const provider = new TestDropsProvider();
    await TestBed.configureTestingModule({ imports: [DropsPageComponent], providers: [{ provide: DropsProvider, useValue: provider }, { provide: PREFERENCES_STORAGE, useValue: localStorage }] }).compileComponents();
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const fixture = TestBed.createComponent(DropsPageComponent);
    fixture.detectChanges();
    provider.requests[0].next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }, { id: '/game/valorant', gameName: 'VALORANT', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sea of Thieves');
    expect(fixture.nativeElement.textContent).not.toContain('VALORANT');
  });
});
