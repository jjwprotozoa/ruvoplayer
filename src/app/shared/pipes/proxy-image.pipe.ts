import { Pipe, PipeTransform } from '@angular/core';

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
                // Use this app's serverless function: relative path so it works on any domain
                return `/api/image?url=${encodeURIComponent(url)}`;
            }
            return url;
        } catch {
            return './assets/images/default-poster.png';
        }
    }
}


