/**
 * SceneManagementSystem.ts — Manages game scene transitions and lifecycle.
 *
 * Tracks the current scene, handles transition requests, and provides
 * callbacks for scene load/unload events. Pure logic layer — actual scene
 * loading is delegated to the engine integration layer.
 *
 * GDD: design/gdd/scene-management.md
 * No engine dependencies — pure TypeScript.
 */

import { SCENE_CONFIG } from '../config/GameConfig';

/** Supported scene types. */
export enum SceneType {
    MAIN_MENU = 'MainMenu',
    WORLD_SELECT = 'WorldSelect',
    LEVEL_SELECT = 'LevelSelect',
    GAMEPLAY = 'Gameplay',
}

/** Overlay types (displayed within Gameplay scene). */
export enum OverlayType {
    PAUSE = 'PauseOverlay',
    WIN_RESULT = 'WinResultOverlay',
    LOSE_RESULT = 'LoseResultOverlay',
}

/** Current state of the scene system. */
export enum SceneState {
    CURRENT = 'CURRENT',
    TRANSITIONING = 'TRANSITIONING',
}

/** Data passed during scene transitions. */
export interface TransitionData {
    targetScene: SceneType;
    data?: Record<string, unknown>;
}

/**
 * SceneManagementSystem manages scene flow and transitions.
 * The engine layer calls into this system to request transitions
 * and receives callbacks for load/unload lifecycle events.
 */
export class SceneManagementSystem {
    private currentScene: SceneType;
    private activeOverlay: OverlayType | null;
    private state: SceneState;

    private readonly fadeOutDuration: number;
    private readonly fadeInDuration: number;

    /** Callback: engine layer should load the requested scene. */
    public onLoadScene: ((sceneType: SceneType, data?: Record<string, unknown>) => void) | null;

    /** Callback: engine layer should show transition fade. */
    public onShowTransition: ((fadeOut: number, fadeIn: number, callback: () => void) => void) | null;

    /** Callback: engine layer should show/hide overlay. */
    public onShowOverlay: ((overlayType: OverlayType, data?: Record<string, unknown>) => void) | null;

    /** Callback: engine layer should hide overlay. */
    public onHideOverlay: (() => void) | null;

    /** Callback: notify audio system to switch music. */
    public onPlayMusic: ((sceneType: string) => void) | null;

    constructor() {
        this.currentScene = SceneType.MAIN_MENU;
        this.activeOverlay = null;
        this.state = SceneState.CURRENT;
        this.fadeOutDuration = SCENE_CONFIG.TRANSITION_FADE_OUT;
        this.fadeInDuration = SCENE_CONFIG.TRANSITION_FADE_IN;
        this.onLoadScene = null;
        this.onShowTransition = null;
        this.onShowOverlay = null;
        this.onHideOverlay = null;
        this.onPlayMusic = null;
    }

    // ===== Scene transitions =====

    /**
     * Request a scene transition with fade effect.
     *
     * @param targetScene - Scene to load.
     * @param data        - Optional data to pass to the new scene.
     */
    requestTransition(targetScene: SceneType, data?: Record<string, unknown>): void {
        if (this.state === SceneState.TRANSITIONING) return;

        this.state = SceneState.TRANSITIONING;

        if (this.onShowTransition) {
            this.onShowTransition(
                this.fadeOutDuration,
                this.fadeInDuration,
                () => this.completeTransition(targetScene, data),
            );
        } else {
            // No transition handler — complete immediately
            this.completeTransition(targetScene, data);
        }
    }

    /**
     * Load a level by transitioning to the Gameplay scene.
     *
     * @param levelId - The level to load.
     */
    loadLevel(levelId: string): void {
        this.requestTransition(SceneType.GAMEPLAY, { levelId });
    }

    /**
     * Return to the main menu.
     */
    goToMainMenu(): void {
        this.activeOverlay = null;
        this.requestTransition(SceneType.MAIN_MENU);
    }

    /**
     * Go to world select screen.
     */
    goToWorldSelect(): void {
        this.requestTransition(SceneType.WORLD_SELECT);
    }

    /**
     * Go to level select for a specific world.
     */
    goToLevelSelect(worldId: number): void {
        this.requestTransition(SceneType.LEVEL_SELECT, { worldId });
    }

    // ===== Overlays =====

    /** Show the pause overlay. */
    showPauseOverlay(): void {
        if (this.currentScene !== SceneType.GAMEPLAY) return;
        this.activeOverlay = OverlayType.PAUSE;
        if (this.onShowOverlay) {
            this.onShowOverlay(OverlayType.PAUSE);
        }
    }

    /** Show the win result overlay. */
    showWinResult(data?: Record<string, unknown>): void {
        this.activeOverlay = OverlayType.WIN_RESULT;
        if (this.onShowOverlay) {
            this.onShowOverlay(OverlayType.WIN_RESULT, data);
        }
    }

    /** Show the lose result overlay. */
    showLoseResult(): void {
        this.activeOverlay = OverlayType.LOSE_RESULT;
        if (this.onShowOverlay) {
            this.onShowOverlay(OverlayType.LOSE_RESULT);
        }
    }

    /** Hide the current overlay. */
    hideOverlay(): void {
        this.activeOverlay = null;
        if (this.onHideOverlay) {
            this.onHideOverlay();
        }
    }

    // ===== Queries =====

    /** Get the current scene type. */
    getCurrentScene(): SceneType {
        return this.currentScene;
    }

    /** Get the active overlay, if any. */
    getActiveOverlay(): OverlayType | null {
        return this.activeOverlay;
    }

    /** Check if currently transitioning. */
    isTransitioning(): boolean {
        return this.state === SceneState.TRANSITIONING;
    }

    /** Check if an overlay is active. */
    isOverlayActive(): boolean {
        return this.activeOverlay !== null;
    }

    /** Get total transition duration (fade out + fade in). */
    getTransitionDuration(): number {
        return this.fadeOutDuration + this.fadeInDuration;
    }

    // ===== Private =====

    private completeTransition(targetScene: SceneType, data?: Record<string, unknown>): void {
        this.currentScene = targetScene;
        this.activeOverlay = null;
        this.state = SceneState.CURRENT;

        // Notify engine layer
        if (this.onLoadScene) {
            this.onLoadScene(targetScene, data);
        }

        // Switch background music
        if (this.onPlayMusic) {
            this.onPlayMusic(targetScene);
        }
    }
}
