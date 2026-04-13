/**
 * HUDController unit tests.
 *
 * Tests HUD data binding: line counting, light point tracking,
 * session time, and callback emission.
 */

import { HUDController } from '../../../src/ui/HUDController';

describe('HUDController', () => {

    // ============================================================
    // Lifecycle
    // ============================================================

    describe('lifecycle', () => {
        test('starts with zero values', () => {
            const hud = new HUDController();
            const data = hud.getData();
            expect(data.linesUsed).toBe(0);
            expect(data.linesRemaining).toBe(0);
            expect(data.lightPointsCollected).toBe(0);
            expect(data.lightPointsTotal).toBe(0);
        });

        test('startLevel initializes values', () => {
            const hud = new HUDController();
            hud.startLevel(3, 5);
            const data = hud.getData();
            expect(data.linesRemaining).toBe(3);
            expect(data.lightPointsTotal).toBe(5);
        });
    });

    // ============================================================
    // Line tracking
    // ============================================================

    describe('line tracking', () => {
        let hud: HUDController;
        let updates: number[];

        beforeEach(() => {
            hud = new HUDController();
            updates = [];
            hud.onHUDUpdate = () => updates.push(1);
            hud.startLevel(3, 5);
        });

        test('onLineCreated increments linesUsed', () => {
            hud.onLineCreated();
            expect(hud.getData().linesUsed).toBe(1);
            expect(hud.getData().linesRemaining).toBe(2);
        });

        test('multiple onLineCreated calls', () => {
            hud.onLineCreated();
            hud.onLineCreated();
            hud.onLineCreated();
            expect(hud.getData().linesUsed).toBe(3);
            expect(hud.getData().linesRemaining).toBe(0);
        });

        test('onLineRemoved decrements linesUsed', () => {
            hud.onLineCreated();
            hud.onLineCreated();
            hud.onLineRemoved();
            expect(hud.getData().linesUsed).toBe(1);
        });

        test('onLineRemoved does not go below zero', () => {
            hud.onLineRemoved();
            expect(hud.getData().linesUsed).toBe(0);
        });

        test('onLineCreated fires onHUDUpdate', () => {
            hud.onLineCreated();
            expect(updates.length).toBe(2); // 1 from startLevel + 1 from onLineCreated
        });

        test('onLineRemoved fires onHUDUpdate', () => {
            hud.onLineCreated();
            updates.length = 0;
            hud.onLineRemoved();
            expect(updates.length).toBe(1);
        });
    });

    // ============================================================
    // Light point tracking
    // ============================================================

    describe('light point tracking', () => {
        let hud: HUDController;

        beforeEach(() => {
            hud = new HUDController();
            hud.onHUDUpdate = () => {};
            hud.startLevel(3, 5);
        });

        test('onLightPointCollected increments count', () => {
            hud.onLightPointCollected();
            expect(hud.getData().lightPointsCollected).toBe(1);
        });

        test('collecting all light points', () => {
            for (let i = 0; i < 5; i++) {
                hud.onLightPointCollected();
            }
            expect(hud.getData().lightPointsCollected).toBe(5);
        });

        test('onLightPointCollected fires onHUDUpdate', () => {
            const updates: number[] = [];
            hud.onHUDUpdate = () => updates.push(1);
            hud.onLightPointCollected();
            expect(updates.length).toBe(1);
        });
    });

    // ============================================================
    // Session time
    // ============================================================

    describe('session time', () => {
        test('session time is zero before tracking', () => {
            const hud = new HUDController();
            expect(hud.getSessionTime()).toBe(0);
        });

        test('session time starts on startLevel', () => {
            const hud = new HUDController();
            hud.onHUDUpdate = () => {};
            hud.startLevel(3, 5);
            // Session time should be very small right after start
            expect(hud.getSessionTime()).toBeGreaterThanOrEqual(0);
            expect(hud.getSessionTime()).toBeLessThan(1);
        });

        test('session time is zero after stopTracking', () => {
            const hud = new HUDController();
            hud.onHUDUpdate = () => {};
            hud.startLevel(3, 5);
            hud.stopTracking();
            expect(hud.getSessionTime()).toBe(0);
        });

        test('getData includes session time', () => {
            const hud = new HUDController();
            hud.onHUDUpdate = () => {};
            hud.startLevel(3, 5);
            const data = hud.getData();
            expect(typeof data.sessionTime).toBe('number');
        });
    });

    // ============================================================
    // Callback emission
    // ============================================================

    describe('callback emission', () => {
        test('startLevel fires onHUDUpdate', () => {
            const hud = new HUDController();
            let count = 0;
            hud.onHUDUpdate = () => count++;
            hud.startLevel(3, 5);
            expect(count).toBe(1);
        });

        test('callback receives correct data', () => {
            const hud = new HUDController();
            let receivedData: any = null;
            hud.onHUDUpdate = (data) => receivedData = data;
            hud.startLevel(3, 5);
            hud.onLineCreated();
            expect(receivedData.linesUsed).toBe(1);
            expect(receivedData.linesRemaining).toBe(2);
        });

        test('no callback when not tracking', () => {
            const hud = new HUDController();
            let count = 0;
            hud.onHUDUpdate = () => count++;
            hud.onLineCreated(); // Not tracking
            expect(count).toBe(0);
        });
    });

    // ============================================================
    // Stop tracking
    // ============================================================

    describe('stop tracking', () => {
        test('updates are ignored after stopTracking', () => {
            const hud = new HUDController();
            let count = 0;
            hud.onHUDUpdate = () => count++;
            hud.startLevel(3, 5);
            hud.stopTracking();
            hud.onLineCreated();
            hud.onLightPointCollected();
            expect(hud.getData().linesUsed).toBe(0);
            expect(hud.getData().lightPointsCollected).toBe(0);
        });
    });

    // ============================================================
    // Reset
    // ============================================================

    describe('reset', () => {
        test('reset clears all values', () => {
            const hud = new HUDController();
            hud.onHUDUpdate = () => {};
            hud.startLevel(3, 5);
            hud.onLineCreated();
            hud.onLightPointCollected();
            hud.reset();
            const data = hud.getData();
            expect(data.linesUsed).toBe(0);
            expect(data.linesRemaining).toBe(0);
            expect(data.lightPointsCollected).toBe(0);
            expect(data.lightPointsTotal).toBe(0);
            expect(data.sessionTime).toBe(0);
        });
    });
});
