import { Routes } from '@angular/router';
import { DropsPageComponent } from './drops-page/drops-page';
import { PreferencesPageComponent } from './preferences-page/preferences-page';
import { PrivacyPageComponent } from './privacy-page/privacy-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DropsPageComponent },
  { path: 'settings', pathMatch: 'full', redirectTo: 'settings/manage-games' },
  { path: 'settings/manage-games', component: PreferencesPageComponent },
  { path: 'settings/account', component: PreferencesPageComponent },
  { path: 'settings/appearance', component: PreferencesPageComponent },
  { path: 'preferences', pathMatch: 'full', redirectTo: 'settings/manage-games' },
  { path: 'privacy', component: PrivacyPageComponent },
  { path: '**', redirectTo: '' },
];
