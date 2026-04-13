# Visual Asset Registry

All visual assets for 反弹达人 (Bounce Master). SVG placeholders suitable for
Cocos Creator import. Replace with final art before release.

## Gameplay Assets (`textures/gameplay/`)

| File | Size | Description | Color Theme |
|------|------|-------------|-------------|
| `ball.svg` | 64x64 | Bouncing ball with glow | Teal #4ECDC4 |
| `light_point.svg` | 48x48 | Collectible light point (active) | Gold #FFE66D |
| `light_point_collected.svg` | 48x48 | Collected light point (dimmed) | Gray #D0D0D0 |
| `star_filled.svg` | 80x80 | Earned star (3-star rating) | Gold #FFE66D |
| `star_empty.svg` | 80x80 | Unearned star outline | Gray #CCCCCC |
| `line_active.svg` | 200x6 | Active/drawn line with glow edge | Teal #4ECDC4 |
| `line_preview.svg` | 200x4 | Preview line (dashed, semi-transparent) | Teal #4ECDC4 |

## UI Assets (`textures/ui/`)

### Buttons (`ui/buttons/`)

| File | Size | Description |
|------|------|-------------|
| `ui_btn_pause.svg` | 60x60 | Pause button (two vertical bars) |
| `ui_btn_play.svg` | 60x60 | Play/continue button (triangle) |
| `ui_btn_retry.svg` | 60x60 | Retry/restart button (circular arrow) |
| `ui_btn_back.svg` | 60x60 | Back navigation button (chevron) |

### Icons (`ui/icons/`)

| File | Size | Description |
|------|------|-------------|
| `ui_icon_star.svg` | 24x24 | Small star icon (HUD, counters) |
| `ui_icon_lock.svg` | 32x32 | Lock icon (locked levels/worlds) |
| `ui_icon_new.svg` | 40x20 | "NEW" badge (newly unlocked levels) |
| `ui_hud_dot_filled.svg` | 16x16 | Filled dot (line used indicator) |
| `ui_hud_dot_empty.svg` | 16x16 | Empty dot (line available indicator) |

## Backgrounds (`textures/backgrounds/`)

| File | Size | World | Theme |
|------|------|-------|-------|
| `bg_world1_training.svg` | 750x1334 | World 1 — 基础训练 | Fresh green gradient |
| `bg_world2_advanced.svg` | 750x1334 | World 2 — 反弹进阶 | Ocean blue with waves |
| `bg_world3_mastery.svg` | 750x1334 | World 3 — 精通之路 | Elegant purple |
| `bg_world4_master.svg` | 750x1334 | World 4 — 大师挑战 | Warm gold with sun |

## Effects (`textures/effects/`)

| File | Size | Description | Used By |
|------|------|-------------|---------|
| `particle_circle.svg` | 8x8 | Small circle particle | Bounce effect |
| `particle_sparkle.svg` | 12x12 | Star-shaped sparkle | Bounce effect |
| `particle_collect_burst.svg` | 32x32 | Radial burst glow | Collect effect |
| `confetti_star.svg` | 20x20 | Red star confetti | Win effect |
| `confetti_circle.svg` | 16x16 | Teal circle confetti | Win effect |
| `confetti_diamond.svg` | 14x14 | Gold diamond confetti | Win effect |

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#4ECDC4` | Ball, lines, buttons, primary UI |
| Accent | `#FFE66D` | Light points, stars, particles |
| Success | `#95E1D3` | Positive feedback |
| Failure | `#555555` | Defeat overlay dim |
| Background | `#F7F7F7` | Neutral backgrounds |
| White | `#FFFFFF` | Highlights, text |

## Notes for Artists

- All assets are vector SVG — scale to any size without quality loss
- Cocos Creator will convert SVGs to textures during build
- Keep SVG complexity low for WeChat Mini-Game performance
- Final art should maintain the color palette above
- Particle sprites should be small (8-32px) for batching efficiency
