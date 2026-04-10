/**
 * GameConfig.ts — Central configuration for all game parameters.
 * All values are sourced from their respective GDD documents.
 * Do NOT hardcode these values elsewhere — import from this file.
 */

// ===== Ball Physics (GDD: ball-physics-system.md) =====
export const BALL_CONFIG = {
    VISUAL_RADIUS: 15,          // px
    COLLIDER_RADIUS: 15,        // px
    INITIAL_SPEED: 300,         // px/s
    GRAVITY: 980,               // px/s²
    MAX_SPEED: 1500,            // px/s
    MIN_SPEED: 50,              // px/s
    RESTITUTION: 0.9,           // ball material bounce
    FRICTION: 0.0,              // ball material friction
    DENSITY: 1.0,               // ball material density
} as const;

// ===== Line System (GDD: line-bounce-system.md, collision-system.md) =====
export const LINE_CONFIG = {
    VISUAL_THICKNESS: 4,        // px
    COLLIDER_PADDING: 1.5,      // multiplier for collision thickness
    RESTITUTION: 0.95,          // line material bounce
    FRICTION: 0.2,              // line material friction
    MIN_LENGTH: 20,             // px — shorter lines are rejected
    MAX_LINES_PER_LEVEL: 3,     // default, can be overridden by level config
    PREVIEW_OPACITY: 0.5,       // semi-transparent preview line
} as const;

// ===== Light Point Collection (GDD: light-point-collection-system.md) =====
export const LIGHT_POINT_CONFIG = {
    VISUAL_RADIUS: 12,          // px
    COLLECTION_TOLERANCE: 5,    // px — forgiveness margin
    COLLECT_ANIM_DURATION: 0.4, // seconds
    COLLECT_SCALE_RANGE: 1.0,   // expands to 2.0x total
    SPAWN_ANIM_DURATION: 0.3,   // seconds
    GLOW_SCALE: 1.8,            // glow ring relative to core
    PULSE_AMPLITUDE: 0.15,      // fraction of core radius
    PULSE_PERIOD: 2.0,          // seconds per cycle
} as const;

// ===== Collision System (GDD: collision-system.md) =====
export const COLLISION_CONFIG = {
    COLLIDER_SCALE: 1.0,        // ball collider vs visual scale
    CCD_VELOCITY_THRESHOLD: 5,  // continuous collision detection threshold
    LINE_COLLISION_PADDING: 3,  // px — extra thickness for line collision detection
    // Collision categories
    CATEGORY_BALL: 0x0001,
    CATEGORY_LINE: 0x0002,
    CATEGORY_LIGHTPOINT: 0x0004,
    CATEGORY_BOUNDARY: 0x0008,
} as const;

// ===== Boundary System (GDD: boundary-system.md) =====
export const BOUNDARY_CONFIG = {
    RESTITUTION: 0.8,           // boundary wall bounce
    FRICTION: 0.0,              // boundary wall friction
    BOUNDARY_PADDING: 20,       // px — offset from screen edge
    BALL_DESTROY_MARGIN: 100,   // px — distance below bottom before ball destruction
    DEFAULT_SAFE_AREA_TOP: 44,  // px — default top safe area (notch/status bar)
    DEFAULT_SAFE_AREA_BOTTOM: 34, // px — default bottom safe area (home indicator)
} as const;

// ===== Audio System (GDD: audio-system.md) =====
export const AUDIO_CONFIG = {
    MASTER_VOLUME: 1.0,
    SFX_VOLUME: 1.0,
    BGM_VOLUME: 0.7,
    MAX_CONCURRENT_SOUNDS: 8,
} as const;

// ===== Star Rating (GDD: star-rating-system.md) =====
export const STAR_CONFIG = {
    THRESHOLD_ONE_RATIO: 0.4,   // 40% light points = 1 star
    THRESHOLD_TWO_RATIO: 0.7,   // 70% light points = 2 stars
    THRESHOLD_THREE_RATIO: 1.0, // 100% light points = 3 stars
    WORLD_UNLOCK_THRESHOLDS: [0, 7, 18, 33],
} as const;

// ===== Scene Management (GDD: scene-management.md) =====
export const SCENE_CONFIG = {
    TRANSITION_FADE_OUT: 0.15,  // seconds
    TRANSITION_FADE_IN: 0.15,   // seconds
    PRELOAD_DELAY: 500,         // ms
} as const;

// ===== Input System (GDD: input-system.md) =====
export const INPUT_CONFIG = {
    MIN_LINE_LENGTH: 20,        // px — from LINE_CONFIG.MIN_LENGTH
    PREVIEW_OPACITY: 0.5,       // from LINE_CONFIG.PREVIEW_OPACITY
} as const;

// ===== Visual Feedback (GDD: visual-feedback-system.md) =====
export const VISUAL_CONFIG = {
    MAX_PARTICLES: 200,
    PARTICLE_POOL_SIZE: 50,
} as const;

// ===== Derived values =====
/** Collection trigger radius = visual + ball + tolerance */
export const COLLECTION_RADIUS =
    LIGHT_POINT_CONFIG.VISUAL_RADIUS +
    BALL_CONFIG.COLLIDER_RADIUS +
    LIGHT_POINT_CONFIG.COLLECTION_TOLERANCE;

/** Line collider thickness = visual * padding */
export const LINE_COLLIDER_THICKNESS =
    LINE_CONFIG.VISUAL_THICKNESS * LINE_CONFIG.COLLIDER_PADDING;

/** Total scene transition duration */
export const TRANSITION_DURATION =
    SCENE_CONFIG.TRANSITION_FADE_OUT + SCENE_CONFIG.TRANSITION_FADE_IN;
