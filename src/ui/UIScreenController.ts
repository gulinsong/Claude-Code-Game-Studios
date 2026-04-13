/**
 * UIScreenController.ts — Manages UI screen navigation, overlay state,
 * and provides layout calculations.
 *
 * Tracks navigation history for back navigation, manages overlay lifecycle
 * (pause, win result, lose result), and provides debounce protection
 * for rapid button clicks.
 *
 * GDD: design/gdd/ui-system.md
 * No engine dependencies — pure TypeScript.
 */

import { UI_CONFIG } from '../config/UIConfig';

// ===== Screen types =====

export enum UIScreen {
    MAIN_MENU = 'MAIN_MENU',
    WORLD_SELECT = 'WORLD_SELECT',
    LEVEL_SELECT = 'LEVEL_SELECT',
    GAMEPLAY = 'GAMEPLAY',
}

export enum UIOverlay {
    NONE = 'NONE',
    PAUSE = 'PAUSE',
    WIN_RESULT = 'WIN_RESULT',
    LOSE_RESULT = 'LOSE_RESULT',
}

/** Navigation state snapshot. */
export interface NavigationState {
    currentScreen: UIScreen;
    currentOverlay: UIOverlay;
    previousScreen: UIScreen | null;
    /** World ID for level select context. */
    selectedWorldId: number | null;
    /** Level ID for gameplay context. */
    selectedLevelId: string | null;
}

/** Layout position for a UI element. */
export interface UILayoutPosition {
    x: number;
    y: number;
}

/** Card layout info for rendering. */
export interface CardLayout {
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

/** HUD data pushed to the UI. */
export interface HUDData {
    linesUsed: number;
    linesRemaining: number;
    lightPointsCollected: number;
    lightPointsTotal: number;
    sessionTime: number;
}

/**
 * UIScreenController manages screen navigation and overlay state.
 */
export class UIScreenController {
    private navigationStack: UIScreen[];
    private currentOverlay: UIOverlay;
    private selectedWorldId: number | null;
    private selectedLevelId: string | null;

    /** Debounce timestamp — ignore clicks before this time. */
    private debounceUntil: number;

    /** Whether buttons are interactive (disabled during animations/transitions). */
    private buttonsInteractive: boolean;

    /** Whether a transition is in progress. */
    private transitioning: boolean;

    // ===== Callbacks =====

    /** Request scene switch. */
    public onSwitchScreen: ((screen: UIScreen, data?: Record<string, unknown>) => void) | null;

    /** Request overlay show. */
    public onShowOverlay: ((overlay: UIOverlay) => void) | null;

    /** Request overlay hide. */
    public onHideOverlay: (() => void) | null;

    /** Play UI sound. */
    public onPlaySound: ((soundId: string) => void) | null;

    /** Request level load. */
    public onLoadLevel: ((levelId: string) => void) | null;

    /** Request level restart. */
    public onRestartLevel: (() => void) | null;

    /** Request game pause. */
    public onPauseGame: (() => void) | null;

    /** Request game resume. */
    public onResumeGame: (() => void) | null;

    constructor() {
        this.navigationStack = [UIScreen.MAIN_MENU];
        this.currentOverlay = UIOverlay.NONE;
        this.selectedWorldId = null;
        this.selectedLevelId = null;
        this.debounceUntil = 0;
        this.buttonsInteractive = true;
        this.transitioning = false;

        this.onSwitchScreen = null;
        this.onShowOverlay = null;
        this.onHideOverlay = null;
        this.onPlaySound = null;
        this.onLoadLevel = null;
        this.onRestartLevel = null;
        this.onPauseGame = null;
        this.onResumeGame = null;
    }

    // ===== Navigation =====

    /** Navigate to a new screen, pushing the current one onto the stack. */
    navigateTo(screen: UIScreen, data?: Record<string, unknown>): void {
        if (!this.canInteract()) return;

        if (data?.worldId !== undefined) {
            this.selectedWorldId = data.worldId as number;
        }
        if (data?.levelId !== undefined) {
            this.selectedLevelId = data.levelId as string;
        }

        this.navigationStack.push(screen);
        this.setTransitioning(true);

        if (this.onSwitchScreen) {
            this.onSwitchScreen(screen, data);
        }
        if (this.onPlaySound) {
            this.onPlaySound(UI_CONFIG.SOUND_BUTTON_CLICK);
        }
    }

    /** Go back to the previous screen. */
    goBack(): void {
        if (!this.canInteract()) return;
        if (this.currentOverlay !== UIOverlay.NONE) {
            // If overlay is open, close it first
            this.closeOverlay();
            return;
        }
        if (this.navigationStack.length <= 1) return;

        this.navigationStack.pop();
        const prev = this.navigationStack[this.navigationStack.length - 1];
        this.setTransitioning(true);

        if (this.onSwitchScreen) {
            this.onSwitchScreen(prev);
        }
        if (this.onPlaySound) {
            this.onPlaySound(UI_CONFIG.SOUND_BUTTON_CLICK);
        }
    }

