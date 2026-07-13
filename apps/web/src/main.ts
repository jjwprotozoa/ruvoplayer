import { bootstrapApplication } from '@angular/platform-browser';
import { registerAppDateLocales } from './app/app-date-locales';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { AppConfig } from './environments/environment';

registerAppDateLocales();

const runtimeWindow = globalThis.window;
if (runtimeWindow) {
    runtimeWindow.__IPTVNATOR_CONFIG__ ??= {};
    const runtimeConfig = runtimeWindow.__IPTVNATOR_CONFIG__;
    if (!runtimeConfig.BACKEND_URL?.trim()) {
        runtimeConfig.BACKEND_URL = AppConfig.BACKEND_URL;
    }
    if (!runtimeConfig.BACKEND_URL_BACKUP?.trim() && AppConfig.BACKEND_URL_BACKUP) {
        runtimeConfig.BACKEND_URL_BACKUP = AppConfig.BACKEND_URL_BACKUP;
    }
}

bootstrapApplication(AppComponent, appConfig)
    .then(() => {
        // Splash is rendered eagerly by index.html so the user sees something
        // immediately instead of a blank Material-grey background. Once Angular
        // is bootstrapped, AppComponent has rendered and we can drop the
        // splash. requestAnimationFrame ensures the swap happens after the
        // first AppComponent paint, avoiding a flash of empty background
        // between splash removal and Angular's first frame.
        requestAnimationFrame(() => {
            document.getElementById('initial-splash')?.remove();
        });
    })
    .catch((err) => console.error(err));
