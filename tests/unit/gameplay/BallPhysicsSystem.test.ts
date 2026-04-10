/**
 * BallPhysicsSystem.test.ts — Unit tests for BallPhysicsSystem.
 * GDD: design/gdd/ball-physics-system.md
 */

import { BallPhysicsSystem } from '../../../src/gameplay/BallPhysicsSystem';
import { BallPhase, Vec2 } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, eps: number = 0.01): boolean {
    return Math.abs(a - b) < eps;
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem state management', () => {
    test('starts in IDLE state', () => {
        const ball = new BallPhysicsSystem();
        expect(ball.getPhase()).toBe(BallPhase.IDLE);
    });

    test('launch transitions to MOVING', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 100, y: 200 });
        ball.launch(-90);
        expect(ball.getPhase()).toBe(BallPhase.MOVING);
    });

    test('launch only works from IDLE', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.launch(-45); // ignored
        expect(ball.getPhase()).toBe(BallPhase.MOVING);
    });

    test('pause transitions MOVING → PAUSED', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.pause();
        expect(ball.getPhase()).toBe(BallPhase.PAUSED);
    });

    test('resume transitions PAUSED → MOVING', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.pause();
        ball.resume();
        expect(ball.getPhase()).toBe(BallPhase.MOVING);
    });

    test('setOutOfBounds transitions to OUT_OF_BOUNDS', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.setOutOfBounds();
        expect(ball.getPhase()).toBe(BallPhase.OUT_OF_BOUNDS);
    });

    test('setCollected transitions to COLLECTED', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.setCollected();
        expect(ball.getPhase()).toBe(BallPhase.COLLECTED);
    });

    test('reset returns to IDLE', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.setOutOfBounds();
        ball.reset({ x: 100, y: 200 });
        expect(ball.getPhase()).toBe(BallPhase.IDLE);
        expect(ball.getPosition()).toEqual({ x: 100, y: 200 });
    });
});

// ---------------------------------------------------------------------------
// Launch velocity
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem launch', () => {
    test('launch at -90° (straight down) sets vx=0, vy=-300', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        const vel = ball.getVelocity();
        expect(approx(vel.x, 0)).toBe(true);
        expect(approx(vel.y, -300)).toBe(true);
    });

    test('launch at 0° (right) sets vx=300, vy=0', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(0);
        const vel = ball.getVelocity();
        expect(approx(vel.x, 300)).toBe(true);
        expect(approx(vel.y, 0)).toBe(true);
    });

    test('launch at 45° sets equal vx and vy', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(45);
        const vel = ball.getVelocity();
        expect(approx(vel.x, vel.y)).toBe(true);
        expect(approx(ball.getSpeed(), 300)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Physics tick
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem tick', () => {
    test('gravity increases downward velocity', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(0); // horizontal, no initial vy
        const vy0 = ball.getVelocity().y;

        ball.tick(1 / 60); // one frame at 60fps

        // vy should increase by gravity * dt = 980 * (1/60) ≈ 16.33
        expect(ball.getVelocity().y).toBeGreaterThan(vy0);
        expect(approx(ball.getVelocity().y - vy0, 980 / 60)).toBe(true);
    });

    test('position updates based on velocity', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(0); // vx=300, vy=0
        ball.tick(1);   // 1 second

        // After 1 second: x ≈ 300 (plus gravity effects on vy)
        expect(ball.getPosition().x).toBeGreaterThan(0);
    });

    test('tick in IDLE does nothing', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 100, y: 200 });
        ball.tick(1 / 60);
        expect(ball.getPosition()).toEqual({ x: 100, y: 200 });
    });

    test('tick in PAUSED does nothing', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 100, y: 200 });
        ball.launch(-90);
        ball.pause();
        ball.tick(1 / 60);
        expect(ball.getPosition()).toEqual({ x: 100, y: 200 });
    });

    test('tick with zero deltaTime is no-op', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.tick(0);
        // No movement
        expect(ball.getPosition()).toEqual({ x: 0, y: 0 });
    });
});

// ---------------------------------------------------------------------------
// Reflection
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem reflect', () => {
    test('reflect off horizontal surface (normal up) reverses vy', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90); // vx=0, vy=-300
        ball.reflect({ x: 0, y: 1 }, 1.0); // perfect bounce
        const vel = ball.getVelocity();
        expect(approx(vel.x, 0)).toBe(true);
        expect(approx(vel.y, 300)).toBe(true); // reversed
    });

    test('reflect off vertical surface (normal right) reverses vx', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(0); // vx=300, vy=0
        ball.reflect({ x: -1, y: 0 }, 1.0);
        const vel = ball.getVelocity();
        expect(approx(vel.x, -300)).toBe(true);
        expect(approx(vel.y, 0)).toBe(true);
    });

    test('reflect with restitution reduces speed', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.reflect({ x: 0, y: 1 }, 0.8);
        expect(approx(ball.getSpeed(), 240)).toBe(true); // 300 * 0.8
    });

    test('reflect triggers onBounce callback', () => {
        const ball = new BallPhysicsSystem();
        let bounced = false;
        ball.onBounce = () => { bounced = true; };
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        ball.reflect({ x: 0, y: 1 });
        expect(bounced).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Static computeReflection
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem.computeReflection', () => {
    test('perfect reflection off horizontal surface', () => {
        const result = BallPhysicsSystem.computeReflection(
            { x: 3, y: -4 },
            { x: 0, y: 1 },
            1.0,
        );
        expect(approx(result.x, 3)).toBe(true);
        expect(approx(result.y, 4)).toBe(true);
    });

    test('reflection with 0.5 restitution halves speed', () => {
        const result = BallPhysicsSystem.computeReflection(
            { x: 0, y: -100 },
            { x: 0, y: 1 },
            0.5,
        );
        expect(approx(result.x, 0)).toBe(true);
        expect(approx(result.y, 50)).toBe(true);
    });

    test('diagonal reflection is correct', () => {
        const result = BallPhysicsSystem.computeReflection(
            { x: 1, y: 1 },
            { x: 0, y: 1 },  // horizontal surface
            1.0,
        );
        // v = (1,1), n = (0,1), dot = 1
        // v' = (1, 1) - 2*1*(0,1) = (1, -1)
        expect(approx(result.x, 1)).toBe(true);
        expect(approx(result.y, -1)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Speed clamping
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem speed clamping', () => {
    test('speed is clamped to maxSpeed', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(0);
        // Speed = 300. Tick with large dt to let gravity accelerate
        // After many ticks, speed should not exceed 1500
        for (let i = 0; i < 1000; i++) {
            ball.tick(1 / 60);
        }
        expect(ball.getSpeed()).toBeLessThanOrEqual(1500 + 1); // small tolerance
    });
});

// ---------------------------------------------------------------------------
// Position/velocity queries
// ---------------------------------------------------------------------------

describe('BallPhysicsSystem queries', () => {
    test('getPosition returns copy', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 50, y: 100 });
        const pos1 = ball.getPosition();
        const pos2 = ball.getPosition();
        expect(pos1).toEqual(pos2);
        expect(pos1).not.toBe(pos2);
    });

    test('getVelocity returns copy', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        const vel1 = ball.getVelocity();
        const vel2 = ball.getVelocity();
        expect(vel1).toEqual(vel2);
        expect(vel1).not.toBe(vel2);
    });

    test('getSpeed returns correct magnitude', () => {
        const ball = new BallPhysicsSystem();
        ball.reset({ x: 0, y: 0 });
        ball.launch(-90);
        expect(approx(ball.getSpeed(), 300)).toBe(true);
    });
});
