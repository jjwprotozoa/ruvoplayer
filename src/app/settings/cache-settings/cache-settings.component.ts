import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CacheManagerComponent } from '../../shared/components/cache-manager/cache-manager.component';

@Component({
  selector: 'app-cache-settings',
  standalone: true,
  imports: [CommonModule, CacheManagerComponent],
  template: `
    <div class="cache-settings">
      <div class="header">
        <h1>Image Cache Settings</h1>
        <p>
          Manage how images are cached in the application to improve performance 
          and reduce bandwidth usage.
        </p>
      </div>
      
      <app-cache-manager></app-cache-manager>
    </div>
  `,
  styles: [`
    .cache-settings {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

      h1 {
        margin: 0 0 16px 0;
        font-size: 2.5rem;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      p {
        margin: 0;
        font-size: 1.1rem;
        opacity: 0.9;
        line-height: 1.6;
        max-width: 600px;
        margin: 0 auto;
      }
    }

    @media (max-width: 768px) {
      .cache-settings {
        padding: 16px;
      }

      .header {
        padding: 20px;
        margin-bottom: 24px;

        h1 {
          font-size: 2rem;
        }

        p {
          font-size: 1rem;
        }
      }
    }
  `]
})
export class CacheSettingsComponent {}
