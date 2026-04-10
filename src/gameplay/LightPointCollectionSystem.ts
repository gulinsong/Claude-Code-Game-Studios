/**
 * LightPointCollectionSystem.ts — Manages the lifecycle and collection of
 * light points within a level.
 *
 * Tracks per-light-point state (Spawning → Idle → Collecting → Dead),
 * registers sensors with the collision system, and notifies the game state
 * manager on collection.
 *
 * GDD: design/gdd/light-point-collection-system.md
 * No engine dependencies — pure TypeScript.
 */

import { Vec2, LightPointState } from '../interfaces/GameInterfaces';
import { LIGHT_POINT_CONFIG, BALL_CONFIG, COLLECTION_RADIUS } from '../config/GameConfig';

/** Internal light point tracking data. */
interface TrackedLightPoint {
    id: string;
    position: Vec2;
    state: LightPointState;
    /** Timestamp when collection started (for animation tracking). */
    collectStartTime: number;
}

/**
 * LightPointCollectionSystem manages all light points in the current level.
 */
export class LightPointCollectionSystem {
    /** All light points in the current level, keyed by ID. */
    private points: Map<string, TrackedLightPoint>;

    /** Number of light points collected this session. */
    private collectedCount: number;

    /** Total light points in this level. */
    private totalCount: number;

    /** Whether the game is in an ended state (VICTORY/DEFEAT). */
    private gameEnded: boolean;

    /** Collection trigger radius registered with collision system. */
    private collectionRadius: number;

    /** Callback: notify game state manager of collection. */
    public onLightPointCollected: ((lightPointId: string) => void) | null;

    /** Callback: request collect visual effect at position. */
    public onCollectEffect: ((position: Vec2) => void) | null;

    /** Callback: request collect sound. */
    public onCollectSound: (() => void) | null;

    /** Callback: register a light point sensor with the collision system. */
    public onRegisterSensor: ((position: Vec2, radius: number) => string) | null;

    /** Callback: unregister a light point sensor. */
    public onUnregisterSensor: ((lightPointId: string) => void) | null;

    constructor(collectionRadius: number = COLLECTION_RADIUS) {
        this.points = new Map();
        this.collectedCount = 0;
        this.totalCount = 0;
        this.gameEnded = false;
        this.collectionRadius = collectionRadius;
        this.onLightPointCollected = null;
        this.onCollectEffect = null;
        this.onCollectSound = null;
        this.onRegisterSensor = null;
        this.onUnregisterSensor = null;
    }

    // ===== Level lifecycle =====

    /**
     * Initialize light points for a new level.
     *
     * @param positions - Array of normalized or pixel positions for each light point.
     */
    onLevelStart(positions: Vec2[]): void {
        this.clearAll();

        if (positions.length === 0) {
            console.warn('[LightPointCollectionSystem] Level has 0 light points — cannot win.');
            return;
        }

        this.totalCount = positions.length;

        for (let i = 0; i < positions.length; i++) {
            const id = `lightPoint_${i}`;
            const pos: Vec2 = { x: positions[i].x, y: positions[i].y };

            this.points.set(id, {
                id,
                position: pos,
                state: LightPointState.SPAWNING,
                collectStartTime: 0,
            });

            // Register sensor with collision system
            if (this.onRegisterSensor) {
                this.onRegisterSensor(pos, this.collectionRadius);
            }
        }

        // Transition all to IDLE after spawn (in real engine, this would wait
        // for spawn animation; here we transition immediately for logic purposes)
        this.transitionAllToIdle();
    }

    /**
     * Reset all light points for level restart.
     */
    onLevelReset(): void {
        this.collectedCount = 0;
        this.gameEnded = false;

        this.points.forEach((point) => {
            point.state = LightPointState.SPAWNING;
            point.collectStartTime = 0;

            // Re-register sensor
            if (this.onRegisterSensor) {
                this.onRegisterSensor(point.position, this.collectionRadius);
            }
        });

        this.transitionAllToIdle();
    }

    /**
     * Clean up all light points on scene unload.
     */
    onSceneUnload(): void {
        this.clearAll();
    }

    // ===== Collection =====

    /**
     * Called by the collision system when the ball enters a light point sensor.
     *
     * Validates the light point is in a collectible state before processing.
     *
     * @param lightPointId - ID of the triggered light point.
     */
    onBallCollectLightPoint(lightPointId: string): void {
        if (this.gameEnded) return;

        const point = this.points.get(lightPointId);
        if (!point) {
            console.warn(`[LightPointCollectionSystem] Unknown lightPointId: "${lightPointId}"`);
            return;
        }

        if (point.state !== LightPointState.IDLE) {
            return; // Already collecting or dead — ignore
        }

        // Collect
        point.state = LightPointState.COLLECTING;
        point.collectStartTime = Date.now();
        this.collectedCount++;

        // Unregister sensor to prevent duplicate triggers
        if (this.onUnregisterSensor) {
            this.onUnregisterSensor(lightPointId);
        }

        // Notify game state manager
        if (this.onLightPointCollected) {
            this.onLightPointCollected(lightPointId);
        }

        // Request visual effect
        if (this.onCollectEffect) {
            this.onCollectEffect(point.position);
        }

        // Request audio
        if (this.onCollectSound) {
            this.onCollectSound();
        }

        // Transition to DEAD immediately (in real engine, this would wait
        // for the 0.4s collection animation; the engine layer tracks that)
        point.state = LightPointState.DEAD;
    }

    /**
     * Mark the game as ended (VICTORY or DEFEAT).
     * Subsequent collection events are ignored.
     */
    setGameEnded(): void {
        this.gameEnded = true;
    }

    // ===== Queries =====

    /** Get the number of collected light points. */
    getCollectedCount(): number {
        return this.collectedCount;
    }

    /** Get the total number of light points. */
    getTotalCount(): number {
        return this.totalCount;
    }

    /** Get remaining light points. */
    getRemainingCount(): number {
        return this.totalCount - this.collectedCount;
    }

    /** Check if all light points have been collected. */
    isAllCollected(): boolean {
        return this.totalCount > 0 && this.collectedCount >= this.totalCount;
    }

    /** Get the state of a specific light point. */
    getLightPointState(id: string): LightPointState | null {
        const point = this.points.get(id);
        return point ? point.state : null;
    }

    /** Get all light point IDs. */
    getAllIds(): string[] {
        return Array.from(this.points.keys());
    }

    // ===== Private =====

    private transitionAllToIdle(): void {
        this.points.forEach((point) => {
            if (point.state === LightPointState.SPAWNING) {
                point.state = LightPointState.IDLE;
            }
        });
    }

    private clearAll(): void {
        // Unregister all sensors
        if (this.onUnregisterSensor) {
            this.points.forEach((point, id) => {
                this.onUnregisterSensor!(id);
            });
        }

        this.points.clear();
        this.collectedCount = 0;
        this.totalCount = 0;
        this.gameEnded = false;
    }
}
