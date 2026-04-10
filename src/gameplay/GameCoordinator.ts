/**
 * GameCoordinator.ts — Top-level integration layer that wires all game systems
 * together and drives the per-frame game loop.
 *
 * Owns system instances, connects callbacks, manages the level lifecycle
 * (start, pause, resume, restart, end), and routes engine-level events
 * (collisions, input) to the correct subsystems.
 *
 * Collision detection is delegated to Box2D in the engine layer; the
 * coordinator receives collision callbacks and routes them to the right systems.
 * This keeps the coordinator a thin orchestration layer.
 *
 * No engine dependencies — pure TypeScript.
 *
 * GDD: design/gdd/game-state-management.md (orchestration)
 */

import { Vec2, GamePhase, BallPhase } from '../interfaces/GameInterfaces';
import { BALL_CONFIG } from '../config/GameConfig';

import { GameStateManager } from '../core/GameStateManager';
import { CollisionSystem } from '../core/CollisionSystem';
import { BoundarySystem } from '../core/BoundarySystem';
import { OutOfBoundsDetectionSystem } from '../core/OutOfBoundsDetectionSystem';
import { InputSystem, TouchData } from '../foundation/InputSystem';
import { BallPhysicsSystem } from '../gameplay/BallPhysicsSystem';
import { LineBounceSystem } from '../gameplay/LineBounceSystem';
import { LightPointCollectionSystem } from '../gameplay/LightPointCollectionSystem';
import { LevelSystem } from '../gameplay/LevelSystem';
import { StarRatingCalculator } from '../gameplay/StarRatingCalculator';
import { LevelData } from '../interfaces/GameInterfaces';

/** Level initialization options. */
export interface LevelStartOptions {
    levelData: LevelData;
    screenWidth: number;
    screenHeight: number;
    safeAreaTop?: number;
    safeAreaBottom?: number;
}

/**
 * GameCoordinator wires all pure-logic systems together and drives the
 * per-frame simulation. It does not own rendering or audio — those
 * are handled through external callbacks the engine adapter registers.
 */
export class GameCoordinator {
    // ===== Sub-systems (public for test access) =====
    public readonly gameState: GameStateManager;
    public readonly collision: CollisionSystem;
    public readonly boundary: BoundarySystem;
    public readonly oobDetection: OutOfBoundsDetectionSystem;
    public readonly input: InputSystem;
    public readonly ball: BallPhysicsSystem;
    public readonly lines: LineBounceSystem;
    public readonly lightPoints: LightPointCollectionSystem;
    public readonly levelSystem: LevelSystem;

    // ===== External callbacks (engine adapter sets these) =====

    /** Request a visual effect at a position. */
    public onVisualEffect: ((type: string, position: Vec2, extra?: unknown) => void) | null;

    /** Play a sound by ID. */
    public onPlaySound: ((soundId: string) => void) | null;

    /** Start background music. */
    public onPlayMusic: ((musicId: string) => void) | null;

    /** Stop background music. */
    public onStopMusic: (() => void) | null;

    /** Push updated HUD data. */
    public onHUDUpdate: ((data: {
        linesUsed: number;
        linesRemaining: number;
        collected: number;
        total: number;
        time: number;
    }) => void) | null;

    /** Victory event with star count and completion time. */
    public onVictory: ((stars: number, time: number) => void) | null;

    /** Defeat event. */
    public onDefeat: (() => void) | null;

    // ===== Internal state =====
    private currentLevelData: LevelData | null;
    private initialized: boolean;

    constructor() {
        this.gameState = new GameStateManager();
        this.collision = new CollisionSystem();
        this.boundary = new BoundarySystem();
        this.oobDetection = new OutOfBoundsDetectionSystem();
        this.input = new InputSystem();
        this.ball = new BallPhysicsSystem();
        this.lines = new LineBounceSystem();
        this.lightPoints = new LightPointCollectionSystem();
        this.levelSystem = new LevelSystem();

        this.onVisualEffect = null;
        this.onPlaySound = null;
        this.onPlayMusic = null;
        this.onStopMusic = null;
        this.onHUDUpdate = null;
        this.onVictory = null;
        this.onDefeat = null;

        this.currentLevelData = null;
        this.initialized = false;

        this.wireCallbacks();
    }

