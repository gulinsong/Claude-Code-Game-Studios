/**
 * BallPhysicsSystem.ts — Pure TypeScript ball physics simulation.
 *
 * Manages ball state (position, velocity, phase), applies gravity each tick,
 * handles reflection off surfaces, and enforces speed limits. The system
 * exposes a tick(deltaTime) method that the engine integration layer calls
 * each physics step.
 *
 * GDD: design/gdd/ball-physics-system.md
 * No engine dependencies — pure TypeScript.
 */

import { Vec2, BallPhase } from '../interfaces/GameInterfaces';
import { BALL_CONFIG } from '../config/GameConfig';

/**
 * BallPhysicsSystem simulates ball movement with gravity, speed clamping,
 * and reflection off collision surfaces.
 */
export class BallPhysicsSystem {
    // ----- Ball state -----
    private phase: BallPhase;
    private position: Vec2;
    private velocity: Vec2;

    // ----- Configuration -----
    private readonly gravity: number;
    private readonly maxSpeed: number;
    private readonly minSpeed: number;
    private readonly initialSpeed: number;
    private readonly restitution: number;

    // ----- Callbacks -----
    public onBounce: ((position: Vec2, normal: Vec2) => void) | null;

    constructor() {
        this.phase = BallPhase.IDLE;
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.gravity = BALL_CONFIG.GRAVITY;
        this.maxSpeed = BALL_CONFIG.MAX_SPEED;
        this.minSpeed = BALL_CONFIG.MIN_SPEED;
        this.initialSpeed = BALL_CONFIG.INITIAL_SPEED;
        this.restitution = BALL_CONFIG.RESTITUTION;
        this.onBounce = null;
    }

    // ===== Lifecycle =====

    /**
     * Place the ball at its spawn position. Call on level load/reset.
     */
    reset(spawnPosition: Vec2): void {
        this.phase = BallPhase.IDLE;
        this.position = { x: spawnPosition.x, y: spawnPosition.y };
        this.velocity = { x: 0, y: 0 };
    }

    /**
     * Launch the ball in a given direction.
     *
     * @param angleDeg - Launch angle in degrees. -90 = straight down (default).
     */
    launch(angleDeg: number = -90): void {
        if (this.phase !== BallPhase.IDLE) return;

        const rad = (angleDeg * Math.PI) / 180;
        this.velocity = {
            x: this.initialSpeed * Math.cos(rad),
            y: this.initialSpeed * Math.sin(rad),
        };
        this.phase = BallPhase.MOVING;
    }

    // ===== Physics step =====

    /**
     * Advance physics by one timestep.
     *
     * Applies gravity, integrates velocity into position, and clamps speed.
     * Only processes when phase is MOVING.
     *
     * @param deltaTime - Frame time in seconds.
     */
    tick(deltaTime: number): void {
        if (this.phase !== BallPhase.MOVING) return;
        if (deltaTime <= 0) return;

        // Apply gravity (positive Y = down in our coordinate system)
        this.velocity.y += this.gravity * deltaTime;

        // Clamp speed
        this.clampSpeed();

        // Integrate position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
    }

    // ===== Collision response =====

    /**
     * Reflect the ball's velocity off a surface with the given normal.
     *
     * Uses the formula: v' = v - 2*dot(v,n)*n, then applies restitution.
     *
     * @param normal   - Unit normal of the collision surface.
     * @param restitution - Override restitution (e.g., boundary uses 0.8).
     */
    reflect(normal: Vec2, restitution?: number): void {
        const rest = restitution ?? this.restitution;
        const dot = this.velocity.x * normal.x + this.velocity.y * normal.y;

        // v' = v - 2 * dot(v,n) * n
        this.velocity.x = (this.velocity.x - 2 * dot * normal.x) * rest;
        this.velocity.y = (this.velocity.y - 2 * dot * normal.y) * rest;

        if (this.onBounce) {
            this.onBounce({ x: this.position.x, y: this.position.y }, normal);
        }
    }

    // ===== State control =====

    /** Transition to PAUSED state, preserving velocity for resume. */
    pause(): void {
        if (this.phase === BallPhase.MOVING) {
            this.phase = BallPhase.PAUSED;
        }
    }

    /** Resume from PAUSED back to MOVING. */
    resume(): void {
        if (this.phase === BallPhase.PAUSED) {
            this.phase = BallPhase.MOVING;
        }
    }

    /** Mark the ball as out of bounds. Stops physics. */
    setOutOfBounds(): void {
        this.phase = BallPhase.OUT_OF_BOUNDS;
    }

    /** Mark the ball as collected (victory). Stops physics. */
    setCollected(): void {
        this.phase = BallPhase.COLLECTED;
    }

    // ===== Queries =====

    /** Get current ball phase. */
    getPhase(): BallPhase {
        return this.phase;
    }

    /** Get current position (copy). */
    getPosition(): Vec2 {
        return { x: this.position.x, y: this.position.y };
    }

    /** Get current velocity (copy). */
    getVelocity(): Vec2 {
        return { x: this.velocity.x, y: this.velocity.y };
    }

    /** Get current speed magnitude. */
    getSpeed(): number {
        return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    }

    // ===== Static utilities =====

    /**
     * Compute the reflection of a velocity vector off a surface normal.
     * Pure function for testing.
     *
     * @param velocity    Incoming velocity.
     * @param normal      Unit surface normal.
     * @param restitution Elasticity coefficient (0-1).
     * @returns Reflected velocity.
     */
    static computeReflection(velocity: Vec2, normal: Vec2, restitution: number = 1.0): Vec2 {
        const dot = velocity.x * normal.x + velocity.y * normal.y;
        return {
            x: (velocity.x - 2 * dot * normal.x) * restitution,
            y: (velocity.y - 2 * dot * normal.y) * restitution,
        };
    }

    // ===== Private =====

    /** Clamp speed to [minSpeed, maxSpeed] range. */
    private clampSpeed(): void {
        const speed = this.getSpeed();
        if (speed < 1e-8) return;

        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        } else if (speed < this.minSpeed) {
            const scale = this.minSpeed / speed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }
}