    /** Get the current screen. */
    getCurrentScreen(): UIScreen {
        return this.navigationStack[this.navigationStack.length - 1];
    }

    /** Get the navigation state. */
    getState(): NavigationState {
        return {
            currentScreen: this.getCurrentScreen(),
            currentOverlay: this.currentOverlay,
            previousScreen: this.navigationStack.length > 1
                ? this.navigationStack[this.navigationStack.length - 2]
                : null,
            selectedWorldId: this.selectedWorldId,
            selectedLevelId: this.selectedLevelId,
        };
    }

    // ===== Overlays =====

    /** Open the pause overlay. */
    openPause(): void {
        if (this.getCurrentScreen() !== UIScreen.GAMEPLAY) return;
        if (this.currentOverlay !== UIOverlay.NONE) return;

        this.currentOverlay = UIOverlay.PAUSE;
        this.buttonsInteractive = false; // Disable during animation

        if (this.onPauseGame) this.onPauseGame();
        if (this.onShowOverlay) this.onShowOverlay(UIOverlay.PAUSE);
        if (this.onPlaySound) this.onPlaySound(UI_CONFIG.SOUND_PAUSE_OPEN);
    }

    /** Close the pause overlay and resume. */
    closePause(): void {
        if (this.currentOverlay !== UIOverlay.PAUSE) return;
        if (!this.canInteract()) return;

        this.currentOverlay = UIOverlay.NONE;

        if (this.onResumeGame) this.onResumeGame();
        if (this.onHideOverlay) this.onHideOverlay();
        if (this.onPlaySound) this.onPlaySound(UI_CONFIG.SOUND_PAUSE_CLOSE);
    }

    /** Show the win result overlay. */
    showWinResult(): void {
        if (this.currentOverlay !== UIOverlay.NONE) return;

        this.currentOverlay = UIOverlay.WIN_RESULT;
        this.buttonsInteractive = false; // Wait for star animation

        if (this.onShowOverlay) this.onShowOverlay(UIOverlay.WIN_RESULT);
        if (this.onPlaySound) this.onPlaySound(UI_CONFIG.SOUND_RESULT_APPEAR);
    }

    /** Show the lose result overlay. */
    showLoseResult(): void {
        if (this.currentOverlay !== UIOverlay.NONE) return;

        this.currentOverlay = UIOverlay.LOSE_RESULT;
        this.buttonsInteractive = false;

        if (this.onShowOverlay) this.onShowOverlay(UIOverlay.LOSE_RESULT);
        if (this.onPlaySound) this.onPlaySound(UI_CONFIG.SOUND_RESULT_APPEAR);
    }

    /** Close any overlay. */
    closeOverlay(): void {
        if (this.currentOverlay === UIOverlay.NONE) return;
        this.currentOverlay = UIOverlay.NONE;
        this.buttonsInteractive = true;

        if (this.onHideOverlay) this.onHideOverlay();
    }

    /** Get current overlay. */
    getCurrentOverlay(): UIOverlay {
        return this.currentOverlay;
    }

    /** Enable buttons after animation completes. */
    enableButtons(): void {
        this.buttonsInteractive = true;
    }

    /** Mark transition as complete. */
    completeTransition(): void {
        this.transitioning = false;
        this.debounceUntil = 0;
    }

    // ===== Actions =====

    /** Start game — navigate from main menu. */
    startGame(): void {
        this.navigateTo(UIScreen.WORLD_SELECT);
    }

    /** Continue game — jump to last played level. */
    continueGame(levelId: string): void {
        this.selectedLevelId = levelId;
        this.navigateTo(UIScreen.GAMEPLAY, { levelId });
    }

    /** Select a world — navigate to level select. */
    selectWorld(worldId: number): void {
        this.navigateTo(UIScreen.LEVEL_SELECT, { worldId });
    }

    /** Select a level — navigate to gameplay. */
    selectLevel(levelId: string): void {
        this.selectedLevelId = levelId;
        this.navigateTo(UIScreen.GAMEPLAY, { levelId });
    }

    /** Retry current level (from overlay). */
    retryLevel(): void {
        if (!this.canInteract()) return;
        this.closeOverlay();
        if (this.onRestartLevel) this.onRestartLevel();
    }

    /** Load next level (from win overlay). */
    nextLevel(nextLevelId: string): void {
        if (!this.canInteract()) return;
        this.closeOverlay();
        this.selectedLevelId = nextLevelId;
        if (this.onLoadLevel) this.onLoadLevel(nextLevelId);
    }

