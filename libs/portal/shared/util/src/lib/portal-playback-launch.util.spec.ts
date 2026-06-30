import type { ResolvedPortalPlayback } from '@iptvnator/shared/interfaces';

import type { PortalPlayer } from './portal-player';
import { launchPortalPlayback } from './portal-playback-launch.util';

describe('launchPortalPlayback', () => {
    const playback: ResolvedPortalPlayback = {
        streamUrl: 'https://example.com/movie/123.mkv',
        title: 'Example Movie',
    };

    it('opens external playback when the container is unsupported inline', () => {
        const portalPlayer: PortalPlayer = {
            isEmbeddedPlayer: jest.fn(() => true),
            shouldOpenUnsupportedContainerExternally: jest.fn(() => true),
            resolveExternalFallbackPlayer: jest.fn(() => 'mpv'),
            openPlayer: jest.fn(),
            openResolvedPlayback: jest.fn(),
            openExternalPlayback: jest.fn(),
        };
        const onInline = jest.fn();
        const onCloseInline = jest.fn();

        launchPortalPlayback(portalPlayer, playback, onInline, onCloseInline);

        expect(onCloseInline).toHaveBeenCalledTimes(1);
        expect(portalPlayer.openExternalPlayback).toHaveBeenCalledWith(
            playback,
            'mpv'
        );
        expect(onInline).not.toHaveBeenCalled();
    });

    it('keeps inline playback for browser-supported containers', () => {
        const portalPlayer: PortalPlayer = {
            isEmbeddedPlayer: jest.fn(() => true),
            shouldOpenUnsupportedContainerExternally: jest.fn(() => false),
            resolveExternalFallbackPlayer: jest.fn(() => 'mpv'),
            openPlayer: jest.fn(),
            openResolvedPlayback: jest.fn(),
            openExternalPlayback: jest.fn(),
        };
        const onInline = jest.fn();

        launchPortalPlayback(portalPlayer, playback, onInline);

        expect(onInline).toHaveBeenCalledWith(playback);
        expect(portalPlayer.openExternalPlayback).not.toHaveBeenCalled();
    });

    it('uses resolved external playback when the saved player is external', () => {
        const portalPlayer: PortalPlayer = {
            isEmbeddedPlayer: jest.fn(() => false),
            shouldOpenUnsupportedContainerExternally: jest.fn(() => false),
            resolveExternalFallbackPlayer: jest.fn(() => 'mpv'),
            openPlayer: jest.fn(),
            openResolvedPlayback: jest.fn(),
            openExternalPlayback: jest.fn(),
        };
        const onInline = jest.fn();
        const onCloseInline = jest.fn();

        launchPortalPlayback(
            portalPlayer,
            playback,
            onInline,
            onCloseInline
        );

        expect(onCloseInline).toHaveBeenCalledTimes(1);
        expect(portalPlayer.openResolvedPlayback).toHaveBeenCalledWith(
            playback,
            true
        );
        expect(onInline).not.toHaveBeenCalled();
    });
});
