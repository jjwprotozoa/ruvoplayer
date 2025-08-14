import { Injectable } from '@angular/core';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { BehaviorSubject } from 'rxjs';

export interface MpvProcess {
    id: number;
    url: string;
    start_time: number;
    last_known_time: number | null;
    thumbnail?: string;
    title: string;
}

@Injectable({
    providedIn: 'root',
})
export class MpvPlayerService {
    private activeProcessesSubject = new BehaviorSubject<MpvProcess[]>([]);
    public activeProcesses$ = this.activeProcessesSubject.asObservable();

    constructor() {
        // Only initialize if we're in a Tauri environment
        if (isTauri()) {
            this.initializeEventListeners();
            this.loadActiveProcesses();
        }
    }

    private async initializeEventListeners() {
        // Only proceed if we're in a Tauri environment
        if (!isTauri()) return;

        try {
            // Listen for new processes
            await listen('mpv-process-added', (event: any) => {
                const newProcess = event.payload as MpvProcess;
                if (newProcess) {
                    const currentProcesses = this.activeProcessesSubject.value;
                    this.activeProcessesSubject.next([
                        ...currentProcesses,
                        newProcess,
                    ]);
                }
            });

            // Listen for removed processes
            await listen('mpv-process-removed', (event: any) => {
                const removedProcess = event.payload as MpvProcess;
                if (removedProcess) {
                    const currentProcesses = this.activeProcessesSubject.value;
                    this.activeProcessesSubject.next(
                        currentProcesses.filter((p) => p.id !== removedProcess.id)
                    );
                }
            });
        } catch (error) {
            console.error('Failed to initialize MPV event listeners:', error);
        }
    }

    private async loadActiveProcesses() {
        if (!isTauri()) return;

        try {
            const processes = await invoke<MpvProcess[]>(
                'get_active_mpv_processes'
            );
            this.activeProcessesSubject.next(processes);
        } catch (error) {
            console.error('Failed to load active MPV processes:', error);
        }
    }

    async openStream(
        url: string,
        title: string,
        thumbnail?: string,
        mpvPath: string = ''
    ): Promise<number> {
        if (!isTauri()) {
            console.warn('MPV operations are only available in Tauri desktop environment');
            return -1;
        }

        try {
            return await invoke<number>('open_in_mpv', {
                url,
                path: mpvPath,
                title,
                thumbnail,
            });
        } catch (error) {
            console.error('Failed to open MPV stream:', error);
            throw error;
        }
    }

    async playStream(processId: number): Promise<void> {
        if (!isTauri()) {
            console.warn('MPV operations are only available in Tauri desktop environment');
            return;
        }

        try {
            await invoke('mpv_play', { processId });
        } catch (error) {
            console.error('Failed to play MPV stream:', error);
            throw error;
        }
    }

    async pauseStream(processId: number): Promise<void> {
        if (!isTauri()) {
            console.warn('MPV operations are only available in Tauri desktop environment');
            return;
        }

        try {
            await invoke('mpv_pause', { processId });
        } catch (error) {
            console.error('Failed to pause MPV stream:', error);
            throw error;
        }
    }

    async closeStream(processId: number): Promise<void> {
        if (!isTauri()) {
            console.warn('MPV operations are only available in Tauri desktop environment');
            return;
        }

        try {
            await invoke('close_mpv_process', { processId });
        } catch (error) {
            console.error('Failed to close MPV stream:', error);
            throw error;
        }
    }
}
