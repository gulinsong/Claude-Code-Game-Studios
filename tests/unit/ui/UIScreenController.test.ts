/**
 * UIScreenController unit tests.
 *
 * Tests screen navigation, overlay management, back navigation,
 * debounce protection, and layout calculations.
 */

import { UIScreenController, UIScreen, UIOverlay } from '../../../src/ui/UIScreenController';
import { UI_CONFIG } from '../../../src/config/UIConfig';

describe('UIScreenController', () => {

    // ============================================================
    // Navigation
    // ============================================================

    describe('navigation', () => {
        let ctrl: UIScreenController;
        let switchedScreens: UIScreen[];

        beforeEach(() => {
            ctrl = new UIScreenController();
            switchedScreens = [];
            ctrl.onSwitchScreen = (screen) => switchedScreens.push(screen);
        });

        test('starts on MAIN_MENU', () => {
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.MAIN_MENU);
        });

        test('navigateTo pushes screen', () => {
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.WORLD_SELECT);
        });

        test('navigateTo fires onSwitchScreen', () => {
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            expect(switchedScreens).toContain(UIScreen.WORLD_SELECT);
        });

        test('navigateTo passes data', () => {
            ctrl.navigateTo(UIScreen.LEVEL_SELECT, { worldId: 2 });
            const state = ctrl.getState();
            expect(state.selectedWorldId).toBe(2);
        });

        test('navigateTo plays button sound', () => {
            const sounds: string[] = [];
            ctrl.onPlaySound = (id) => sounds.push(id);
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            expect(sounds).toContain(UI_CONFIG.SOUND_BUTTON_CLICK);
        });

        test('multiple navigations build stack', () => {
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.completeTransition();
            ctrl.navigateTo(UIScreen.LEVEL_SELECT, { worldId: 1 });
            ctrl.completeTransition();
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();

            expect(ctrl.getCurrentScreen()).toBe(UIScreen.GAMEPLAY);
            expect(ctrl.getState().previousScreen).toBe(UIScreen.LEVEL_SELECT);
        });
    });

    // ============================================================
    // Back navigation
    // ============================================================

    describe('back navigation', () => {
        let ctrl: UIScreenController;

        beforeEach(() => {
            ctrl = new UIScreenController();
            ctrl.onSwitchScreen = () => {};
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.completeTransition();
            ctrl.navigateTo(UIScreen.LEVEL_SELECT, { worldId: 1 });
            ctrl.completeTransition();
        });

        test('goBack returns to previous screen', () => {
            ctrl.goBack();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.WORLD_SELECT);
        });

        test('goBack twice returns to main menu', () => {
            ctrl.goBack();
            ctrl.completeTransition();
            ctrl.goBack();
            ctrl.completeTransition();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.MAIN_MENU);
        });

        test('goBack from main menu does nothing', () => {
            ctrl.reset();
            ctrl.goBack();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.MAIN_MENU);
        });

        test('goBack with overlay closes overlay first', () => {
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
            ctrl.openPause();

            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.PAUSE);
            ctrl.enableButtons();
            ctrl.goBack(); // Should close overlay, not navigate
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.NONE);
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.GAMEPLAY);
        });

        test('canGoBack is false on main menu with no overlay', () => {
            ctrl.reset();
            expect(ctrl.canGoBack()).toBe(false);
        });

        test('canGoBack is true with overlay', () => {
            ctrl.openPause();
            expect(ctrl.canGoBack()).toBe(true);
        });
    });

    // ============================================================
    // Overlays
    // ============================================================

    describe('overlays', () => {
        let ctrl: UIScreenController;
        let shownOverlays: UIOverlay[];

        beforeEach(() => {
            ctrl = new UIScreenController();
            shownOverlays = [];
            ctrl.onSwitchScreen = () => {};
            ctrl.onShowOverlay = (o) => shownOverlays.push(o);
            ctrl.onHideOverlay = () => {};
            ctrl.onPauseGame = () => {};
            ctrl.onResumeGame = () => {};
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
        });

        test('openPause shows pause overlay', () => {
            ctrl.openPause();
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.PAUSE);
            expect(shownOverlays).toContain(UIOverlay.PAUSE);
        });

        test('openPause fires onPauseGame', () => {
            let paused = false;
            ctrl.onPauseGame = () => paused = true;
            ctrl.openPause();
            expect(paused).toBe(true);
        });

        test('openPause plays pause_open sound', () => {
            const sounds: string[] = [];
            ctrl.onPlaySound = (id) => sounds.push(id);
            ctrl.openPause();
            expect(sounds).toContain(UI_CONFIG.SOUND_PAUSE_OPEN);
        });

        test('closePause hides overlay and resumes', () => {
            ctrl.openPause();
            ctrl.enableButtons();
            let resumed = false;
            ctrl.onResumeGame = () => resumed = true;
            ctrl.closePause();
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.NONE);
            expect(resumed).toBe(true);
        });

        test('openPause ignored if overlay already open', () => {
            ctrl.openPause();
            ctrl.enableButtons();
            ctrl.openPause(); // Should be ignored
            expect(shownOverlays.length).toBe(1);
        });

        test('openPause ignored if not on GAMEPLAY', () => {
            ctrl.reset();
            ctrl.openPause();
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.NONE);
        });

        test('showWinResult shows win overlay', () => {
            ctrl.showWinResult();
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.WIN_RESULT);
        });

        test('showLoseResult shows lose overlay', () => {
            ctrl.showLoseResult();
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.LOSE_RESULT);
        });

        test('showWinResult disables buttons', () => {
            ctrl.showWinResult();
            expect(ctrl.canInteract()).toBe(false);
        });

        test('enableButtons restores interaction', () => {
            ctrl.showWinResult();
            ctrl.completeTransition();
            ctrl.enableButtons();
            expect(ctrl.canInteract()).toBe(true);
        });
    });

    // ============================================================
    // Actions
    // ============================================================

    describe('actions', () => {
        let ctrl: UIScreenController;

        beforeEach(() => {
            ctrl = new UIScreenController();
            ctrl.onSwitchScreen = () => {};
        });

        test('startGame navigates to WORLD_SELECT', () => {
            ctrl.startGame();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.WORLD_SELECT);
        });

        test('continueGame navigates to GAMEPLAY with levelId', () => {
            ctrl.continueGame('2-3');
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.GAMEPLAY);
            expect(ctrl.getState().selectedLevelId).toBe('2-3');
        });

        test('selectWorld navigates to LEVEL_SELECT', () => {
            ctrl.onSwitchScreen = () => {};
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.completeTransition();
            ctrl.selectWorld(2);
            ctrl.completeTransition();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.LEVEL_SELECT);
            expect(ctrl.getState().selectedWorldId).toBe(2);
        });

        test('selectLevel navigates to GAMEPLAY', () => {
            ctrl.onSwitchScreen = () => {};
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.completeTransition();
            ctrl.navigateTo(UIScreen.LEVEL_SELECT, { worldId: 1 });
            ctrl.completeTransition();
            ctrl.selectLevel('1-3');
            ctrl.completeTransition();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.GAMEPLAY);
        });

        test('retryLevel calls onRestartLevel', () => {
            let restarted = false;
            ctrl.onRestartLevel = () => restarted = true;
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
            ctrl.showLoseResult();
            ctrl.enableButtons();
            ctrl.retryLevel();
            expect(restarted).toBe(true);
        });

        test('nextLevel calls onLoadLevel', () => {
            let loadedId = '';
            ctrl.onLoadLevel = (id) => loadedId = id;
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
            ctrl.showWinResult();
            ctrl.enableButtons();
            ctrl.nextLevel('1-2');
            expect(loadedId).toBe('1-2');
        });

        test('exitToLevelSelect pops to LEVEL_SELECT', () => {
            ctrl.onSwitchScreen = () => {};
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.completeTransition();
            ctrl.navigateTo(UIScreen.LEVEL_SELECT, { worldId: 1 });
            ctrl.completeTransition();
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
            // Now at GAMEPLAY, exit should pop back to LEVEL_SELECT
            ctrl.exitToLevelSelect();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.LEVEL_SELECT);
        });
    });

    // ============================================================
    // Debounce and interaction guards
    // ============================================================

    describe('debounce', () => {
        let ctrl: UIScreenController;

        beforeEach(() => {
            ctrl = new UIScreenController();
            ctrl.onSwitchScreen = () => {};
        });

        test('transitioning blocks interaction', () => {
            ctrl.navigateTo(UIScreen.WORLD_SELECT); // Sets transitioning
            // Second navigation should be blocked
            const screen1 = ctrl.getCurrentScreen();
            ctrl.navigateTo(UIScreen.LEVEL_SELECT);
            // Still on WORLD_SELECT because transitioning
            expect(ctrl.getCurrentScreen()).toBe(screen1);
        });

        test('completeTransition restores interaction', () => {
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.completeTransition();
            expect(ctrl.canInteract()).toBe(true);
        });

        test('applyDebounce blocks interaction temporarily', () => {
            ctrl.applyDebounce();
            expect(ctrl.canInteract()).toBe(false);
        });

        test('overlay disables buttons', () => {
            ctrl.onSwitchScreen = () => {};
            ctrl.onPauseGame = () => {};
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
            ctrl.openPause();
            // Buttons disabled during animation
            expect(ctrl.canInteract()).toBe(false);
        });
    });

    // ============================================================
    // Layout calculations
    // ============================================================

    describe('layout calculations', () => {
        let ctrl: UIScreenController;

        beforeEach(() => {
            ctrl = new UIScreenController();
        });

        test('getWorldCardLayouts returns correct count', () => {
            const layouts = ctrl.getWorldCardLayouts(4);
            expect(layouts.length).toBe(4);
        });

        test('getWorldCardLayouts centers horizontally', () => {
            const layouts = ctrl.getWorldCardLayouts(2);
            expect(layouts[0].x).toBe(UI_CONFIG.DESIGN_WIDTH / 2);
            expect(layouts[1].x).toBe(UI_CONFIG.DESIGN_WIDTH / 2);
        });

        test('getWorldCardLayouts stacks vertically', () => {
            const layouts = ctrl.getWorldCardLayouts(3);
            expect(layouts[1].y).toBeLessThan(layouts[0].y);
            expect(layouts[2].y).toBeLessThan(layouts[1].y);
        });

        test('getWorldCardLayouts has correct card size', () => {
            const layouts = ctrl.getWorldCardLayouts(1);
            expect(layouts[0].width).toBe(UI_CONFIG.WORLD_CARD_WIDTH);
            expect(layouts[0].height).toBe(UI_CONFIG.WORLD_CARD_HEIGHT);
        });

        test('getLevelCardLayouts returns correct count', () => {
            const layouts = ctrl.getLevelCardLayouts(8);
            expect(layouts.length).toBe(8);
        });

        test('getLevelCardLayouts arranges in 4 columns', () => {
            const layouts = ctrl.getLevelCardLayouts(8);
            // First 4 cards should have same Y (row 0)
            for (let i = 0; i < 4; i++) {
                expect(layouts[i].y).toBe(layouts[0].y);
            }
            // Next 4 cards should have same Y (row 1), different from row 0
            for (let i = 4; i < 8; i++) {
                expect(layouts[i].y).toBe(layouts[4].y);
                expect(layouts[i].y).toBeLessThan(layouts[0].y);
            }
        });

        test('getLevelCardLayouts cards have correct dimensions', () => {
            const layouts = ctrl.getLevelCardLayouts(4);
            for (const l of layouts) {
                expect(l.width).toBe(UI_CONFIG.LEVEL_CARD_WIDTH);
                expect(l.height).toBe(UI_CONFIG.LEVEL_CARD_HEIGHT);
            }
        });

        test('getStarLayouts returns 3 stars', () => {
            const stars = ctrl.getStarLayouts();
            expect(stars.length).toBe(3);
        });

        test('getStarLayouts stars are evenly spaced', () => {
            const stars = ctrl.getStarLayouts();
            const gap1 = stars[1].x - stars[0].x;
            const gap2 = stars[2].x - stars[1].x;
            expect(gap1).toBe(gap2);
        });

        test('getStarLayouts stars have correct size', () => {
            const stars = ctrl.getStarLayouts();
            for (const s of stars) {
                expect(s.width).toBe(UI_CONFIG.STAR_SIZE);
                expect(s.height).toBe(UI_CONFIG.STAR_SIZE);
            }
        });
    });

    // ============================================================
    // Reset
    // ============================================================

    describe('reset', () => {
        test('reset returns to MAIN_MENU', () => {
            const ctrl = new UIScreenController();
            ctrl.onSwitchScreen = () => {};
            ctrl.navigateTo(UIScreen.WORLD_SELECT);
            ctrl.navigateTo(UIScreen.LEVEL_SELECT, { worldId: 1 });
            ctrl.reset();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.MAIN_MENU);
            expect(ctrl.getCurrentOverlay()).toBe(UIOverlay.NONE);
            expect(ctrl.getState().selectedWorldId).toBeNull();
        });
    });

    // ============================================================
    // Edge cases
    // ============================================================

    describe('edge cases', () => {
        test('goBack from MAIN_MENU with no history is no-op', () => {
            const ctrl = new UIScreenController();
            ctrl.goBack();
            expect(ctrl.getCurrentScreen()).toBe(UIScreen.MAIN_MENU);
        });

        test('closePause when no overlay is open is no-op', () => {
            const ctrl = new UIScreenController();
            let hidden = false;
            ctrl.onHideOverlay = () => hidden = true;
            ctrl.closePause();
            expect(hidden).toBe(false);
        });

        test('showWinResult when overlay already open is no-op', () => {
            const ctrl = new UIScreenController();
            ctrl.onSwitchScreen = () => {};
            ctrl.navigateTo(UIScreen.GAMEPLAY, { levelId: '1-1' });
            ctrl.completeTransition();
            ctrl.showWinResult();
            const shown: UIOverlay[] = [];
            ctrl.onShowOverlay = (o) => shown.push(o);
            ctrl.showWinResult(); // Already showing
            expect(shown.length).toBe(0);
        });
    });
});
