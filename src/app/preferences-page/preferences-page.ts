import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DropsProvider } from '../drops/drops-provider';
import { PreferencesService, ThemeColor } from '../preferences/preferences.service';
import { ImportExportService } from '../preferences/import-export.service';
import { DisclosureComponent } from '../ui/disclosure';
import { StatusBadgeComponent } from '../ui/status-badge';

@Component({ imports: [RouterLink, DisclosureComponent, StatusBadgeComponent], selector: 'app-preferences-page', templateUrl: './preferences-page.html' })
export class PreferencesPageComponent {
  protected readonly preferences = inject(PreferencesService);
  private readonly importExport = inject(ImportExportService);
  private readonly dropsProvider = inject(DropsProvider);
  protected readonly favoriteRows = computed(() => [...this.preferences.favoriteIds()].map((id) => ({ id, gameName: this.preferences.favoriteNames().get(id) ?? this.fallbackName(id) })));
  protected readonly favoritesExpanded = signal(false);
  protected readonly activeDropIds = signal<ReadonlySet<string> | null>(null);
  protected readonly dropStatusUnavailable = signal(false);
  protected readonly armedFavoriteId = signal<string | null>(null);
  protected readonly expanded = signal(false);
  protected readonly armedForId = signal<string | null>(null);
  protected readonly exportCode = signal('');
  protected readonly importCode = signal('');
  protected readonly importMessage = signal('');
  protected readonly importSucceeded = signal<boolean | null>(null);
  protected readonly copyMessage = signal('');
  protected readonly fileDragActive = signal(false);
  constructor() {
    if (this.preferences.favoriteIds().size || this.preferences.blacklistEntries().length) {
      this.dropsProvider.loadActiveDrops().subscribe({
        next: (drops) => {
          this.activeDropIds.set(new Set(drops.map((drop) => drop.id)));
          this.preferences.rememberFavoriteNames(drops);
        },
        error: () => this.dropStatusUnavailable.set(true),
      });
    }
  }
  protected selectThemeColor(theme: ThemeColor): void { this.preferences.setThemeColor(theme); }
  protected removeFavorite(id: string): void { if (this.armedFavoriteId() === id) { this.preferences.removeFavorite(id); this.armedFavoriteId.set(null); } else this.armedFavoriteId.set(id); }
  protected cancelRemoveFavorite(id: string): void { if (this.armedFavoriteId() === id) this.armedFavoriteId.set(null); }
  private fallbackName(id: string): string { return (id.split('/').filter(Boolean).at(-1) || id).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()); }
  protected remove(id: string): void { if (this.armedForId() === id) { this.preferences.removeBlacklist(id); this.armedForId.set(null); } else this.armedForId.set(id); }
  protected cancelRemove(id: string): void { if (this.armedForId() === id) this.armedForId.set(null); }
  protected generateShareCode(): void { this.exportCode.set(this.importExport.export()); }
  protected selectShareCode(event: Event): void { (event.currentTarget as HTMLTextAreaElement).select(); }
  protected async copyShareCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.exportCode());
      this.copyMessage.set('Copied to clipboard.');
    } catch {
      this.copyMessage.set('Unable to copy automatically. Select and copy the code manually.');
    }
  }
  protected saveShareCode(): void {
    const url = URL.createObjectURL(new Blob([this.exportCode()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = this.shareCodeFileName();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  protected importLists(): void {
    if (this.importExport.import(this.importCode())) {
      this.importMessage.set('Lists replaced successfully.');
      this.importSucceeded.set(true);
      this.importCode.set('');
    } else {
      this.importMessage.set('That share code is not valid.');
      this.importSucceeded.set(false);
    }
  }
  protected importFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (file) void this.loadImportFile(file);
    input.value = '';
  }
  protected allowImportDrop(event: DragEvent): void { event.preventDefault(); }
  protected importDroppedFile(event: DragEvent): void {
    event.preventDefault();
    this.fileDragActive.set(false);
    const file = event.dataTransfer?.files.item(0);
    if (file) void this.loadImportFile(file);
  }
  protected async loadImportFile(file: File): Promise<void> {
    try {
      this.importCode.set(await file.text());
      this.importLists();
    } catch {
      this.importMessage.set('Unable to read that file.');
      this.importSucceeded.set(false);
    }
  }
  @HostListener('document:dragenter', ['$event'])
  protected startFileDrag(event: DragEvent): void {
    if (!this.hasFiles(event)) return;
    event.preventDefault();
    this.fileDragActive.set(true);
  }
  @HostListener('document:dragover', ['$event'])
  protected constrainFileDrag(event: DragEvent): void {
    if (!this.fileDragActive()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = (event.target as Element | null)?.closest?.('.import-code') ? 'copy' : 'none';
  }
  @HostListener('document:dragleave', ['$event'])
  protected endFileDragWhenLeavingPage(event: DragEvent): void {
    if (event.relatedTarget === null) this.fileDragActive.set(false);
  }
  @HostListener('document:dragend')
  protected endFileDrag(): void { this.fileDragActive.set(false); }
  @HostListener('document:drop', ['$event'])
  protected cancelOutsideFileDrop(event: DragEvent): void {
    if (!this.fileDragActive()) return;
    if (!(event.target as Element | null)?.closest?.('.import-code')) event.preventDefault();
    this.fileDragActive.set(false);
  }
  private hasFiles(event: DragEvent): boolean { return Array.from(event.dataTransfer?.types ?? []).includes('Files'); }
  private shareCodeFileName(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `personal-twitch-drops-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
  }
}