    // ================================================================
    // Level lifecycle
    // ================================================================

    /**
     * Start a new level. Initializes all subsystems with level data.
     */
    startLevel(opts: LevelStartOptions): void {
        const { levelData, screenWidth, screenHeight, safeAreaTop, safeAreaBottom } = opts;
        this.currentLevelData = levelData;

        // Convert normalized coordinates to pixel positions
        const ballSpawn: Vec2 = {
            x: levelData.ball.spawn.x * screenWidth,
            y: levelData.ball.spawn.y * screenHeight,
        };
        const lpPositions: Vec2[] = levelData.lightPoints.map(lp => ({
            x: lp.x * screenWidth,
            y: lp.y * screenHeight,
        }));

        // Initialize boundary
        this.boundary.initialize(screenWidth, screenHeight, safeAreaTop ?? 0, safeAreaBottom ?? 0);

        // Reset subsystems
        this.ball.reset(ballSpawn);
        this.lines.reset(levelData.maxLines);
        this.oobDetection.reset();
        this.collision.clearAllColliders();
        this.collision.setActive(true);
        this.collision.setPaused(false);

        // Register ball with collision system
        this.collision.registerBall(ballSpawn, BALL_CONFIG.COLLIDER_RADIUS);

        // Initialize game state
        this.gameState.onLevelStart(levelData.id, {
            levelId: levelData.id,
            maxLines: levelData.maxLines,
            lightPointCount: levelData.lightPoints.length,
            timeLimit: levelData.timeLimit,
        });

        // Initialize light points
        this.lightPoints.onLevelStart(lpPositions);

        // Enable input
        this.input.setCanDraw(true);
        this.input.setPaused(false);

        this.initialized = true;

        if (this.onPlayMusic) {
            this.onPlayMusic('gameplay');
        }

        this.notifyHUD();
    }

    /**
     * Launch the ball, transitioning READY → PLAYING.
     */
    launchBall(angleDeg: number = -90): void {
        if (!this.initialized) return;
        if (this.gameState.getCurrentPhase() !== GamePhase.READY) return;

        this.gameState.setState(GamePhase.PLAYING);
        this.ball.launch(angleDeg);
    }

    /** Pause the game. */
    pause(): void {
        if (this.gameState.getCurrentPhase() !== GamePhase.PLAYING) return;

        this.gameState.pause();
        this.ball.pause();
        this.input.setPaused(true);
        this.collision.setPaused(true);
    }

    /** Resume from pause. */
    resume(): void {
        if (this.gameState.getCurrentPhase() !== GamePhase.PAUSED) return;

        this.gameState.resume();
        this.ball.resume();
        this.input.setPaused(false);
        this.collision.setPaused(false);
    }

    /** Restart the current level. */
    restartLevel(): void {
        if (!this.currentLevelData) return;
        const edges = this.boundary.getEdges();
        if (!edges) return;

        const padding = 20;
        const screenWidth = edges.right + padding;
        const screenHeight = edges.top + padding;

        this.lightPoints.setGameEnded();
        this.startLevel({
            levelData: this.currentLevelData,
            screenWidth,
            screenHeight,
        });
    }

    // ================================================================
    // Per-frame update
    // ================================================================

    /**
     * Advance the game simulation by one frame.
     *
     * Updates ball physics and session time. Collision detection is handled
     * by the engine layer (Box2D), which calls `onEngineBallHitLine`,
     * `onEngineBallCollectLightPoint`, and `onEngineBallOutOfBounds`.
     *
     * @param deltaTime Frame time in seconds.
     */
    tick(deltaTime: number): void {
        if (!this.initialized) return;
        if (this.gameState.getCurrentPhase() !== GamePhase.PLAYING) return;

        // 1. Advance ball physics
        this.ball.tick(deltaTime);

        // 2. Update ball position in collision system
        this.collision.registerBall(this.ball.getPosition(), BALL_CONFIG.COLLIDER_RADIUS);

        // 3. Check boundary violations (walls)
        this.checkBoundaryBounces();

        // 4. Update session time
        this.gameState.updateSessionTime(deltaTime);

        // 5. Notify HUD
        this.notifyHUD();
    }

    // ================================================================
    // Engine collision callbacks
    // ================================================================

