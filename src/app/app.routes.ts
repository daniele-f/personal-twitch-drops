import { Routes } from '@angular/router';
import { DropsPageComponent } from './drops-page/drops-page';
import { PreferencesPageComponent } from './preferences-page/preferences-page';
import { PrivacyPageComponent } from './privacy-page/privacy-page';

export const routes: Routes = [{ path: '', pathMatch: 'full', component: DropsPageComponent }, { path: 'preferences', component: PreferencesPageComponent }, { path: 'privacy', component: PrivacyPageComponent }, { path: '**', redirectTo: '' }];
