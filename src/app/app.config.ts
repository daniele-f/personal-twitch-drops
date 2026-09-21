import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { DropsProvider } from './drops/drops-provider';
import { TwitchDropsAppProvider } from './drops/twitch-drops-app.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: DropsProvider, useClass: TwitchDropsAppProvider },
  ],
};
