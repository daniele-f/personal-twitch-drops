import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ActiveDrop } from '../drops/active-drop';
import { DropsProvider } from '../drops/drops-provider';
import { FAVORITE_IDS_STORAGE_KEY, PREFERENCES_STORAGE } from '../preferences/preferences-storage';
import { PreferencesService } from '../preferences/preferences.service';
import { ImportExportService } from '../preferences/import-export.service';
import { PreferencesPageComponent } from './preferences-page';

describe('PreferencesPageComponent', () => {
  let dropsResponse: Subject<readonly ActiveDrop[]>;
  beforeEach(async () => {
    localStorage.clear();
    dropsResponse = new Subject<readonly ActiveDrop[]>();
    await TestBed.configureTestingModule({
      imports: [PreferencesPageComponent],
      providers: [provideRouter([]), { provide: PREFERENCES_STORAGE, useValue: localStorage }, { provide: DropsProvider, useValue: { loadActiveDrops: () => dropsResponse } }],
    }).compileComponents();
  });

  it('hides the ignored date and changes the remove button to Confirm? before removing an entry', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.addBlacklist('/game/sea-of-thieves', 'Sea of Thieves');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.blacklist-disclosure button')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Ignored on');
    const remove = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-blacklist-id="/game/sea-of-thieves"] .remove-blacklist');
    remove?.click();
    fixture.detectChanges();
    expect(remove?.textContent?.trim()).toBe('Confirm?');
    expect(fixture.nativeElement.textContent).not.toContain('Press again to remove from Ignore List');
    remove?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No games are ignored.');
  });

  it('renders a Home route link before the Preferences title', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const home = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.home-link');
    expect(home?.textContent?.trim()).toBe('⌂ Home');
    expect(home?.getAttribute('href')).toBe('/');
  });

  it('groups sharing controls and list management into their own layout cards', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.import-share-card .import-code')).toBeTruthy();
    expect(root.querySelector('.export-share-card .export-button')).toBeTruthy();
    expect(root.querySelectorAll('.list-summary-card')).toHaveLength(2);
  });

  it('anchors the animated chevron strokes inside their icon wrapper', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const chevron = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.disclosure-chevron');
    expect(chevron?.querySelectorAll('i')).toHaveLength(2);
  });

  it('keeps two-digit disclosure counts on one line', () => {
    const preferences = TestBed.inject(PreferencesService);
    for (let index = 1; index <= 10; index++) {
      preferences.addFavorite(`/game/favorite-${index}`, `Favorite ${index}`);
      preferences.addBlacklist(`/game/ignored-${index}`, `Ignored ${index}`);
    }
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.favorites-disclosure .app-disclosure__label, .blacklist-disclosure .app-disclosure__label')];
    expect(labels.map((label) => label.textContent?.trim())).toEqual(['Favorites List (10)', 'Ignore List (10)']);
  });

  it('lists active and inactive favorites above the ignore list', () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, '["/game/sea-of-thieves","/game/valorant"]');
    localStorage.setItem('personal-twitch-drops.favorite-names.v1', '{"/game/sea-of-thieves":"Sea of Thieves","/game/valorant":"VALORANT"}');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    dropsResponse.next([{ id: '/game/sea-of-thieves', gameName: 'Sea of Thieves', rewardCount: 1, endsAt: '2026-09-28T12:00:00.000Z' }]);
    fixture.detectChanges();

    const sections = (fixture.nativeElement as HTMLElement).querySelectorAll('main section');
    expect(sections[0].textContent).toContain('Favorites List (2)');
    expect(sections[1].textContent).toContain('Ignore List');
    sections[0].querySelector('button')?.click();
    fixture.detectChanges();
    expect(sections[0].querySelector('[data-favorite-id="/game/sea-of-thieves"]')?.textContent).toContain('Active');
    expect(sections[0].querySelector('[data-favorite-id="/game/valorant"]')?.textContent).toContain('Inactive');
  });

  it('keeps a legacy inactive favorite readable and removable', () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, '["/game/sea-of-thieves"]');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    dropsResponse.next([]);
    fixture.detectChanges();

    const favorites = (fixture.nativeElement as HTMLElement).querySelector('main section');
    favorites?.querySelector('button')?.click();
    fixture.detectChanges();
    const row = favorites?.querySelector('[data-favorite-id="/game/sea-of-thieves"]');
    expect(row?.textContent?.toLowerCase()).toContain('sea of thieves');
    expect(row?.textContent).toContain('Inactive');
    const remove = row?.querySelector<HTMLButtonElement>('.remove-favorite');
    remove?.click();
    fixture.detectChanges();
    expect(remove?.textContent?.trim()).toBe('Confirm?');
    expect(favorites?.textContent).not.toContain('Press again to remove from Favorites');
    remove?.click();
    fixture.detectChanges();
    expect(favorites?.textContent).toContain('No favorite games yet.');
    expect(localStorage.getItem(FAVORITE_IDS_STORAGE_KEY)).toBeNull();
  });

  it('does not label favorites inactive when the drops feed fails', () => {
    localStorage.setItem(FAVORITE_IDS_STORAGE_KEY, '["/game/sea-of-thieves"]');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    dropsResponse.error(new Error('Feed unavailable'));
    fixture.detectChanges();

    const favorites = (fixture.nativeElement as HTMLElement).querySelector('main section');
    favorites?.querySelector('button')?.click();
    fixture.detectChanges();
    expect(favorites?.querySelector('[data-favorite-id="/game/sea-of-thieves"]')?.textContent).toContain('Status unavailable');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('replaces both lists when an opaque share code is imported', async () => {
    const preferences = TestBed.inject(PreferencesService);
    const importExport = TestBed.inject(ImportExportService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    preferences.addBlacklist('/game/valorant', 'VALORANT');
    const shareCode = await importExport.export();
    preferences.removeFavorite('/game/sea-of-thieves');
    preferences.removeBlacklist('/game/valorant');
    preferences.addFavorite('/game/old-game', 'Old Game');

    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.import-code');
    input!.value = shareCode;
    input!.dispatchEvent(new Event('input'));
    await (fixture.componentInstance as unknown as { importLists(): Promise<void> }).importLists();
    fixture.detectChanges();

    expect([...preferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(preferences.blacklistEntries().map((entry) => entry.id)).toEqual(['/game/valorant']);
    expect((fixture.nativeElement as HTMLElement).querySelector('.import-message')?.classList).toContain('import-message--success');
    expect((fixture.nativeElement as HTMLElement).querySelector('.import-feedback-row .import-message')).toBeTruthy();
  });

  it('shows generated share code in a vertically resizable text field that selects all code when clicked', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    await (fixture.componentInstance as unknown as { generateShareCode(): Promise<void> }).generateShareCode();
    fixture.detectChanges();

    const code = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.share-code');
    expect(code?.tagName).toBe('TEXTAREA');
    expect(code?.readOnly).toBe(true);
    expect(code?.value).toBeTruthy();
    expect(code?.classList).toContain('share-code--resizable');
    const label = (fixture.nativeElement as HTMLElement).querySelector<HTMLLabelElement>('label[for="export-code"]');
    expect(label?.textContent?.trim()).toBe('Share code');
    expect(label?.htmlFor).toBe(code?.id);
    code?.click();
    expect(code?.selectionStart).toBe(0);
    expect(code?.selectionEnd).toBe(code?.value.length);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.copy-share-code')?.textContent?.trim()).toBe('Copy to clipboard');
    const actions = (fixture.nativeElement as HTMLElement).querySelector('.share-code-actions')!;
    expect([...actions.children].map((action) => action.className)).toEqual(['copy-share-code', 'save-share-code']);
    const save = actions.querySelector<HTMLButtonElement>('.save-share-code');
    expect(save?.getAttribute('aria-label')).toBe('Download');
    expect(save?.title).toBe('Download');
    expect(save?.querySelector('.download-icon')).toBeTruthy();
    expect(code?.closest('.export-code-result')?.classList).toContain('export-code-result--enter');
  });

  it('animates expanded list content into view', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.favorites-disclosure button')?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.favorites-list-content')).toBeTruthy();
  });

  it('loads an import file into the share-code text area from the adjacent Import control', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const importButton = root.querySelector<HTMLButtonElement>('.import-file-button');
    const fileInput = root.querySelector<HTMLInputElement>('.import-file-input');
    expect(importButton?.getAttribute('aria-label')).toBe('Import');
    expect(importButton?.title).toBe('Import');
    expect(importButton?.querySelector('path')?.getAttribute('d')).toBe('M12 15V4m0 0 4 4m-4-4-4 4M4 17v3h16v-3');
    const actions = root.querySelector('.import-actions');
    expect(actions?.firstElementChild).toBe(root.querySelector('.import-button'));
    expect(importButton?.parentElement).toBe(actions);
    expect(fileInput?.type).toBe('file');

    const file = { text: () => Promise.resolve('share-code-from-file') } as File;
    await (fixture.componentInstance as unknown as { loadImportFile(file: File): Promise<void> }).loadImportFile(file);
    fixture.detectChanges();

    expect(root.querySelector<HTMLTextAreaElement>('.import-code')?.value).toBe('share-code-from-file');
  });

  it('imports a valid selected file as soon as it has been read', async () => {
    const preferences = TestBed.inject(PreferencesService);
    const importExport = TestBed.inject(ImportExportService);
    preferences.addFavorite('/game/sea-of-thieves', 'Sea of Thieves');
    const shareCode = await importExport.export();
    preferences.removeFavorite('/game/sea-of-thieves');
    preferences.addBlacklist('/game/old-game', 'Old Game');
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    await (fixture.componentInstance as unknown as { loadImportFile(file: File): Promise<void> }).loadImportFile({ text: () => Promise.resolve(shareCode) } as File);
    fixture.detectChanges();

    expect([...preferences.favoriteIds()]).toEqual(['/game/sea-of-thieves']);
    expect(preferences.blacklistEntries()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Lists replaced successfully.');
  });

  it('loads a dropped file into the paste-code text area', async () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const textArea = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.import-code')!;
    const file = { text: () => Promise.resolve('share-code-from-drop') } as File;
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: { item: () => file } } });

    textArea.dispatchEvent(drop);
    await Promise.resolve();
    fixture.detectChanges();

    expect(drop.defaultPrevented).toBe(true);
    expect(textArea.value).toBe('share-code-from-drop');
  });

  it('highlights the paste-code field and blocks file drops elsewhere while dragging over Preferences', () => {
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const dragEnter = new Event('dragenter', { bubbles: true, cancelable: true });
    Object.defineProperty(dragEnter, 'dataTransfer', { value: { types: ['Files'] } });

    document.dispatchEvent(dragEnter);
    fixture.detectChanges();

    expect(root.querySelector('.file-drag-overlay')).toBeTruthy();
    expect(root.querySelector('.import-drop-hint')?.textContent?.trim()).toBe('Release the file here');
    expect(root.querySelector('.import-code')?.classList).toContain('import-code--drop-target');

    const outsideDrop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(outsideDrop, 'dataTransfer', { value: { files: { item: () => ({ text: () => Promise.resolve('should-not-import') }) } } });
    root.dispatchEvent(outsideDrop);

    expect(outsideDrop.defaultPrevented).toBe(true);
    expect(root.querySelector<HTMLTextAreaElement>('.import-code')?.value).toBe('');
  });

  it('downloads the generated share code in a timestamped text file', async () => {
    const createObjectUrl = vi.fn(() => 'blob:share-code');
    const revokeObjectUrl = vi.fn();
    class TestUrl extends URL {
      static override createObjectURL = createObjectUrl;
      static override revokeObjectURL = revokeObjectUrl;
    }
    vi.stubGlobal('URL', TestUrl);
    let downloadedFileName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloadedFileName = this.download; });
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    fixture.detectChanges();

    await (fixture.componentInstance as unknown as { generateShareCode(): Promise<void> }).generateShareCode();
    fixture.detectChanges();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:15:00'));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.save-share-code')?.click();

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(downloadedFileName).toBe('personal-twitch-drops-2026-09-25-1015.txt');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:share-code');
  });
});
