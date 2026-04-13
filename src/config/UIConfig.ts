/**
 * UIConfig.ts — UI layout constants and configuration.
 *
 * All layout values based on 750x1334 design resolution (FIXED_WIDTH).
 * Sourced from design/gdd/ui-system.md.
 */

export const UI_CONFIG = {
    // Design resolution
    DESIGN_WIDTH: 750,
    DESIGN_HEIGHT: 1334,

    // Transitions
    TRANSITION_DURATION: 0.3,         // seconds
    OVERLAY_FADE_DURATION: 0.2,       // seconds

    // Button interaction
    BUTTON_SCALE_ON_PRESS: 0.95,
    CARD_SCALE_ON_PRESS: 0.97,
    DEBOUNCE_TIME: 0.3,               // seconds
    BUTTON_DEACTIVATE_DELAY: 1.6,     // seconds — wait for star animation

    // Result overlay
    RESULT_PANEL_WIDTH: 600,
    STAR_SIZE: 80,
    STAR_SPACING: 30,
    STAR_ANIM_DELAY: 0.4,             // seconds between stars

    // World select cards
    WORLD_CARD_WIDTH: 650,
    WORLD_CARD_HEIGHT: 200,
    WORLD_CARD_SPACING: 20,
    WORLD_TOP_BAR_HEIGHT: 160,

    // Level select grid
    LEVEL_CARD_WIDTH: 160,
    LEVEL_CARD_HEIGHT: 160,
    LEVEL_GRID_COLUMNS: 4,
    LEVEL_GRID_H_SPACING: 20,
    LEVEL_GRID_V_SPACING: 30,
    LEVEL_TOP_BAR_HEIGHT: 200,

    // HUD
    HUD_MARGIN: 30,

    // UI Sound IDs
    SOUND_BUTTON_CLICK: 'button_click',
    SOUND_LEVEL_SELECT: 'level_select',
    SOUND_WORLD_UNLOCK: 'world_unlock',
    SOUND_PAUSE_OPEN: 'pause_open',
    SOUND_PAUSE_CLOSE: 'pause_close',
    SOUND_RESULT_APPEAR: 'result_appear',
} as const;
