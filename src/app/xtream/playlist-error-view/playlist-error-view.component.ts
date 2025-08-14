import { Component, Input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlaylistInfoComponent } from '../../home/recent-playlists/playlist-info/playlist-info.component';
import { DatabaseService } from '../../services/database.service';
import { PlaylistsService } from '../../services/playlists.service';
import { isTauri } from '@tauri-apps/api/core';
import { firstValueFrom } from 'rxjs';
import { DialogService } from '../../services/dialog.service';
import * as PlaylistActions from '../../state/actions';
import { selectCurrentPlaylist } from '../../state/selectors';

@Component({
    selector: 'app-playlist-error-view',
    templateUrl: './playlist-error-view.component.html',
    styleUrls: ['./playlist-error-view.component.scss'],
    imports: [MatButtonModule, MatIconModule, RouterLink, TranslateModule]
})
export class PlaylistErrorViewComponent {
    private databaseService = inject(DatabaseService);
    private playlistsService = inject(PlaylistsService);
    dialog = inject(MatDialog);
    dialogService = inject(DialogService);
    router = inject(Router);
    store = inject(Store);
    translate = inject(TranslateService);

    currentPlaylist = this.store.selectSignal(selectCurrentPlaylist);

    @Input() description: string;
    @Input() showActionButtons = true;
    @Input() title: string;
    @Input() viewType: 'ERROR' | 'EMPTY_CATEGORY' | 'NO_SEARCH_RESULTS' =
        'ERROR';

    openPlaylistDetails() {
        this.dialog.open(PlaylistInfoComponent, {
            data: this.currentPlaylist(),
        });
    }

    removeClicked(): void {
        this.dialogService.openConfirmDialog({
            title: this.translate.instant('HOME.PLAYLISTS.REMOVE_DIALOG.TITLE'),
            message: this.translate.instant(
                'HOME.PLAYLISTS.REMOVE_DIALOG.MESSAGE'
            ),
            onConfirm: (): void => {
                this.removePlaylist(this.currentPlaylist()._id);
            },
        });
    }

    async removePlaylist(playlistId: string): Promise<void> {
        try {
            if (isTauri()) {
                const deleted = await this.databaseService.deletePlaylist(playlistId);
                if (deleted) {
                    await firstValueFrom(this.playlistsService.deletePlaylist(playlistId));
                }
                if (!deleted) return;
            } else {
                await firstValueFrom(this.playlistsService.deletePlaylist(playlistId));
            }
            this.store.dispatch(PlaylistActions.removePlaylist({ playlistId }));
            this.router.navigate(['/']);
        } catch (e) {
            console.error('Failed to delete playlist', e);
        }
    }
}
