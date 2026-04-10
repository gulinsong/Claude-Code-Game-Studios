/**
 * CollisionSystem.ts — Pure-logic collision registration and detection system.
 *
 * Manages registered colliders (ball, lines, light points) and provides static
 * math helpers for ball-line and ball-circle collision tests. This layer has no
 * dependency on a physics engine; the Cocos Creator integration layer wires the
 * registration calls to Box2D colliders and forwards engine callbacks here.
 *
 * GDD: design/gdd/collision-system.md
 */

import { Vec2, CollisionEvent } from '../interfaces/GameInterfaces';
import { COLLISION_CONFIG } from '../config/GameConfig';

// ===== Internal registration shapes =====

interface RegisteredLine {
    lineId: string;
    start: Vec2;
    end: Vec2;
}

interface RegisteredLightPoint {
    lightPointId: string;
    position: Vec2;
    radius: number;
}

interface RegisteredBall {
    position: Vec2;
    radius: number;
}

// ===== Collision padding (px) added to ball radius for line detection =====
const LINE_COLLISION_PADDING = COLLISION_CONFIG.LINE_COLLISION_PADDING;

// ===== ID counters =====
let nextLineId = 0;
let nextLightPointId = 0;

/**
 * CollisionSystem manages collider registration and provides pure-math collision
 * detection. Instance methods handle state (active/paused, registered objects);
 * static methods are stateless math utilities suitable for unit testing.
 */
export class CollisionSystem {
    // ----- Registered objects -----
    private ball: RegisteredBall | null;
    private lines: Map<string, RegisteredLine>;
    private lightPoints: Map<string, RegisteredLightPoint>;

    // ----- System state -----
    private paused: boolean;
    private active: boolean;

    // ----- Event callbacks (set by the game systems) -----
    public onBallHitLine: ((position: Vec2, normal: Vec2, lineId: string) => void) | null;
    public onBallCollectLightPoint: ((lightPointId: string) => void) | null;
    public onBallOutOfBounds: (() => void) | null;

    constructor() {
        this.ball = null;
        this.lines = new Map();
        this.lightPoints = new Map();
        this.paused = false;
        this.active = false;
        this.onBallHitLine = null;
        this.onBallCollectLightPoint = null;
        this.onBallOutOfBounds = null;
    }

    // ========== Registration ==========

    /**
     * Register the ball collider. Only one ball can be active at a time;
     * calling this again replaces the previous registration.
     */
    registerBall(position: Vec2, radius: number): void {
        this.ball = { position: { x: position.x, y: position.y }, radius };
    }

    /** Remove the ball from collision detection. */
    unregisterBall(): void {
        this.ball = null;
    }

    /**
     * Register a line segment for collision detection.
     * @returns A unique lineId string, or throws if start equals end (zero-length line).
     */
    registerLine(start: Vec2, end: Vec2): string {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if (dx === 0 && dy === 0) {
            throw new Error('Cannot register a zero-length line segment');
        }
        const lineId = `line_${nextLineId++}`;
        this.lines.set(lineId, {
            lineId,
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
        });
        return lineId;
    }

    /** Remove a line segment from collision detection. No-op if the id is not found. */
    unregisterLine(lineId: string): void {
        this.lines.delete(lineId);
    }

    /**
     * Register a light point (sensor) for collection detection.
     * @returns A unique lightPointId string.
     */
    registerLightPoint(position: Vec2, radius: number): string {
        const lightPointId = `lp_${nextLightPointId++}`;
        this.lightPoints.set(lightPointId, {
            lightPointId,
            position: { x: position.x, y: position.y },
            radius,
        });
        return lightPointId;
    }

    /** Remove a light point from detection. No-op if the id is not found. */
    unregisterLightPoint(lightPointId: string): void {
        this.lightPoints.delete(lightPointId);
    }

    // ========== State control ==========

    /** Pause or resume collision callback processing. */
    setPaused(paused: boolean): void {
        this.paused = paused;
    }

    /** Activate or deactivate the entire collision system (e.g. on scene transitions). */
    setActive(active: boolean): void {
        this.active = active;
    }

    // ========== Cleanup ==========

    /** Remove all registered colliders (lines, light points, ball). */
    clearAllColliders(): void {
        this.lines.clear();
        this.lightPoints.clear();
        this.ball = null;
    }

    // ========== Queries ==========

    /** Number of currently registered line segments. */
    getRegisteredLineCount(): number {
        return this.lines.size;
    }

