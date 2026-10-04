import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';

/**
 * TD-09: zoneless change detection, stated explicitly rather than relied on as a
 * CLI default, so the decision is visible in the source and survives a scaffold
 * regeneration. No router is provided: F01 is a single page and the backlog adds
 * no routes, so an empty route table would be an abstraction the spec does not need.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
  ],
};
