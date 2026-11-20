import { Routes } from '@angular/router';
import { DropsPageComponent } from './drops-page/drops-page';

const loadPreferencesPage = () => import('./preferences-page/preferences-page').then((page) => page.PreferencesPageComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DropsPageComponent },
  { path: 'settings', pathMatch: 'full', redirectTo: 'settings/manage-games' },
  { path: 'settings/manage-games', loadComponent: loadPreferencesPage },
  { path: 'settings/account', loadComponent: loadPreferencesPage },
  { path: 'settings/appearance', loadComponent: loadPreferencesPage },
  { path: 'preferences', pathMatch: 'full', redirectTo: 'settings/manage-games' },
  { path: 'privacy', loadComponent: () => import('./privacy-page/privacy-page').then((page) => page.PrivacyPageComponent) },
  { path: '**', redirectTo: '' },
];
