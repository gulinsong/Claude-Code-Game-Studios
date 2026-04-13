/**
 * AudioManifest.ts — Sound ID registry and metadata for all game audio.
 *
 * Maps sound IDs used in code (e.g., 'bounce', 'collect') to their
 * file paths and base volume settings. The engine adapter reads this
 * to preload and play audio.
 *
 * GDD: design/gdd/audio-system.md
 * Spec: assets/audio/AUDIO-SPEC.md
 */

/** Sound effect metadata. */
export interface SfxEntry {
    /** Sound ID used in code. */
    id: string;
    /** File path relative to assets/audio/sfx/. */
    file: string;
    /** Base volume (0.0-1.0), multiplied with master and channel volume. */
    baseVolume: number;
    /** Duration in seconds (approximate). */
    duration: number;
}

/** Background music metadata. */
export interface BgmEntry {
    /** Music ID used in code. */
    id: string;
    /** File path relative to assets/audio/bgm/. */
    file: string;
    /** Base volume (0.0-1.0). */
    baseVolume: number;
    /** Whether this track loops. */
    loop: boolean;
}

/** All gameplay sound effects. */
export const SFX_MANIFEST: readonly SfxEntry[] = [
    // Core gameplay
    { id: 'bounce',       file: 'bounce.wav',       baseVolume: 0.8, duration: 0.2 },
    { id: 'collect',      file: 'collect.wav',      baseVolume: 0.7, duration: 0.4 },
    { id: 'win',          file: 'win.wav',          baseVolume: 0.9, duration: 1.2 },
    { id: 'lose',         file: 'lose.wav',         baseVolume: 0.6, duration: 0.6 },
    { id: 'line_place',   file: 'line_place.wav',   baseVolume: 0.5, duration: 0.12 },
    { id: 'line_reject',  file: 'line_reject.wav',  baseVolume: 0.4, duration: 0.12 },

    // UI sounds
    { id: 'button_click', file: 'button_click.wav', baseVolume: 0.4, duration: 0.08 },
    { id: 'level_select', file: 'level_select.wav', baseVolume: 0.5, duration: 0.15 },
    { id: 'world_unlock', file: 'world_unlock.wav', baseVolume: 0.7, duration: 0.5 },
    { id: 'pause_open',   file: 'pause_open.wav',   baseVolume: 0.3, duration: 0.1 },
    { id: 'pause_close',  file: 'pause_close.wav',  baseVolume: 0.3, duration: 0.1 },
    { id: 'result_appear',file: 'result_appear.wav',baseVolume: 0.5, duration: 0.15 },
] as const;

/** All background music tracks. */
export const BGM_MANIFEST: readonly BgmEntry[] = [
    { id: 'menu_music',     file: 'menu_music.wav',     baseVolume: 0.6, loop: true },
    { id: 'gameplay_music', file: 'gameplay_music.wav', baseVolume: 0.5, loop: true },
] as const;

/** Lookup map: sound ID → SFX entry. */
export const SFX_MAP: ReadonlyMap<string, SfxEntry> = new Map(
    SFX_MANIFEST.map(entry => [entry.id, entry]),
);

/** Lookup map: music ID → BGM entry. */
export const BGM_MAP: ReadonlyMap<string, BgmEntry> = new Map(
    BGM_MANIFEST.map(entry => [entry.id, entry]),
);

/** Get all SFX file paths for preloading. */
export function getSfxPaths(baseDir: string = 'sfx/'): string[] {
    return SFX_MANIFEST.map(e => baseDir + e.file);
}

/** Get all BGM file paths for preloading. */
export function getBgmPaths(baseDir: string = 'bgm/'): string[] {
    return BGM_MANIFEST.map(e => baseDir + e.file);
}
