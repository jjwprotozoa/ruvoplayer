import { Component, EventEmitter, Output, inject, Input, OnInit } from '@angular/core';
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

@Component({
    imports: [
        FormsModule,
        ReactiveFormsModule,
        MatButton,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatIcon,
        MatInputModule,
        MatProgressBarModule,
        TranslatePipe,
    ],
    selector: 'app-xtream-code-import',
    templateUrl: './xtream-code-import.component.html',
    styles: [
        `
        .smart-login-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #1e1e1e;
            border-radius: 16px;
            border: 1px solid #333;
            color: #ffffff;
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
            color: #ffffff;
        }

        .m3u-link-section {
            background: #2a2a2a;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            border: 2px solid #404040;
            color: #ffffff;
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
            background: #1e3a5f;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            border: 1px solid #3f51b5;
            color: #ffffff;
        }

        .m3u-info h4 {
            margin: 0 0 15px 0;
            color: #90caf9;
            font-size: 16px;
        }

        .m3u-info ul {
            margin: 0;
            padding-left: 20px;
        }

        .m3u-info li {
            margin-bottom: 8px;
            color: #e3f2fd;
        }

        .form-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .form-header h3 {
            margin: 0 0 10px 0;
            color: #ffffff;
            font-size: 24px;
        }

        .form-subtitle {
            margin: 0;
            color: #cccccc;
            font-size: 16px;
        }

        .full-width {
            width: 100%;
            margin-bottom: 20px;
        }

        /* Form field styling for better visibility */
        ::ng-deep .mat-mdc-form-field {
            width: 100%;
        }

        ::ng-deep .mat-mdc-form-field-label {
            color: #ffffff !important;
        }

        ::ng-deep .mat-mdc-form-field-hint {
            color: #b0b0b0 !important;
        }

        ::ng-deep .mat-mdc-text-field-wrapper {
            background-color: #333333 !important;
            border-radius: 8px;
        }

        ::ng-deep .mat-mdc-form-field-focus-overlay {
            background-color: #404040 !important;
        }

        ::ng-deep .mat-mdc-input-element {
            color: #ffffff !important;
        }

        ::ng-deep .mat-mdc-form-field-subscript-wrapper {
            color: #b0b0b0 !important;
        }

        .quick-fill-section {
            background: #2d2d2d;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            border: 1px solid #404040;
            color: #ffffff;
        }

        .quick-fill-section h4 {
            margin: 0 0 15px 0;
            color: #ffffff;
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
            background: #1b5e20;
            color: #4caf50;
            border: 1px solid #4caf50;
        }

        .status-inactive {
            background: #e65100;
            color: #ffcc02;
            border: 1px solid #ff9800;
        }

        .status-expired {
            background: #b71c1c;
            color: #f44336;
            border: 1px solid #f44336;
        }

        .status-unavailable {
            background: #b71c1c;
            color: #f44336;
            border: 1px solid #f44336;
        }

        .help-section {
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            border: 1px solid #404040;
            color: #ffffff;
        }

        .help-section h4 {
            margin: 0 0 15px 0;
            color: #ffffff;
            font-size: 16px;
        }

        .help-section ul {
            margin: 0;
            padding-left: 20px;
        }

        .help-section li {
            margin-bottom: 8px;
            color: #cccccc;
        }

        .help-section code {
            background: #404040;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #e0e0e0;
        }

        /* Enhanced Mobile Responsiveness */
        @media (max-width: 768px) {
            .smart-login-container {
                padding: 15px;
                margin: 10px;
                border-radius: 12px;
            }
            
            .login-mode-tabs {
                max-width: 100%;
            }
            
            .login-mode-tab {
                padding: 16px 12px;
                font-size: 14px;
                min-height: 48px;
            }
            
            .m3u-link-section {
                padding: 20px;
                margin-bottom: 15px;
            }
            
            .m3u-actions {
                flex-direction: column;
                gap: 12px;
            }
            
            .extract-btn, .example-btn {
                min-width: 100%;
                height: 52px;
                font-size: 16px;
            }
            
            .button-row {
                flex-direction: column;
                gap: 12px;
            }
            
            .test-btn, .add-btn {
                min-width: 100%;
                height: 52px;
                font-size: 16px;
            }
            
            .quick-fill-buttons {
                flex-direction: column;
                gap: 12px;
            }
            
            .quick-fill-btn {
                min-width: 100%;
                height: 48px;
                font-size: 16px;
            }
            
            .form-header h3 {
                font-size: 20px;
            }
            
            .form-subtitle {
                font-size: 14px;
            }
            
            .m3u-info, .help-section, .quick-fill-section {
                padding: 15px;
            }
            
            .m3u-info h4, .help-section h4, .quick-fill-section h4 {
                font-size: 15px;
            }
        }

        /* Extra small devices */
        @media (max-width: 480px) {
            .smart-login-container {
                padding: 12px;
                margin: 5px;
            }
            
            .login-mode-tab {
                padding: 14px 8px;
                font-size: 13px;
            }
            
            .m3u-link-section, .m3u-info, .help-section, .quick-fill-section {
                padding: 12px;
            }
            
            .extract-btn, .example-btn, .test-btn, .add-btn, .quick-fill-btn {
                height: 48px;
                font-size: 15px;
            }
        }
        `,
    ],
})
export class XtreamCodeImportComponent implements OnInit {
    @Input() defaultMode: 'manual' | 'm3u-link' = 'manual';
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

    ngOnInit() {
        // Set the default mode when component initializes
        this.loginMode = this.defaultMode;
    }

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
