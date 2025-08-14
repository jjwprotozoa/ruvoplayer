import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OPEN_MPV_PLAYER, OPEN_VLC_PLAYER } from '../../../shared/ipc-commands';
import { VideoPlayer } from '../settings/settings.interface';
import { ExternalPlayerInfoDialogComponent } from '../shared/components/external-player-info-dialog/external-player-info-dialog.component';
import {
    PlayerDialogData,
    XtreamTauriPlayerDialogComponent,
} from '../xtream-tauri/player-dialog/player-dialog.component';
import { DataService } from './data.service';
import { SettingsStore } from './settings-store.service';

@Injectable({
    providedIn: 'root',
})
export class PlayerService {
    private dialog = inject(MatDialog);
    private dataService = inject(DataService);
    private settingsStore = inject(SettingsStore);

    async openPlayer(
        streamUrl: string,
        title: string,
        thumbnail?: string,
        hideExternalInfoDialog = true,
        isLiveContent = false
    ) {
        const player = this.settingsStore.player() ?? VideoPlayer.VideoJs;

        if (player === VideoPlayer.MPV) {
            if (!hideExternalInfoDialog) {
                this.dialog.open(ExternalPlayerInfoDialogComponent);
            }
            this.dataService.sendIpcEvent(OPEN_MPV_PLAYER, {
                url: streamUrl,
                mpvPlayerPath: this.settingsStore.mpvPlayerPath(),
                title,
                thumbnail,
            });
        } else if (player === VideoPlayer.VLC) {
            if (!hideExternalInfoDialog) {
                this.dialog.open(ExternalPlayerInfoDialogComponent);
            }
            this.dataService.sendIpcEvent(OPEN_VLC_PLAYER, {
                url: streamUrl,
                vlcPlayerPath: this.settingsStore.vlcPlayerPath(),
            });
        } else if (!isLiveContent) {
            // Import the ResponsiveSizingService to get proper dimensions
            const { ResponsiveSizingService } = await import('./responsive-sizing.service');
            const responsiveService = inject(ResponsiveSizingService);
            
            // Get responsive dimensions for the dialog
            const dialogDimensions = responsiveService.getVideoDialogDimensions();
            
            this.dialog.open<XtreamTauriPlayerDialogComponent, PlayerDialogData>(
                XtreamTauriPlayerDialogComponent,
                {
                    data: { streamUrl, title },
                    width: dialogDimensions.width,
                    maxWidth: dialogDimensions.maxWidth,
                    height: dialogDimensions.height,
                    maxHeight: dialogDimensions.maxHeight,
                    panelClass: responsiveService.getDialogPanelClass()
                }
            );
        }
    }
}
