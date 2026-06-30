import type { ResolvedPortalPlayback } from '@iptvnator/shared/interfaces';

import type { PortalPlayer } from './portal-player';

export function launchPortalPlayback(
    portalPlayer: PortalPlayer,
    playback: ResolvedPortalPlayback,
    onInline: (playback: ResolvedPortalPlayback) => void,
    onCloseInline?: () => void
): void {
    if (!portalPlayer.isEmbeddedPlayer()) {
        onCloseInline?.();
        void portalPlayer.openResolvedPlayback(playback, true);
        return;
    }

    if (portalPlayer.shouldOpenUnsupportedContainerExternally(playback)) {
        onCloseInline?.();
        void portalPlayer.openExternalPlayback(
            playback,
            portalPlayer.resolveExternalFallbackPlayer()
        );
        return;
    }

    onInline(playback);
}
