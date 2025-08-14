import { Pipe, PipeTransform } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ImageCacheService } from '../services/image-cache.service';

@Pipe({
  name: 'cachedImage',
  standalone: true
})
export class CachedImagePipe implements PipeTransform {
  constructor(private imageCacheService: ImageCacheService) {}

  transform(url: string): Observable<string> {
    if (!url) {
      return of('./assets/images/default-poster.png');
    }

    return this.imageCacheService.getImage(url);
  }
}
