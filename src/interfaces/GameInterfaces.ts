/**
 * GameInterfaces.ts — Shared TypeScript interfaces for all game systems.
 * Sourced from respective GDD documents.
 */

/** Lightweight Vec2 type — compatible with Cocos Creator's Vec2 */
export interface Vec2 {
    x: number;
    y: number;
}

// ===== Game State Management (GDD: game-state-management.md) =====

export enum GamePhase {
    READY = 'READY',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    VICTORY = 'VICTORY',
    DEFEAT = 'DEFEAT',
}

export interface GameState {
    currentPhase: GamePhase;
    currentLevelId: string;
    linesUsed: number;
    linesRemaining: number;
    lightPointsCollected: number;
    lightPointsTotal: number;
    sessionTime: number;
    isPaused: boolean;
}

export interface LevelConfig {
    levelId: string;
    maxLines: number;
    lightPointCount: number;
    timeLimit: number;
}

// ===== Ball Physics (GDD: ball-physics-system.md) =====

export enum BallPhase {
    IDLE = 'IDLE',
    MOVING = 'MOVING',
    PAUSED = 'PAUSED',
    OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
    COLLECTED = 'COLLECTED',
}

export interface BallState {
    phase: BallPhase;
    position: Vec2;
    velocity: Vec2;
    speed: number;
}

// ===== Collision System (GDD: collision-system.md) =====

export enum CollisionCategory {
    BALL = 0x0001,
    LINE = 0x0002,
    LIGHTPOINT = 0x0004,
    BOUNDARY = 0x0008,
}

export interface CollisionEvent {
    position: Vec2;
    normal: Vec2;
}

// ===== Light Point Collection (GDD: light-point-collection-system.md) =====

export enum LightPointState {
    SPAWNING = 'SPAWNING',
    IDLE = 'IDLE',
    COLLECTING = 'COLLECTING',
    DEAD = 'DEAD',
}

export interface LightPoint {
    id: string;
    position: Vec2;
    state: LightPointState;
}

// ===== Level System (GDD: level-system.md) =====

export interface LevelData {
    id: string;
    world: number;
    level: number;
    name: string;
    difficulty: number;
    ball: {
        spawn: { x: number; y: number };
        direction: number;
    };
    lightPoints: { x: number; y: number }[];
    starThresholds: StarThresholds;
    maxLines: number;
    timeLimit: number;
    obstacles: unknown[];
}

export interface StarThresholds {
    one: number;
    two: number;
    three: number;
}

export interface LevelProgress {
    levelId: string;
    bestStars: number;
    completed: boolean;
    attempts: number;
    bestTime: number;
}

export interface WorldProgress {
    worldId: number;
    unlocked: boolean;
    levels: LevelProgress[];
}

export interface GameProgress {
    worlds: WorldProgress[];
    totalStars: number;
    lastPlayedLevel: string;
}

// ===== Star Rating (GDD: star-rating-system.md) =====

export interface StarRatingResult {
    levelId: string;
    stars: number;
    previousBestStars: number;
    newBestStars: number;
    isNewRecord: boolean;
    cumulativeStarsBefore: number;
    cumulativeStarsAfter: number;
    newWorldUnlocked: number | null;
    lightPointsCollected: number;
    lightPointsTotal: number;
    sessionTime: number;
}

// ===== UI System (GDD: ui-system.md) =====

export interface WorldInfo {
    worldId: number;
    name: string;
    unlocked: boolean;
    unlockThreshold: number;
    totalStarsInWorld: number;
    earnedStarsInWorld: number;
}

export interface LevelInfo {
    levelId: string;
    name: string;
    difficulty: number;
    unlocked: boolean;
    completed: boolean;
    bestStars: number;
    isNew: boolean;
}

// ===== Input System (GDD: input-system.md) =====

export interface LineSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lineId: string;
    isHit: boolean;
}

export enum InputPhase {
    IDLE = 'IDLE',
    DRAWING = 'DRAWING',
}