    /**
     * Called by engine adapter when Box2D detects ball-line contact.
     *
     * @param position Contact point.
     * @param normal   Surface normal at contact.
     * @param lineId   ID of the line that was hit.
     */
    onEngineBallHitLine(position: Vec2, normal: Vec2, lineId: string): void {
        if (this.gameState.getCurrentPhase() !== GamePhase.PLAYING) return;

        // Reflect ball velocity
        this.ball.reflect(normal);

        // Lock the line and trigger effects
        this.lines.onBallHitLine(position, normal, lineId);

        if (this.onPlaySound) {
            this.onPlaySound('bounce');
        }
    }

    /**
     * Called by engine adapter when Box2D detects ball-lightpoint overlap.
     *
     * @param lightPointId ID of the light point sensor triggered.
     */
    onEngineBallCollectLightPoint(lightPointId: string): void {
        if (this.gameState.getCurrentPhase() !== GamePhase.PLAYING) return;

        this.lightPoints.onBallCollectLightPoint(lightPointId);

        // Check if this collection triggers victory
        this.checkVictory();
    }

    /**
     * Called by engine adapter when the ball passes through the bottom sensor.
     */
    onEngineBallOutOfBounds(): void {
        if (this.gameState.getCurrentPhase() !== GamePhase.PLAYING) return;

        // Victory priority: if all collected in same frame, win overrides lose
        if (this.gameState.hasPendingVictory()) return;

        this.oobDetection.onBallOutOfBounds();
    }

    // ================================================================
    // Input forwarding
    // ================================================================

    handleTouchStart(touch: TouchData): void { this.input.onTouchStart(touch); }
    handleTouchMove(touch: TouchData): void { this.input.onTouchMove(touch); }
    handleTouchEnd(touch: TouchData): void { this.input.onTouchEnd(touch); }
    handleTouchCancel(): void { this.input.onTouchCancel(); }

    // ================================================================
    // Cleanup
    // ================================================================

    /** Tear down all systems. Call on scene unload. */
    destroy(): void {
        this.boundary.destroy();
        this.oobDetection.destroy();
        this.collision.clearAllColliders();
        this.lightPoints.onSceneUnload();
        this.initialized = false;

        if (this.onStopMusic) {
            this.onStopMusic();
        }
    }

    // ================================================================
    // Callback wiring
    // ================================================================

    private wireCallbacks(): void {
        // --- Input → Lines ---
        this.input.onLineConfirmed = (start: Vec2, end: Vec2) => {
            if (!this.gameState.canDrawLine()) return;
            const lineId = this.lines.createLine(start, end);
            if (lineId) {
                this.gameState.onLineDrawn();
                this.input.setCanDraw(this.gameState.canDrawLine());
            }
        };

        this.input.onPreviewUpdate = (start: Vec2, end: Vec2) => {
            if (this.onVisualEffect) {
                this.onVisualEffect('preview_line', start, end);
            }
        };

        this.input.onPreviewHide = () => {
            if (this.onVisualEffect) {
                this.onVisualEffect('hide_preview', { x: 0, y: 0 });
            }
        };

        this.input.onLineRejected = () => {
            if (this.onPlaySound) {
                this.onPlaySound('line_reject');
            }
        };

        // --- Lines → Collision ---
        this.lines.onRegisterLine = (start: Vec2, end: Vec2): string => {
            return this.collision.registerLine(start, end);
        };

        this.lines.onUnregisterLine = (lineId: string) => {
            this.collision.unregisterLine(lineId);
        };

        // --- Lines → Visual/Audio ---
        this.lines.onShowConfirmedLine = (start: Vec2, end: Vec2, _lineId: string) => {
            if (this.onVisualEffect) {
                this.onVisualEffect('confirmed_line', start, end);
            }
        };

        this.lines.onHideLine = (_lineId: string) => {
            // Engine layer handles actual node removal
        };

        this.lines.onBounceEffect = (position: Vec2) => {
            if (this.onVisualEffect) {
                this.onVisualEffect('bounce', position);
            }
        };

        this.lines.onPlaySound = (soundId: string) => {
            if (this.onPlaySound) {
                this.onPlaySound(soundId);
            }
        };

        this.lines.onLineCountChanged = (_used: number, _remaining: number) => {
            this.notifyHUD();
        };

        // --- Light Points → Collision ---
        this.lightPoints.onRegisterSensor = (position: Vec2, radius: number): string => {
            return this.collision.registerLightPoint(position, radius);
        };

        this.lightPoints.onUnregisterSensor = (lightPointId: string) => {
            this.collision.unregisterLightPoint(lightPointId);
        };

        // --- Light Points → Game State ---
        this.lightPoints.onLightPointCollected = (lightPointId: string) => {
            this.gameState.onLightPointCollected(lightPointId);
        };

        // --- Light Points → Visual/Audio ---
        this.lightPoints.onCollectEffect = (position: Vec2) => {
            if (this.onVisualEffect) {
                this.onVisualEffect('collect', position);
            }
        };

        this.lightPoints.onCollectSound = () => {
            if (this.onPlaySound) {
                this.onPlaySound('collect');
            }
        };

        // --- OOB → Defeat ---
        this.oobDetection.onTriggered = () => {
            if (this.gameState.hasPendingVictory()) return;

            this.ball.setOutOfBounds();
            this.lightPoints.setGameEnded();
            this.gameState.setState(GamePhase.DEFEAT);

            if (this.onPlaySound) {
                this.onPlaySound('lose');
            }
            if (this.onDefeat) {
                this.onDefeat();
            }
        };
    }

