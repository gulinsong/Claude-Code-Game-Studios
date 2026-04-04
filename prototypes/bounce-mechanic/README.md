# Prototype: Bounce Mechanic

## Question
Does drawing lines to redirect a bouncing ball feel satisfying and intuitive?

## Hypothesis
Using the GDD parameters (restitution 0.95, gravity 980, max 3 lines), the core
"draw line -> ball bounces" loop will feel responsive and fun within the first
few seconds of play.

## How to Test

### Setup
1. Copy these 4 files into a Cocos Creator 3.8.8 project:
   - `assets/scripts/prototypes/BouncePrototype.ts`
   - `assets/scripts/prototypes/Ball.ts`
   - `assets/scripts/prototypes/DrawLine.ts`
2. Create a new Scene
3. Add an empty Node named "GameRoot" to the scene
4. Attach `BouncePrototype` component to "GameRoot"
5. Make sure 2D Physics is enabled in Project Settings -> Physics
6. Hit Play

### Controls
- **Draw a line**: Touch/click and drag on screen. Release to place the line.
- **Clear all lines**: After 3 lines are placed, touch again to clear all lines.
- **Auto-reset**: Ball falling off the bottom auto-resets after a short delay.

### What to Evaluate
1. Does the ball bounce feel "snappy" and satisfying?
2. Is restitution 0.95 too bouncy or just right?
3. Can you reliably redirect the ball with drawn lines?
4. Does the 3-line limit create interesting strategic decisions?
5. Does the quick-clear mechanic (touch after 3 lines) feel natural for iteration?

### Key Parameters to Tune
All values are hardcoded in `BouncePrototype.ts` CONFIG object:

| Parameter | Current | Try |
|-----------|---------|-----|
| `gravity` | 980 | 500-1500 |
| `ballRestitution` | 0.95 | 0.7-1.0 |
| `lineRestitution` | 0.95 | 0.8-1.0 |
| `initialSpeed` | 300 | 100-600 |
| `maxLines` | 3 | 1-5 |

### Known Simplifications (vs Production)
- No sound effects
- No particle effects on bounce
- No undo/revoke of individual lines (clear all instead)
- No level structure (just a blank field)
- Console logging instead of on-screen UI
- No line preview while drawing
- Ball auto-resets immediately on out-of-bounds
- No scoring, no light points to collect

## Files
- `BouncePrototype.ts` - Main scene component, manages ball/lines/touch
- `Ball.ts` - Ball physics and rendering
- `DrawLine.ts` - Line drawing with PolygonCollider2D and neon rendering