    /** Number of currently registered light points. */
    getRegisteredLightPointCount(): number {
        return this.lightPoints.size;
    }

    /** Whether the system is currently paused. */
    isPaused(): boolean {
        return this.paused;
    }

    /** Whether the system is currently active. */
    isActive(): boolean {
        return this.active;
    }

    // ========== Static collision math (pure functions, testable) ==========

    /**
     * Test collision between a ball and a line segment.
     *
     * Computes the closest point on the segment to the ball center. If the
     * distance is less than `ballRadius + LINE_COLLISION_PADDING`, a
     * {@link CollisionEvent} is returned with the contact position and the
     * surface normal (perpendicular to the segment, pointing toward the ball).
     * Returns `null` when there is no collision.
     *
     * @param ballPos    Center of the ball.
     * @param ballRadius Radius of the ball collider.
     * @param lineStart  Start point of the line segment.
     * @param lineEnd    End point of the line segment.
     */
    static ballLineCollision(
        ballPos: Vec2,
        ballRadius: number,
        lineStart: Vec2,
        lineEnd: Vec2,
    ): CollisionEvent | null {
        const { distance, closestPoint } = CollisionSystem.pointToLineSegmentDistance(
            ballPos,
            lineStart,
            lineEnd,
        );

        const threshold = ballRadius + LINE_COLLISION_PADDING;
        if (distance >= threshold) {
            return null;
        }

        // Guard against degenerate case where ball center is exactly on the line
        if (distance < 1e-8) {
            // Fall back to the segment's perpendicular direction
            const segDx = lineEnd.x - lineStart.x;
            const segDy = lineEnd.y - lineStart.y;
            const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
            if (segLen < 1e-8) {
                return null;
            }
            // Perpendicular (rotate 90 degrees counter-clockwise)
            const normal: Vec2 = { x: -segDy / segLen, y: segDx / segLen };
            return { position: { x: closestPoint.x, y: closestPoint.y }, normal };
        }

        const invDist = 1 / distance;
        const normal: Vec2 = {
            x: (ballPos.x - closestPoint.x) * invDist,
            y: (ballPos.y - closestPoint.y) * invDist,
        };

        return {
            position: { x: closestPoint.x, y: closestPoint.y },
            normal,
        };
    }

    /**
     * Test collision between a ball and a circle (e.g. light point trigger).
     *
     * @returns `true` when the distance between centers is strictly less than
     *          the sum of `ballRadius` and `circleRadius`.
     */
    static ballCircleCollision(
        ballPos: Vec2,
        ballRadius: number,
        circlePos: Vec2,
        circleRadius: number,
    ): boolean {
        const dx = ballPos.x - circlePos.x;
        const dy = ballPos.y - circlePos.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = ballRadius + circleRadius;
        return distSq < radiusSum * radiusSum;
    }

    /**
     * Compute the shortest distance from a point to a finite line segment,
     * along with the closest point on that segment.
     *
     * Algorithm: project the point onto the infinite line through the segment
     * endpoints, then clamp the parameter `t` to [0, 1] to stay within the
     * segment.
     *
     * @param point     The query point (e.g. ball center).
     * @param lineStart Segment start.
     * @param lineEnd   Segment end.
     * @returns An object with `distance` (always >= 0) and `closestPoint`.
     */
    static pointToLineSegmentDistance(
        point: Vec2,
        lineStart: Vec2,
        lineEnd: Vec2,
    ): { distance: number; closestPoint: Vec2 } {
        const segDx = lineEnd.x - lineStart.x;
        const segDy = lineEnd.y - lineStart.y;
        const segLenSq = segDx * segDx + segDy * segDy;

        // Degenerate segment (zero length) — distance to the point itself
        if (segLenSq < 1e-12) {
            const dx = point.x - lineStart.x;
            const dy = point.y - lineStart.y;
            return {
                distance: Math.sqrt(dx * dx + dy * dy),
                closestPoint: { x: lineStart.x, y: lineStart.y },
            };
        }

        // Project point onto the line defined by the segment, parameterized by t in [0,1]
        const t =
            ((point.x - lineStart.x) * segDx + (point.y - lineStart.y) * segDy) / segLenSq;

        const clampedT = Math.max(0, Math.min(1, t));

        const closestPoint: Vec2 = {
            x: lineStart.x + clampedT * segDx,
            y: lineStart.y + clampedT * segDy,
        };

        const dx = point.x - closestPoint.x;
        const dy = point.y - closestPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return { distance, closestPoint };
    }
}
