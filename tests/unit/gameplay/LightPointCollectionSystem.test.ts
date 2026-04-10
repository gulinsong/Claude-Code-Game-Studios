/**
 * LightPointCollectionSystem.test.ts — Unit tests for LightPointCollectionSystem.
 * GDD: design/gdd/light-point-collection-system.md
 */

import { LightPointCollectionSystem } from '../../../src/gameplay/LightPointCollectionSystem';
import { LightPointState, Vec2 } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function positions(count: number): Vec2[] {
    const pts: Vec2[] = [];
    for (let i = 0; i < count; i++) {
        pts.push({ x: i * 100, y: 200 });
    }
    return pts;
}

// ---------------------------------------------------------------------------
// Level lifecycle
// ---------------------------------------------------------------------------

describe('LightPointCollectionSystem lifecycle', () => {
    test('onLevelStart creates light points in IDLE state', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(3));
        expect(lp.getTotalCount()).toBe(3);
        expect(lp.getRemainingCount()).toBe(3);
        expect(lp.getCollectedCount()).toBe(0);
        expect(lp.isAllCollected()).toBe(false);
    });

    test('light points are assigned sequential IDs', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(3));
        expect(lp.getAllIds()).toEqual(['lightPoint_0', 'lightPoint_1', 'lightPoint_2']);
    });

    test('onLevelStart with empty positions warns but does not crash', () => {
        const lp = new LightPointCollectionSystem();
        expect(() => lp.onLevelStart([])).not.toThrow();
        expect(lp.getTotalCount()).toBe(0);
    });

    test('registers sensors for each light point', () => {
        const registered: Vec2[] = [];
        const lp = new LightPointCollectionSystem();
        lp.onRegisterSensor = (pos) => { registered.push(pos); return 'sensor'; };
        lp.onLevelStart(positions(2));
        expect(registered.length).toBe(2);
    });

    test('onLevelReset restores all to IDLE', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(3));
        lp.onBallCollectLightPoint('lightPoint_0');
        expect(lp.getCollectedCount()).toBe(1);

        lp.onLevelReset();
        expect(lp.getCollectedCount()).toBe(0);
        expect(lp.getLightPointState('lightPoint_0')).toBe(LightPointState.IDLE);
    });

    test('onSceneUnload clears everything', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(3));
        lp.onSceneUnload();
        expect(lp.getTotalCount()).toBe(0);
        expect(lp.getCollectedCount()).toBe(0);
        expect(lp.getAllIds()).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

describe('LightPointCollectionSystem collection', () => {
    let lp: LightPointCollectionSystem;
    let collected: string[];
    let effects: Vec2[];
    let sounds: number;

    beforeEach(() => {
        lp = new LightPointCollectionSystem();
        collected = [];
        effects = [];
        sounds = 0;
        lp.onLightPointCollected = (id) => collected.push(id);
        lp.onCollectEffect = (pos) => effects.push(pos);
        lp.onCollectSound = () => sounds++;
        lp.onRegisterSensor = () => 'sensor_id';
        lp.onLevelStart(positions(3));
    });

    test('collecting a light point increments count', () => {
        lp.onBallCollectLightPoint('lightPoint_0');
        expect(lp.getCollectedCount()).toBe(1);
        expect(lp.getRemainingCount()).toBe(2);
    });

    test('collection triggers callbacks', () => {
        lp.onBallCollectLightPoint('lightPoint_1');
        expect(collected).toEqual(['lightPoint_1']);
        expect(effects.length).toBe(1);
        expect(sounds).toBe(1);
    });

    test('collected light point transitions to DEAD', () => {
        lp.onBallCollectLightPoint('lightPoint_0');
        expect(lp.getLightPointState('lightPoint_0')).toBe(LightPointState.DEAD);
    });

    test('cannot collect the same light point twice', () => {
        lp.onBallCollectLightPoint('lightPoint_0');
        lp.onBallCollectLightPoint('lightPoint_0'); // ignored
        expect(lp.getCollectedCount()).toBe(1);
        expect(collected.length).toBe(1);
    });

    test('collecting all light points triggers isAllCollected', () => {
        lp.onBallCollectLightPoint('lightPoint_0');
        lp.onBallCollectLightPoint('lightPoint_1');
        lp.onBallCollectLightPoint('lightPoint_2');
        expect(lp.isAllCollected()).toBe(true);
    });

    test('unregisters sensor on collection', () => {
        let unregistered: string[] = [];
        lp.onUnregisterSensor = (id) => unregistered.push(id);
        lp.onBallCollectLightPoint('lightPoint_0');
        expect(unregistered).toEqual(['lightPoint_0']);
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('LightPointCollectionSystem edge cases', () => {
    test('unknown lightPointId is ignored', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(2));
        expect(() => lp.onBallCollectLightPoint('unknown')).not.toThrow();
        expect(lp.getCollectedCount()).toBe(0);
    });

    test('collection after game ended is ignored', () => {
        const collected: string[] = [];
        const lp = new LightPointCollectionSystem();
        lp.onLightPointCollected = (id) => collected.push(id);
        lp.onRegisterSensor = () => 's';
        lp.onLevelStart(positions(2));

        lp.setGameEnded();
        lp.onBallCollectLightPoint('lightPoint_0');
        expect(collected.length).toBe(0);
    });

    test('no callbacks set does not throw', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(1));
        expect(() => lp.onBallCollectLightPoint('lightPoint_0')).not.toThrow();
    });

    test('collection effect receives correct position', () => {
        const effectPositions: Vec2[] = [];
        const lp = new LightPointCollectionSystem();
        lp.onCollectEffect = (pos) => effectPositions.push(pos);
        lp.onRegisterSensor = () => 's';
        lp.onLevelStart([{ x: 42, y: 87 }]);

        lp.onBallCollectLightPoint('lightPoint_0');
        expect(effectPositions.length).toBe(1);
        expect(effectPositions[0]).toEqual({ x: 42, y: 87 });
    });
});

// ---------------------------------------------------------------------------
// Query methods
// ---------------------------------------------------------------------------

describe('LightPointCollectionSystem queries', () => {
    test('getLightPointState returns null for unknown ID', () => {
        const lp = new LightPointCollectionSystem();
        lp.onLevelStart(positions(1));
        expect(lp.getLightPointState('nonexistent')).toBeNull();
    });

    test('getLightPointState returns correct state', () => {
        const lp = new LightPointCollectionSystem();
        lp.onRegisterSensor = () => 's';
        lp.onLevelStart(positions(2));
        expect(lp.getLightPointState('lightPoint_0')).toBe(LightPointState.IDLE);
        lp.onBallCollectLightPoint('lightPoint_0');
        expect(lp.getLightPointState('lightPoint_0')).toBe(LightPointState.DEAD);
        expect(lp.getLightPointState('lightPoint_1')).toBe(LightPointState.IDLE);
    });
});