    // ================================================================
    // Internal helpers
    // ================================================================

    /** Check and handle boundary wall bounces. */
    private checkBoundaryBounces(): void {
        const pos = this.ball.getPosition();
        const r = BALL_CONFIG.COLLIDER_RADIUS;
        const edges = this.boundary.getEdges();
        if (!edges) return;

        if (pos.x - r < edges.left) {
            this.ball.reflect({ x: 1, y: 0 });
            if (this.onPlaySound) this.onPlaySound('bounce');
        } else if (pos.x + r > edges.right) {
            this.ball.reflect({ x: -1, y: 0 });
            if (this.onPlaySound) this.onPlaySound('bounce');
        }

        if (pos.y + r > edges.top) {
            this.ball.reflect({ x: 0, y: -1 });
            if (this.onPlaySound) this.onPlaySound('bounce');
        }

        // Bottom boundary → OOB
        if (pos.y - r < edges.bottom) {
            this.onEngineBallOutOfBounds();
        }

        // Destroy ball if far below screen
        if (this.oobDetection.shouldDestroyBall(pos.y)) {
            this.ball.setOutOfBounds();
        }
    }

    /** Check if victory condition is met. */
    private checkVictory(): void {
        // GameStateManager auto-transitions to VICTORY when all collected,
        // so accept both PLAYING (not yet transitioned) and VICTORY (auto-transitioned).
        const phase = this.gameState.getCurrentPhase();
        if (phase !== GamePhase.PLAYING && phase !== GamePhase.VICTORY) return;
        if (!this.lightPoints.isAllCollected()) return;
        // Prevent double-fire: ball already in COLLECTED means we handled this
        if (this.ball.getPhase() === BallPhase.COLLECTED) return;

        // Only transition if not already VICTORY (auto-transitioned by GameStateManager)
        if (phase === GamePhase.PLAYING) {
            this.gameState.setState(GamePhase.VICTORY);
        }

        this.lightPoints.setGameEnded();
        this.ball.setCollected();

        if (this.onPlaySound) {
            this.onPlaySound('win');
        }

        if (this.onVictory && this.currentLevelData) {
            const collected = this.lightPoints.getCollectedCount();
            const total = this.lightPoints.getTotalCount();
            const time = this.gameState.getSessionTime();

            const stars = StarRatingCalculator.calculateStars(
                collected,
                total,
                this.currentLevelData.starThresholds,
                true, // isVictory
            );

            this.onVictory(stars, time);
        }
    }

    /** Push current state to HUD. */
    private notifyHUD(): void {
        if (!this.onHUDUpdate) return;

        this.onHUDUpdate({
            linesUsed: this.gameState.getLinesUsed(),
            linesRemaining: this.gameState.getLinesRemaining(),
            collected: this.gameState.getLightPointsCollected(),
            total: this.gameState.getLightPointsTotal(),
            time: this.gameState.getSessionTime(),
        });
    }
}
