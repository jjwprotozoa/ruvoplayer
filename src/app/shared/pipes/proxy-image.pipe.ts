import { Pipe, PipeTransform } from '@angular/core';
import { AppConfig } from '../../../environments/environment';

@Pipe({
    name: 'proxyImage',
    standalone: true
})
export class ProxyImagePipe implements PipeTransform {
    transform(url: string | null | undefined): string {
        if (!url) return './assets/images/default-poster.png';
        try {
            // Only proxy http(s) external URLs
            if (/^https?:\/\//i.test(url)) {
                const base = AppConfig.BACKEND_URL?.replace(/\/$/, '');
                return `${base.replace(/\/$/, '')}/image?url=${encodeURIComponent(url)}`;
            }
            return url;
        } catch {
            return './assets/images/default-poster.png';
        }
    }
}


