/**
 * SceneManagementSystem.test.ts — Unit tests for SceneManagementSystem.
 * GDD: design/gdd/scene-management.md
 */

import {
    SceneManagementSystem,
    SceneType,
    OverlayType,
    SceneState,
} from '../../../src/foundation/SceneManagementSystem';

describe('SceneManagementSystem initial state', () => {
    test('starts at MainMenu', () => {
        const sm = new SceneManagementSystem();
        expect(sm.getCurrentScene()).toBe(SceneType.MAIN_MENU);
    });

    test('starts with no overlay', () => {
        const sm = new SceneManagementSystem();
        expect(sm.getActiveOverlay()).toBeNull();
        expect(sm.isOverlayActive()).toBe(false);
    });

    test('starts in CURRENT state', () => {
        const sm = new SceneManagementSystem();
        expect(sm.isTransitioning()).toBe(false);
    });
});

describe('SceneManagementSystem scene transitions', () => {
    let sm: SceneManagementSystem;
    let loadedScenes: { scene: SceneType; data?: Record<string, unknown> }[];
    let musicPlayed: string[];

    beforeEach(() => {
        sm = new SceneManagementSystem();
        loadedScenes = [];
        musicPlayed = [];
        sm.onLoadScene = (scene, data) => loadedScenes.push({ scene, data });
        sm.onPlayMusic = (scene) => musicPlayed.push(scene);
    });

    test('requestTransition changes current scene', () => {
        sm.requestTransition(SceneType.GAMEPLAY, { levelId: '1-1' });
        expect(sm.getCurrentScene()).toBe(SceneType.GAMEPLAY);
        expect(loadedScenes.length).toBe(1);
        expect(loadedScenes[0].scene).toBe(SceneType.GAMEPLAY);
        expect(loadedScenes[0].data).toEqual({ levelId: '1-1' });
    });

    test('transition plays music for new scene', () => {
        sm.requestTransition(SceneType.GAMEPLAY);
        expect(musicPlayed).toEqual([SceneType.GAMEPLAY]);
    });

    test('transition clears overlay', () => {
        sm.showPauseOverlay();
        sm.requestTransition(SceneType.MAIN_MENU);
        expect(sm.getActiveOverlay()).toBeNull();
    });

    test('loadLevel transitions to Gameplay with levelId', () => {
        sm.loadLevel('2-3');
        expect(sm.getCurrentScene()).toBe(SceneType.GAMEPLAY);
        expect(loadedScenes[0].data).toEqual({ levelId: '2-3' });
    });

    test('goToMainMenu transitions to MainMenu', () => {
        sm.requestTransition(SceneType.GAMEPLAY);
        sm.goToMainMenu();
        expect(sm.getCurrentScene()).toBe(SceneType.MAIN_MENU);
    });

    test('goToWorldSelect transitions to WorldSelect', () => {
        sm.goToWorldSelect();
        expect(sm.getCurrentScene()).toBe(SceneType.WORLD_SELECT);
    });

    test('goToLevelSelect transitions with worldId', () => {
        sm.goToLevelSelect(2);
        expect(sm.getCurrentScene()).toBe(SceneType.LEVEL_SELECT);
        expect(loadedScenes[0].data).toEqual({ worldId: 2 });
    });

    test('transition during transition is ignored', () => {
        let lastCallback: (() => void) | null = null;
        sm.onShowTransition = (_out, _in, cb) => { lastCallback = cb; };
        sm.requestTransition(SceneType.GAMEPLAY); // starts transition
        expect(sm.isTransitioning()).toBe(true);
        expect(sm.getCurrentScene()).toBe(SceneType.MAIN_MENU); // scene not yet changed

        // Second transition ignored while transitioning
        sm.requestTransition(SceneType.MAIN_MENU);
        expect(sm.isTransitioning()).toBe(true); // still in first transition

        // Complete the first transition
        lastCallback!();
        expect(sm.getCurrentScene()).toBe(SceneType.GAMEPLAY);
        expect(sm.isTransitioning()).toBe(false);
    });

    test('getTransitionDuration returns sum of fade times', () => {
        const sm = new SceneManagementSystem();
        expect(sm.getTransitionDuration()).toBe(0.3); // 0.15 + 0.15
    });
});

describe('SceneManagementSystem overlays', () => {
    let sm: SceneManagementSystem;
    let shownOverlays: { type: OverlayType; data?: Record<string, unknown> }[];
    let hideCount: number;

    beforeEach(() => {
        sm = new SceneManagementSystem();
        shownOverlays = [];
        hideCount = 0;
        sm.onShowOverlay = (type, data) => shownOverlays.push({ type, data });
        sm.onHideOverlay = () => hideCount++;
        sm.requestTransition(SceneType.GAMEPLAY);
    });

    test('showPauseOverlay sets active overlay', () => {
        sm.showPauseOverlay();
        expect(sm.getActiveOverlay()).toBe(OverlayType.PAUSE);
        expect(sm.isOverlayActive()).toBe(true);
        expect(shownOverlays.length).toBe(1);
    });

    test('showWinResult sets active overlay with data', () => {
        sm.showWinResult({ stars: 3 });
        expect(sm.getActiveOverlay()).toBe(OverlayType.WIN_RESULT);
        expect(shownOverlays[0].data).toEqual({ stars: 3 });
    });

    test('showLoseResult sets active overlay', () => {
        sm.showLoseResult();
        expect(sm.getActiveOverlay()).toBe(OverlayType.LOSE_RESULT);
    });

    test('hideOverlay clears overlay', () => {
        sm.showPauseOverlay();
        sm.hideOverlay();
        expect(sm.getActiveOverlay()).toBeNull();
        expect(hideCount).toBe(1);
    });

    test('showPauseOverlay only works in Gameplay', () => {
        const menuSm = new SceneManagementSystem();
        menuSm.onShowOverlay = (type, data) => shownOverlays.push({ type, data });
        menuSm.showPauseOverlay(); // currently at MainMenu
        expect(shownOverlays.length).toBe(0);
    });
});
