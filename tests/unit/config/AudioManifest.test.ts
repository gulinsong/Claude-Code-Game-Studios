/**
 * AudioManifest unit tests.
 *
 * Validates manifest completeness, uniqueness, and lookup consistency.
 */

import {
    SFX_MANIFEST, BGM_MANIFEST,
    SFX_MAP, BGM_MAP,
    getSfxPaths, getBgmPaths,
} from '../../../src/config/AudioManifest';

describe('AudioManifest', () => {

    describe('SFX manifest', () => {
        test('has 12 sound effects', () => {
            expect(SFX_MANIFEST.length).toBe(12);
        });

        test('all IDs are unique', () => {
            const ids = SFX_MANIFEST.map(e => e.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        test('all files are MP3', () => {
            for (const entry of SFX_MANIFEST) {
                expect(entry.file).toMatch(/\.mp3$/);
            }
        });

        test('all base volumes are in 0-1 range', () => {
            for (const entry of SFX_MANIFEST) {
                expect(entry.baseVolume).toBeGreaterThanOrEqual(0);
                expect(entry.baseVolume).toBeLessThanOrEqual(1);
            }
        });

        test('all durations are positive', () => {
            for (const entry of SFX_MANIFEST) {
                expect(entry.duration).toBeGreaterThan(0);
            }
        });

        test('contains required gameplay sound IDs', () => {
            const ids = new Set(SFX_MANIFEST.map(e => e.id));
            expect(ids.has('bounce')).toBe(true);
            expect(ids.has('collect')).toBe(true);
            expect(ids.has('win')).toBe(true);
            expect(ids.has('lose')).toBe(true);
            expect(ids.has('line_place')).toBe(true);
            expect(ids.has('line_reject')).toBe(true);
        });

        test('contains required UI sound IDs', () => {
            const ids = new Set(SFX_MANIFEST.map(e => e.id));
            expect(ids.has('button_click')).toBe(true);
            expect(ids.has('level_select')).toBe(true);
            expect(ids.has('world_unlock')).toBe(true);
            expect(ids.has('pause_open')).toBe(true);
            expect(ids.has('pause_close')).toBe(true);
            expect(ids.has('result_appear')).toBe(true);
        });
    });

    describe('BGM manifest', () => {
        test('has 2 background music tracks', () => {
            expect(BGM_MANIFEST.length).toBe(2);
        });

        test('all IDs are unique', () => {
            const ids = BGM_MANIFEST.map(e => e.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        test('all tracks loop', () => {
            for (const entry of BGM_MANIFEST) {
                expect(entry.loop).toBe(true);
            }
        });

        test('contains menu and gameplay music', () => {
            const ids = new Set(BGM_MANIFEST.map(e => e.id));
            expect(ids.has('menu_music')).toBe(true);
            expect(ids.has('gameplay_music')).toBe(true);
        });
    });

    describe('lookup maps', () => {
        test('SFX_MAP has entry for every manifest item', () => {
            for (const entry of SFX_MANIFEST) {
                expect(SFX_MAP.has(entry.id)).toBe(true);
                expect(SFX_MAP.get(entry.id)).toBe(entry);
            }
        });

        test('BGM_MAP has entry for every manifest item', () => {
            for (const entry of BGM_MANIFEST) {
                expect(BGM_MAP.has(entry.id)).toBe(true);
                expect(BGM_MAP.get(entry.id)).toBe(entry);
            }
        });

        test('SFX_MAP returns undefined for unknown ID', () => {
            expect(SFX_MAP.get('nonexistent')).toBeUndefined();
        });

        test('BGM_MAP returns undefined for unknown ID', () => {
            expect(BGM_MAP.get('nonexistent')).toBeUndefined();
        });
    });

    describe('path helpers', () => {
        test('getSfxPaths returns 12 paths', () => {
            expect(getSfxPaths().length).toBe(12);
        });

        test('getSfxPaths uses default base dir', () => {
            const paths = getSfxPaths();
            for (const p of paths) {
                expect(p).toMatch(/^sfx\//);
            }
        });

        test('getSfxPaths uses custom base dir', () => {
            const paths = getSfxPaths('audio/sfx/');
            for (const p of paths) {
                expect(p).toMatch(/^audio\/sfx\//);
            }
        });

        test('getBgmPaths returns 2 paths', () => {
            expect(getBgmPaths().length).toBe(2);
        });

        test('getBgmPaths uses default base dir', () => {
            const paths = getBgmPaths();
            for (const p of paths) {
                expect(p).toMatch(/^bgm\//);
            }
        });
    });
});