    /** Exit to level select (from pause or result overlay). */
    exitToLevelSelect(): void {
        if (!this.canInteract()) return;
        this.closeOverlay();
        // Pop back to LEVEL_SELECT
        while (this.navigationStack.length > 1
            && this.getCurrentScreen() !== UIScreen.LEVEL_SELECT) {
            this.navigationStack.pop();
        }
        if (this.onSwitchScreen) {
            this.onSwitchScreen(UIScreen.LEVEL_SELECT);
        }
    }

    // ===== Layout calculations =====

    /** Calculate world card positions. */
    getWorldCardLayouts(count: number): CardLayout[] {
        const layouts: CardLayout[] = [];
        const startX = UI_CONFIG.DESIGN_WIDTH / 2;
        const startY = UI_CONFIG.DESIGN_HEIGHT - UI_CONFIG.WORLD_TOP_BAR_HEIGHT;

        for (let i = 0; i < count; i++) {
            layouts.push({
                index: i,
                x: startX,
                y: startY - i * (UI_CONFIG.WORLD_CARD_HEIGHT + UI_CONFIG.WORLD_CARD_SPACING)
                    - UI_CONFIG.WORLD_CARD_HEIGHT / 2,
                width: UI_CONFIG.WORLD_CARD_WIDTH,
                height: UI_CONFIG.WORLD_CARD_HEIGHT,
            });
        }
        return layouts;
    }

    /** Calculate level card positions in the grid. */
    getLevelCardLayouts(count: number): CardLayout[] {
        const layouts: CardLayout[] = [];
        const { LEVEL_CARD_WIDTH, LEVEL_CARD_HEIGHT, LEVEL_GRID_COLUMNS,
            LEVEL_GRID_H_SPACING, LEVEL_GRID_V_SPACING, DESIGN_WIDTH, DESIGN_HEIGHT,
            LEVEL_TOP_BAR_HEIGHT } = UI_CONFIG;

        const gridWidth = LEVEL_GRID_COLUMNS * LEVEL_CARD_WIDTH
            + (LEVEL_GRID_COLUMNS - 1) * LEVEL_GRID_H_SPACING;
        const gridStartX = (DESIGN_WIDTH - gridWidth) / 2 + LEVEL_CARD_WIDTH / 2;
        const gridStartY = UI_CONFIG.DESIGN_HEIGHT - LEVEL_TOP_BAR_HEIGHT;

        for (let i = 0; i < count; i++) {
            const col = i % LEVEL_GRID_COLUMNS;
            const row = Math.floor(i / LEVEL_GRID_COLUMNS);
            layouts.push({
                index: i,
                x: gridStartX + col * (LEVEL_CARD_WIDTH + LEVEL_GRID_H_SPACING),
                y: gridStartY - row * (LEVEL_CARD_HEIGHT + LEVEL_GRID_V_SPACING)
                    - LEVEL_CARD_HEIGHT / 2,
                width: LEVEL_CARD_WIDTH,
                height: LEVEL_CARD_HEIGHT,
            });
        }
        return layouts;
    }

    /** Calculate star positions in result overlay. */
    getStarLayouts(): CardLayout[] {
        const { STAR_SIZE, STAR_SPACING, RESULT_PANEL_WIDTH } = UI_CONFIG;
        const centerX = RESULT_PANEL_WIDTH / 2;
        const totalWidth = 3 * STAR_SIZE + 2 * STAR_SPACING;
        const startX = centerX - totalWidth / 2 + STAR_SIZE / 2;

        return [0, 1, 2].map(i => ({
            index: i,
            x: startX + i * (STAR_SIZE + STAR_SPACING),
            y: 0, // Relative to panel — caller adds panel Y
            width: STAR_SIZE,
            height: STAR_SIZE,
        }));
    }

    // ===== Interaction guards =====

    /** Check if interaction is allowed (not debounced, not transitioning, buttons enabled). */
    canInteract(): boolean {
        const now = Date.now();
        if (now < this.debounceUntil) return false;
        if (this.transitioning) return false;
        if (!this.buttonsInteractive) return false;
        return true;
    }

    /** Apply debounce protection. */
    applyDebounce(): void {
        this.debounceUntil = Date.now() + UI_CONFIG.DEBOUNCE_TIME * 1000;
    }

    /** Check if back navigation is possible. */
    canGoBack(): boolean {
        if (this.currentOverlay !== UIOverlay.NONE) return true;
        return this.navigationStack.length > 1;
    }

    // ===== Reset =====

    /** Reset to initial state. */
    reset(): void {
        this.navigationStack = [UIScreen.MAIN_MENU];
        this.currentOverlay = UIOverlay.NONE;
        this.selectedWorldId = null;
        this.selectedLevelId = null;
        this.debounceUntil = 0;
        this.buttonsInteractive = true;
        this.transitioning = false;
    }

    // ===== Private =====

    private setTransitioning(value: boolean): void {
        this.transitioning = value;
        if (value) {
            // Auto-clear transition after duration
            this.debounceUntil = Date.now() + UI_CONFIG.TRANSITION_DURATION * 1000;
        }
    }
}
