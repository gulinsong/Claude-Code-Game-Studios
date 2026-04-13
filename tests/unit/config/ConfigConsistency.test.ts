/**
 * Config consistency tests.
 *
 * Validates that GameConfig and UIConfig values are internally consistent
 * and within documented safe ranges.
 */

import { BALL_CONFIG, COLLISION_CONFIG, BOUNDARY_CONFIG, INPUT_CONFIG, AUDIO_CONFIG, STAR_CONFIG } from '../../../src/config/GameConfig';
import { UI_CONFIG } from '../../../src/config/UIConfig';

describe('GameConfig', () => {

    describe('BALL_CONFIG', () => {
        test('gravity is positive', () => {
            expect(BALL_CONFIG.GRAVITY).toBeGreaterThan(0);
        });

        test('max speed is greater than min speed', () => {
            expect(BALL_CONFIG.MAX_SPEED).toBeGreaterThan(BALL_CONFIG.MIN_SPEED);
        });

        test('collider radius is positive', () => {
            expect(BALL_CONFIG.COLLIDER_RADIUS).toBeGreaterThan(0);
        });
    });

    describe('INPUT_CONFIG', () => {
        test('min line length is positive', () => {
            expect(INPUT_CONFIG.MIN_LINE_LENGTH).toBeGreaterThan(0);
        });
    });

    describe('COLLISION_CONFIG', () => {
        test('padding is non-negative', () => {
            expect(COLLISION_CONFIG.LINE_COLLISION_PADDING).toBeGreaterThanOrEqual(0);
        });

        test('light point category is defined', () => {
            expect(COLLISION_CONFIG.CATEGORY_LIGHTPOINT).toBeGreaterThan(0);
        });
    });

    describe('BOUNDARY_CONFIG', () => {
        test('destroy margin is positive', () => {
            expect(BOUNDARY_CONFIG.BALL_DESTROY_MARGIN).toBeGreaterThan(0);
        });

        test('safe area values are non-negative', () => {
            expect(BOUNDARY_CONFIG.DEFAULT_SAFE_AREA_TOP).toBeGreaterThanOrEqual(0);
            expect(BOUNDARY_CONFIG.DEFAULT_SAFE_AREA_BOTTOM).toBeGreaterThanOrEqual(0);
        });
    });

    describe('AUDIO_CONFIG', () => {
        test('master volume is in 0-1 range', () => {
            expect(AUDIO_CONFIG.MASTER_VOLUME).toBeGreaterThanOrEqual(0);
            expect(AUDIO_CONFIG.MASTER_VOLUME).toBeLessThanOrEqual(1);
        });

        test('max concurrent sounds is at least 1', () => {
            expect(AUDIO_CONFIG.MAX_CONCURRENT_SOUNDS).toBeGreaterThanOrEqual(1);
        });
    });

    describe('STAR_CONFIG', () => {
        test('world unlock thresholds has 4 entries', () => {
            expect(STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS.length).toBe(4);
        });

        test('first world threshold is 0', () => {
            expect(STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS[0]).toBe(0);
        });

        test('thresholds are strictly ascending', () => {
            const t = STAR_CONFIG.WORLD_UNLOCK_THRESHOLDS;
            for (let i = 1; i < t.length; i++) {
                expect(t[i]).toBeGreaterThan(t[i - 1]);
            }
        });
    });
});

describe('UIConfig', () => {

    describe('design resolution', () => {
        test('design width is 750', () => {
            expect(UI_CONFIG.DESIGN_WIDTH).toBe(750);
        });

        test('design height is 1334', () => {
            expect(UI_CONFIG.DESIGN_HEIGHT).toBe(1334);
        });
    });

    describe('timing values', () => {
        test('transition duration is positive', () => {
            expect(UI_CONFIG.TRANSITION_DURATION).toBeGreaterThan(0);
        });

        test('overlay fade duration is positive', () => {
            expect(UI_CONFIG.OVERLAY_FADE_DURATION).toBeGreaterThan(0);
        });

        test('debounce time is positive', () => {
            expect(UI_CONFIG.DEBOUNCE_TIME).toBeGreaterThan(0);
        });
    });

    describe('layout values', () => {
        test('star size is positive', () => {
            expect(UI_CONFIG.STAR_SIZE).toBeGreaterThan(0);
        });

        test('world card dimensions are positive', () => {
            expect(UI_CONFIG.WORLD_CARD_WIDTH).toBeGreaterThan(0);
            expect(UI_CONFIG.WORLD_CARD_HEIGHT).toBeGreaterThan(0);
        });

        test('level card dimensions are positive', () => {
            expect(UI_CONFIG.LEVEL_CARD_WIDTH).toBeGreaterThan(0);
            expect(UI_CONFIG.LEVEL_CARD_HEIGHT).toBeGreaterThan(0);
        });

        test('level grid columns is at least 1', () => {
            expect(UI_CONFIG.LEVEL_GRID_COLUMNS).toBeGreaterThanOrEqual(1);
        });
    });

    describe('button scale', () => {
        test('scale on press is between 0 and 1', () => {
            expect(UI_CONFIG.BUTTON_SCALE_ON_PRESS).toBeGreaterThan(0);
            expect(UI_CONFIG.BUTTON_SCALE_ON_PRESS).toBeLessThanOrEqual(1);
        });
    });

    describe('sound IDs', () => {
        test('all sound IDs are non-empty strings', () => {
            const ids = [
                UI_CONFIG.SOUND_BUTTON_CLICK,
                UI_CONFIG.SOUND_LEVEL_SELECT,
                UI_CONFIG.SOUND_WORLD_UNLOCK,
                UI_CONFIG.SOUND_PAUSE_OPEN,
                UI_CONFIG.SOUND_PAUSE_CLOSE,
                UI_CONFIG.SOUND_RESULT_APPEAR,
            ];
            for (const id of ids) {
                expect(typeof id).toBe('string');
                expect(id.length).toBeGreaterThan(0);
            }
        });
    });
});
