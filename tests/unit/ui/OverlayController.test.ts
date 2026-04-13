/**
 * OverlayController unit tests.
 *
 * Tests win/lose result data assembly, encourage text selection,
 * and data persistence for query.
 */

import { OverlayController } from '../../../src/ui/OverlayController';

describe('OverlayController', () => {

    // ============================================================
    // Win result
    // ============================================================

    describe('win result', () => {
        let ctrl: OverlayController;

        beforeEach(() => {
            ctrl = new OverlayController();
        });

        test('buildWinResult returns correct data', () => {
            const data = ctrl.buildWinResult('1-1', 3, 5, 5, 12.3, true, '1-2');
            expect(data.levelId).toBe('1-1');
            expect(data.stars).toBe(3);
            expect(data.lightPointsCollected).toBe(5);
            expect(data.lightPointsTotal).toBe(5);
            expect(data.sessionTime).toBe(12.3);
            expect(data.hasNextLevel).toBe(true);
            expect(data.nextLevelId).toBe('1-2');
        });

        test('buildWinResult clamps stars to 0-3', () => {
            const data = ctrl.buildWinResult('1-1', 5, 5, 5, 10, false, null);
            expect(data.stars).toBe(3);
        });

        test('buildWinResult clamps negative stars to 0', () => {
            const data = ctrl.buildWinResult('1-1', -1, 5, 5, 10, false, null);
            expect(data.stars).toBe(0);
        });

        test('buildWinResult with no next level', () => {
            const data = ctrl.buildWinResult('4-8', 2, 4, 5, 20, false, null);
            expect(data.hasNextLevel).toBe(false);
            expect(data.nextLevelId).toBeNull();
        });

        test('buildWinResult with world unlock', () => {
            const data = ctrl.buildWinResult('1-4', 3, 5, 5, 10, true, '2-1', true, '反弹进阶');
            expect(data.newWorldUnlocked).toBe(true);
            expect(data.newWorldName).toBe('反弹进阶');
        });

        test('buildWinResult defaults to no world unlock', () => {
            const data = ctrl.buildWinResult('1-1', 1, 3, 5, 10, true, '1-2');
            expect(data.newWorldUnlocked).toBe(false);
            expect(data.newWorldName).toBeNull();
        });

        test('getLastWinResult returns last built data', () => {
            ctrl.buildWinResult('1-1', 2, 4, 5, 10, true, '1-2');
            const last = ctrl.getLastWinResult();
            expect(last).not.toBeNull();
            expect(last!.levelId).toBe('1-1');
            expect(last!.stars).toBe(2);
        });

        test('getLastWinResult returns null before build', () => {
            expect(ctrl.getLastWinResult()).toBeNull();
        });

        test('getLastWinResult updates on successive builds', () => {
            ctrl.buildWinResult('1-1', 1, 3, 5, 10, true, '1-2');
            ctrl.buildWinResult('1-2', 2, 4, 5, 15, true, '1-3');
            expect(ctrl.getLastWinResult()!.levelId).toBe('1-2');
        });
    });

    // ============================================================
    // Lose result
    // ============================================================

    describe('lose result', () => {
        let ctrl: OverlayController;

        beforeEach(() => {
            ctrl = new OverlayController();
        });

        test('buildLoseResult returns correct data', () => {
            const data = ctrl.buildLoseResult('1-1', 3, 5);
            expect(data.levelId).toBe('1-1');
            expect(data.lightPointsCollected).toBe(3);
            expect(data.lightPointsTotal).toBe(5);
            expect(data.starsEarned).toBe(0);
            expect(data.encourageText).toBeTruthy();
        });

        test('buildLoseResult with stars earned shows next button', () => {
            const data = ctrl.buildLoseResult('1-1', 3, 5, 1);
            expect(data.starsEarned).toBe(1);
            expect(data.showNextButton).toBe(true);
        });

        test('buildLoseResult with zero stars hides next button', () => {
            const data = ctrl.buildLoseResult('1-1', 2, 5, 0);
            expect(data.showNextButton).toBe(false);
        });

        test('buildLoseResult clamps stars to 0-3', () => {
            const data = ctrl.buildLoseResult('1-1', 5, 5, 5);
            expect(data.starsEarned).toBe(3);
        });

        test('buildLoseResult clamps negative stars to 0', () => {
            const data = ctrl.buildLoseResult('1-1', 0, 5, -2);
            expect(data.starsEarned).toBe(0);
        });

        test('encourage text is from the predefined list', () => {
            const texts = OverlayController.getEncourageTexts();
            const data = ctrl.buildLoseResult('1-1', 2, 5);
            expect(texts).toContain(data.encourageText);
        });

        test('getLastLoseResult returns last built data', () => {
            ctrl.buildLoseResult('1-1', 3, 5);
            const last = ctrl.getLastLoseResult();
            expect(last).not.toBeNull();
            expect(last!.levelId).toBe('1-1');
        });

        test('getLastLoseResult returns null before build', () => {
            expect(ctrl.getLastLoseResult()).toBeNull();
        });
    });

    // ============================================================
    // Encourage texts
    // ============================================================

    describe('encourage texts', () => {
        test('getEncourageTexts returns all 4 texts', () => {
            const texts = OverlayController.getEncourageTexts();
            expect(texts.length).toBe(4);
        });

        test('encourage texts are the expected phrases', () => {
            const texts = OverlayController.getEncourageTexts();
            expect(texts).toContain('再试一次吧！');
            expect(texts).toContain('差一点就成功了！');
            expect(texts).toContain('换个角度试试？');
            expect(texts).toContain('画线可以更有创意哦');
        });
    });

    // ============================================================
    // Reset
    // ============================================================

    describe('reset', () => {
        test('reset clears win and lose data', () => {
            const ctrl = new OverlayController();
            ctrl.buildWinResult('1-1', 3, 5, 5, 10, true, '1-2');
            ctrl.buildLoseResult('1-2', 2, 5);
            ctrl.reset();
            expect(ctrl.getLastWinResult()).toBeNull();
            expect(ctrl.getLastLoseResult()).toBeNull();
        });
    });
});
