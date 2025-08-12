import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-welcome-modal',
    standalone: true,
    imports: [
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        TranslateModule
    ],
    template: `
        <div class="welcome-modal">
            <div class="welcome-header">
                <mat-icon class="welcome-icon">🎉</mat-icon>
                <h2>Welcome to Ruvo Player!</h2>
                <p>Let's get you started with your first playlist</p>
            </div>
            
            <div class="welcome-content">
                <div class="feature-card">
                    <mat-icon class="feature-icon">🔗</mat-icon>
                    <h3>Quick M3U Link Import</h3>
                    <p>Have an M3U playlist link? Just paste it and we'll extract everything automatically!</p>
                    <button 
                        mat-raised-button 
                        color="primary" 
                        (click)="onStartM3UImport()"
                        class="feature-btn"
                    >
                        <mat-icon>link</mat-icon>
                        Start with M3U Link
                    </button>
                </div>
                
                <div class="feature-card">
                    <mat-icon class="feature-icon">📁</mat-icon>
                    <h3>Upload Playlist Files</h3>
                    <p>Upload M3U/M3U8 files from your device or paste playlist content directly</p>
                    <button 
                        mat-stroked-button 
                        (click)="onStartFileUpload()"
                        class="feature-btn"
                    >
                        <mat-icon>upload_file</mat-icon>
                        Upload Files
                    </button>
                </div>
                
                <div class="feature-card">
                    <mat-icon class="feature-icon">📺</mat-icon>
                    <h3>IPTV Provider Login</h3>
                    <p>Connect to Xtream or Stalker portals with your credentials</p>
                    <button 
                        mat-stroked-button 
                        (click)="onStartIPTVLogin()"
                        class="feature-btn"
                    >
                        <mat-icon>video_library</mat-icon>
                        IPTV Login
                    </button>
                </div>
            </div>
            
            <div class="welcome-footer">
                <button 
                    mat-button 
                    (click)="closeModal()"
                    class="skip-btn"
                >
                    Skip for now
                </button>
            </div>
        </div>
    `,
    styles: [`
        .welcome-modal {
            padding: 24px;
            max-width: 600px;
            text-align: center;
        }
        
        .welcome-header {
            margin-bottom: 32px;
        }
        
        .welcome-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .welcome-header h2 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 28px;
        }
        
        .welcome-header p {
            margin: 0;
            color: #666;
            font-size: 16px;
        }
        
        .welcome-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .feature-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 24px;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
        }
        
        .feature-card:hover {
            border-color: #3f51b5;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .feature-icon {
            font-size: 32px;
            margin-bottom: 16px;
        }
        
        .feature-card h3 {
            margin: 0 0 12px 0;
            color: #333;
            font-size: 18px;
        }
        
        .feature-card p {
            margin: 0 0 20px 0;
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .feature-btn {
            width: 100%;
            height: 44px;
            font-weight: 500;
        }
        
        .welcome-footer {
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        
        .skip-btn {
            color: #666;
        }
        
        @media (min-width: 768px) {
            .welcome-content {
                grid-template-columns: repeat(3, 1fr);
            }
        }
    `]
})
export class WelcomeModalComponent {
    @Output() startM3UImport = new EventEmitter<void>();
    @Output() startFileUpload = new EventEmitter<void>();
    @Output() startIPTVLogin = new EventEmitter<void>();
    
    constructor(private dialogRef: MatDialogRef<WelcomeModalComponent>) {}
    
    onStartM3UImport() {
        this.startM3UImport.emit();
        this.dialogRef.close('m3u-link');
    }
    
    onStartFileUpload() {
        this.startFileUpload.emit();
        this.dialogRef.close('file');
    }
    
    onStartIPTVLogin() {
        this.startIPTVLogin.emit();
        this.dialogRef.close('xtream');
    }
    
    closeModal() {
        this.dialogRef.close();
    }
}
