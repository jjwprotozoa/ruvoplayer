import { Injectable } from '@angular/core';
import { StorageMap } from '@ngx-pwa/local-storage';
import { Observable } from 'rxjs';
import { STORE_KEY } from '../shared/enums/store-keys.enum';
import { Theme } from './../settings/theme.enum';

@Injectable({
    providedIn: 'root',
})
export class SettingsService {
    constructor(
        private storage: StorageMap
    ) {}

    /**
     * Changes the visual theme of the application
     * @param selectedTheme theme to set
     */
    changeTheme(selectedTheme: Theme): void {
        if (selectedTheme === Theme.LightTheme) {
            document.body.classList.remove('dark-theme');
        } else if (selectedTheme === Theme.DarkTheme) {
            document.body.classList.add('dark-theme');
        }
    }

    /**
     * Returns the value of the given key from the local storage
     * @param key key to get
     * @returns returns the value of the given key
     */
    getValueFromLocalStorage(key: STORE_KEY) {
        return this.storage.get(key);
    }

    /**
     * Sets the given key/value pair in the local storage
     * @param key key to set
     * @param value value to set
     * @param withCallback if true, the callback will be called after the value is set
     */
    setValueToLocalStorage(
        key: STORE_KEY,
        value: unknown,
        withCallback = false
    ): Observable<unknown> | never {
        if (withCallback) {
            return this.storage.set(key, value);
        } else {
            this.storage.set(key, value).subscribe(() => {});
        }
    }

    // Removed getAppVersion method - was leftover from IPTVnator and made unwanted network requests
    // App version is now handled by the data service (electron/tauri/pwa services)
}
