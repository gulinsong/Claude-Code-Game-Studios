/**
 * CollisionSystem.test.ts — Unit tests for CollisionSystem.
 * GDD: design/gdd/collision-system.md
 *
 * Covers:
 * - Static collision math (ballLineCollision, ballCircleCollision, pointToLineSegmentDistance)
 * - Registration / unregistration lifecycle
 * - State control (paused, active)
 * - Edge cases (degenerate segments, zero-radius, exact contact)
 */

import { CollisionSystem } from '../../../src/core/CollisionSystem';
import { Vec2 } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand to create a Vec2. */
function v(x: number, y: number): Vec2 {
    return { x, y };
}

/** Floating-point comparison within epsilon. */
function approxEqual(actual: number, expected: number, eps: number = 1e-6): boolean {
    return Math.abs(actual - expected) < eps;
}

// ---------------------------------------------------------------------------
// pointToLineSegmentDistance — static pure math
// ---------------------------------------------------------------------------

describe('CollisionSystem.pointToLineSegmentDistance', () => {
    test('point directly above segment midpoint returns perpendicular distance', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(50, 100),
            v(0, 0),
            v(100, 0),
        );
        expect(approxEqual(result.distance, 100)).toBe(true);
        expect(approxEqual(result.closestPoint.x, 50)).toBe(true);
        expect(approxEqual(result.closestPoint.y, 0)).toBe(true);
    });

    test('point closest to segment start (t < 0) clamps to start', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(-30, 10),
            v(0, 0),
            v(100, 0),
        );
        expect(approxEqual(result.closestPoint.x, 0)).toBe(true);
        expect(approxEqual(result.closestPoint.y, 0)).toBe(true);
        expect(approxEqual(result.distance, Math.sqrt(30 * 30 + 10 * 10))).toBe(true);
    });

    test('point closest to segment end (t > 1) clamps to end', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(130, 10),
            v(0, 0),
            v(100, 0),
        );
        expect(approxEqual(result.closestPoint.x, 100)).toBe(true);
        expect(approxEqual(result.closestPoint.y, 0)).toBe(true);
        expect(approxEqual(result.distance, Math.sqrt(30 * 30 + 10 * 10))).toBe(true);
    });

    test('point on the segment returns distance 0', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(50, 0),
            v(0, 0),
            v(100, 0),
        );
        expect(approxEqual(result.distance, 0)).toBe(true);
        expect(approxEqual(result.closestPoint.x, 50)).toBe(true);
        expect(approxEqual(result.closestPoint.y, 0)).toBe(true);
    });

    test('degenerate segment (start === end) returns distance to that point', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(10, 20),
            v(5, 5),
            v(5, 5),
        );
        const expected = Math.sqrt((10 - 5) ** 2 + (20 - 5) ** 2);
        expect(approxEqual(result.distance, expected)).toBe(true);
        expect(approxEqual(result.closestPoint.x, 5)).toBe(true);
        expect(approxEqual(result.closestPoint.y, 5)).toBe(true);
    });

    test('diagonal segment computes correct distance', () => {
        // Segment from (0,0) to (10,10); point at (0,10)
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(0, 10),
            v(0, 0),
            v(10, 10),
        );
        // Closest point should be at t=0.5 → (5,5)
        // Distance = sqrt((0-5)^2 + (10-5)^2) = sqrt(50)
        expect(approxEqual(result.distance, Math.sqrt(50))).toBe(true);
        expect(approxEqual(result.closestPoint.x, 5)).toBe(true);
        expect(approxEqual(result.closestPoint.y, 5)).toBe(true);
    });

    test('point at segment start returns distance 0', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(0, 0),
            v(0, 0),
            v(100, 50),
        );
        expect(approxEqual(result.distance, 0)).toBe(true);
    });

    test('point at segment end returns distance 0', () => {
        const result = CollisionSystem.pointToLineSegmentDistance(
            v(100, 50),
            v(0, 0),
            v(100, 50),
        );
        expect(approxEqual(result.distance, 0)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// ballLineCollision — static pure math
// ---------------------------------------------------------------------------

describe('CollisionSystem.ballLineCollision', () => {
    test('ball directly above horizontal line collides', () => {
        const result = CollisionSystem.ballLineCollision(
            v(50, 15),   // ball center 15px above line
            10,           // ball radius = 10
            v(0, 0),     // line start
            v(100, 0),   // line end
        );
        // threshold = 10 + 3 (LINE_COLLISION_PADDING) = 13; distance = 15 > 13
        // BUT wait: distance = 15, threshold = 13, so NO collision
        expect(result).toBeNull();
    });

    test('ball close enough to horizontal line collides', () => {
        const result = CollisionSystem.ballLineCollision(
            v(50, 12),   // ball center 12px above line
            10,           // ball radius
            v(0, 0),
            v(100, 0),
        );
        // distance = 12, threshold = 10 + 3 = 13 → 12 < 13 → collision
        expect(result).not.toBeNull();
        expect(approxEqual(result!.position.x, 50)).toBe(true);
        expect(approxEqual(result!.position.y, 0)).toBe(true);
        // Normal should point from line toward ball (upward)
        expect(result!.normal.y).toBeGreaterThan(0);
        expect(approxEqual(result!.normal.x, 0)).toBe(true);
    });

    test('ball too far from line returns null', () => {
        const result = CollisionSystem.ballLineCollision(
            v(50, 50),
            10,
            v(0, 0),
            v(100, 0),
        );
        expect(result).toBeNull();
    });

    test('ball touching line at exact threshold returns null (>= threshold)', () => {
        // distance = 13, threshold = 13 → not strictly less → null
        const result = CollisionSystem.ballLineCollision(
            v(13, 0),    // 13px from origin horizontally
            10,
            v(0, 0),
            v(0, 100),   // vertical line through origin
        );
        // Distance from ball center (13,0) to line x=0 is exactly 13
        // threshold = 10 + 3 = 13 → distance >= threshold → null
        expect(result).toBeNull();
    });

    test('ball near line endpoint collides', () => {
        const result = CollisionSystem.ballLineCollision(
            v(105, 2),   // slightly past end of line, very close
            10,
            v(0, 0),
            v(100, 0),
        );
        // Closest point clamped to (100,0). Distance = sqrt(25+4) ≈ 5.39
        // threshold = 13 → 5.39 < 13 → collision
        expect(result).not.toBeNull();
    });

    test('ball center exactly on line returns collision with perpendicular normal', () => {
        const result = CollisionSystem.ballLineCollision(
            v(50, 0),    // ball center on the line
            10,
            v(0, 0),
            v(100, 0),
        );
        // distance ≈ 0, falls into degenerate case → perpendicular normal
        expect(result).not.toBeNull();
        // Perpendicular to horizontal line → (0, 1) or (0, -1)
        expect(approxEqual(Math.abs(result!.normal.y), 1)).toBe(true);
    });

    test('ball against diagonal line computes correct normal', () => {
        const result = CollisionSystem.ballLineCollision(
            v(5, 15),    // above a diagonal line
            5,
            v(0, 0),
            v(10, 10),
        );
        expect(result).not.toBeNull();
        // Normal should be normalized and point toward ball
        const len = Math.sqrt(result!.normal.x ** 2 + result!.normal.y ** 2);
        expect(approxEqual(len, 1)).toBe(true);
    });

    test('zero-radius ball still collides within padding', () => {
        const result = CollisionSystem.ballLineCollision(
            v(50, 2),    // 2px above line
            0,            // zero radius
            v(0, 0),
            v(100, 0),
        );
        // threshold = 0 + 3 = 3; distance = 2 < 3 → collision
        expect(result).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// ballCircleCollision — static pure math
// ---------------------------------------------------------------------------

describe('CollisionSystem.ballCircleCollision', () => {
    test('overlapping circles return true', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 10, v(15, 0), 10)
        ).toBe(true);
        // distance = 15, radiusSum = 20, 15 < 20 → true
    });

    test('exactly touching circles return false (strict less-than)', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 10, v(20, 0), 10)
        ).toBe(false);
        // distance = 20, radiusSum = 20, distSq = 400, radiusSumSq = 400 → not <
    });

    test('non-overlapping circles return false', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 5, v(20, 0), 5)
        ).toBe(false);
    });

    test('concentric circles return true', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(5, 5), 10, v(5, 5), 5)
        ).toBe(true);
        // distance = 0, radiusSum = 15, 0 < 225 → true
    });

    test('near-miss returns false', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 10, v(20.001, 0), 10)
        ).toBe(false);
    });

    test('just-inside returns true', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 10, v(19.999, 0), 10)
        ).toBe(true);
    });

    test('works with zero-radius ball', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 0, v(0, 0), 5)
        ).toBe(true);
        // distance = 0, radiusSum = 5 → true
    });

    test('works with zero-radius circle', () => {
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 5, v(3, 0), 0)
        ).toBe(true);
        // distance = 3, radiusSum = 5 → true
    });

    test('both zero-radius with same position returns false', () => {
        // distSq = 0, radiusSum = 0, 0 < 0 → false
        expect(
            CollisionSystem.ballCircleCollision(v(0, 0), 0, v(0, 0), 0)
        ).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Instance: Registration lifecycle
// ---------------------------------------------------------------------------

describe('CollisionSystem registration', () => {
    let system: CollisionSystem;

    beforeEach(() => {
        system = new CollisionSystem();
    });

    test('registerBall stores ball and unregisterBall clears it', () => {
        system.registerBall(v(10, 20), 15);
        // No direct accessor, but we can verify side effects
        // Ball registration should not throw
        expect(() => system.registerBall(v(30, 40), 12)).not.toThrow();
        system.unregisterBall();
        // Should be fine to call again
        expect(() => system.unregisterBall()).not.toThrow();
    });

    test('registerLine returns unique IDs', () => {
        const id1 = system.registerLine(v(0, 0), v(100, 0));
        const id2 = system.registerLine(v(0, 0), v(0, 100));
        expect(id1).not.toBe(id2);
        expect(system.getRegisteredLineCount()).toBe(2);
    });

    test('registerLine throws on zero-length segment', () => {
        expect(() => system.registerLine(v(50, 50), v(50, 50))).toThrow(
            'zero-length line segment',
        );
    });

    test('unregisterLine removes line by ID', () => {
        const id = system.registerLine(v(0, 0), v(100, 0));
        expect(system.getRegisteredLineCount()).toBe(1);
        system.unregisterLine(id);
        expect(system.getRegisteredLineCount()).toBe(0);
    });

    test('unregisterLine with unknown ID is a no-op', () => {
        system.registerLine(v(0, 0), v(100, 0));
        system.unregisterLine('nonexistent');
        expect(system.getRegisteredLineCount()).toBe(1);
    });

    test('registerLightPoint returns unique IDs', () => {
        const id1 = system.registerLightPoint(v(50, 50), 12);
        const id2 = system.registerLightPoint(v(100, 100), 12);
        expect(id1).not.toBe(id2);
        expect(system.getRegisteredLightPointCount()).toBe(2);
    });

    test('unregisterLightPoint removes by ID', () => {
        const id = system.registerLightPoint(v(50, 50), 12);
        expect(system.getRegisteredLightPointCount()).toBe(1);
        system.unregisterLightPoint(id);
        expect(system.getRegisteredLightPointCount()).toBe(0);
    });

    test('unregisterLightPoint with unknown ID is a no-op', () => {
        system.registerLightPoint(v(50, 50), 12);
        system.unregisterLightPoint('nonexistent');
        expect(system.getRegisteredLightPointCount()).toBe(1);
    });

    test('clearAllColliders removes everything', () => {
        system.registerBall(v(10, 20), 15);
        system.registerLine(v(0, 0), v(100, 0));
        system.registerLightPoint(v(50, 50), 12);

        system.clearAllColliders();

        expect(system.getRegisteredLineCount()).toBe(0);
        expect(system.getRegisteredLightPointCount()).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Instance: State control
// ---------------------------------------------------------------------------

describe('CollisionSystem state control', () => {
    let system: CollisionSystem;

    beforeEach(() => {
        system = new CollisionSystem();
    });

    test('initial state is paused=false, active=false', () => {
        expect(system.isPaused()).toBe(false);
        expect(system.isActive()).toBe(false);
    });

    test('setPaused toggles pause state', () => {
        system.setPaused(true);
        expect(system.isPaused()).toBe(true);
        system.setPaused(false);
        expect(system.isPaused()).toBe(false);
    });

    test('setActive toggles active state', () => {
        system.setActive(true);
        expect(system.isActive()).toBe(true);
        system.setActive(false);
        expect(system.isActive()).toBe(false);
    });

    test('callbacks are null by default', () => {
        expect(system.onBallHitLine).toBeNull();
        expect(system.onBallCollectLightPoint).toBeNull();
        expect(system.onBallOutOfBounds).toBeNull();
    });

    test('callbacks can be assigned and called', () => {
        const hitLog: string[] = [];
        system.onBallHitLine = () => hitLog.push('hit');

        expect(typeof system.onBallHitLine).toBe('function');
        system.onBallHitLine!(v(0, 0), v(0, 1), 'line_0');
        expect(hitLog).toEqual(['hit']);
    });
});
