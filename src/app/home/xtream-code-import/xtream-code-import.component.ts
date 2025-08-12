import { Component, EventEmitter, Output, inject } from '@angular/core';
import {
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { v4 as uuid } from 'uuid';
import { Playlist } from '../../../../shared/playlist.interface';
import {
    PortalStatus,
    PortalStatusService,
} from '../../services/portal-status.service';
import { addPlaylist } from '../../state/actions';
import { HeaderComponent } from '../header/header.component';
import { RecentPlaylistsComponent } from '../recent-playlists/recent-playlists.component';
import { NgIf } from '@angular/common';

@Component({
    imports: [
        NgIf,
        FormsModule,
        ReactiveFormsModule,
        MatButton,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatIcon,
        MatInputModule,
        MatProgressBarModule,
        TranslatePipe,
        HeaderComponent,
        RecentPlaylistsComponent,
    ],
    selector: 'app-xtream-code-import',
    templateUrl: './xtream-code-import.component.html',
    styles: [
        `
        .smart-login-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }

        .login-mode-selector {
            margin-bottom: 30px;
            text-align: center;
        }

        .login-mode-tabs {
            width: 100%;
            max-width: 500px;
        }

        .login-mode-tab {
            flex: 1;
            padding: 12px 20px;
            font-weight: 500;
        }

        .m3u-link-section {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            border: 2px solid #e9ecef;
        }

        .m3u-actions {
            display: flex;
            gap: 15px;
            margin: 20px 0;
            flex-wrap: wrap;
        }

        .extract-btn {
            flex: 1;
            min-width: 200px;
            height: 48px;
            font-weight: 500;
        }

        .example-btn {
            height: 48px;
            font-weight: 500;
        }

        .m3u-info {
            background: #e3f2fd;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }

        .m3u-info h4 {
            margin: 0 0 15px 0;
            color: #1976d2;
            font-size: 16px;
        }

        .m3u-info ul {
            margin: 0;
            padding-left: 20px;
        }

        .m3u-info li {
            margin-bottom: 8px;
            color: #424242;
        }

        .form-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .form-header h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 24px;
        }

        .form-subtitle {
            margin: 0;
            color: #666;
            font-size: 16px;
        }

        .full-width {
            width: 100%;
            margin-bottom: 20px;
        }

        .quick-fill-section {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }

        .quick-fill-section h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }

        .quick-fill-buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .quick-fill-btn {
            flex: 1;
            min-width: 150px;
            height: 40px;
        }

        .button-row {
            display: flex;
            gap: 15px;
            margin: 25px 0;
            flex-wrap: wrap;
        }

        .test-btn, .add-btn {
            flex: 1;
            min-width: 150px;
            height: 48px;
            font-weight: 500;
        }

        .connection-status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 500;
        }

        .status-active {
            background: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #4caf50;
        }

        .status-inactive {
            background: #fff3e0;
            color: #ef6c00;
            border: 1px solid #ff9800;
        }

        .status-expired {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #f44336;
        }

        .status-unavailable {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #f44336;
        }

        .help-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }

        .help-section h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }

        .help-section ul {
            margin: 0;
            padding-left: 20px;
        }

        .help-section li {
            margin-bottom: 8px;
            color: #424242;
        }

        .help-section code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }

        @media (max-width: 768px) {
            .smart-login-container {
                padding: 15px;
            }
            
            .m3u-actions, .button-row {
                flex-direction: column;
            }
            
            .extract-btn, .test-btn, .add-btn {
                min-width: 100%;
            }
        }
        `,
    ],
})
export class XtreamCodeImportComponent {
    @Output() addClicked = new EventEmitter<void>();
    URL_REGEX = /^(http|https|file):\/\/[^ "]+$/;
    
    // Smart login detection
    loginMode: 'manual' | 'm3u-link' = 'manual';
    m3uLink = '';

    form = new FormGroup({
        _id: new FormControl(uuid()),
        title: new FormControl('', [Validators.required]),
        password: new FormControl('', [Validators.required]),
        username: new FormControl('', [Validators.required]),
        serverUrl: new FormControl('', [
            Validators.required,
            Validators.pattern(this.URL_REGEX),
        ]),
        importDate: new FormControl(new Date().toISOString()),
    });

    readonly store = inject(Store);
    readonly portalStatusService = inject(PortalStatusService);

    connectionStatus: PortalStatus | null = null;
    isTestingConnection = false;

    async testConnection(): Promise<void> {
        if (!this.form.valid) return;

        this.isTestingConnection = true;
        this.connectionStatus = null;

        try {
            const status = await this.portalStatusService.checkPortalStatus(
                this.form.value.serverUrl!,
                this.form.value.username!,
                this.form.value.password!
            );
            this.connectionStatus = status;
        } catch (error) {
            console.error('Connection test failed:', error);
            this.connectionStatus = 'unavailable';
        } finally {
            this.isTestingConnection = false;
        }
    }

    /**
     * Extract credentials from M3U link and populate form
     */
    extractFromM3ULink(m3uLink: string): void {
        try {
            const url = new URL(m3uLink);
            
            // Extract credentials from query parameters
            const username = url.searchParams.get('username');
            const password = url.searchParams.get('password');
            
            if (username && password) {
                // Extract server URL (remove query parameters)
                const serverUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
                
                // Auto-generate title
                const title = `IPTV - ${url.hostname}`;
                
                // Populate form
                this.form.patchValue({
                    title,
                    serverUrl,
                    username,
                    password
                });
                
                // Switch to manual mode to show the populated form
                this.loginMode = 'manual';
                
                console.log('Credentials extracted from M3U link:', { title, serverUrl, username, password });
            } else {
                throw new Error('Username or password not found in M3U link');
            }
        } catch (error) {
            console.error('Failed to extract credentials from M3U link:', error);
            // You could show a user-friendly error message here
        }
    }

    /**
     * Quick fill examples for common IPTV providers
     */
    fillExample(type: 'ruvoplay' | 'iptv'): void {
        if (type === 'ruvoplay') {
            this.form.patchValue({
                title: 'Ruvo Play IPTV',
                serverUrl: 'http://ruvoplay.online',
                username: 'RuvoTest',
                password: 'a1cba53d1b'
            });
        } else if (type === 'iptv') {
            this.form.patchValue({
                title: 'My IPTV Provider',
                serverUrl: 'http://your-server.com',
                username: 'your_username',
                password: 'your_password'
            });
        }
    }

    getStatusMessage(): string {
        return this.portalStatusService.getStatusMessage(this.connectionStatus);
    }

    getStatusClass(): string {
        return this.portalStatusService.getStatusClass(this.connectionStatus);
    }

    getStatusIcon(): string {
        return this.portalStatusService.getStatusIcon(this.connectionStatus);
    }

    addPlaylist() {
        const serverUrlAsString = this.form.value.serverUrl as string;
        const url = new URL(serverUrlAsString);
        const serverUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
        this.store.dispatch(
            addPlaylist({
                playlist: {
                    ...this.form.value,
                    serverUrl,
                } as Playlist,
            })
        );
        this.addClicked.emit();
    }

    extractParams(urlAsString: string): void {
        if (
            this.form.get('username').value !== '' ||
            this.form.get('password').value !== ''
        )
            return;
        try {
            // Create a new URL object from the complete link
            const url = new URL(urlAsString);

            // Extract username and password from query parameters
            const username = url.searchParams.get('username') || '';
            const password = url.searchParams.get('password') || '';

            this.form.get('username')?.setValue(username);
            this.form.get('password')?.setValue(password);
        } catch (error) {
            console.error('Invalid URL', error);
        }
    }
}
