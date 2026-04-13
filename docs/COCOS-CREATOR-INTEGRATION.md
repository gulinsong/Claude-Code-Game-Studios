# Cocos Creator Integration Guide

## 反弹达人 (Bounce Master) — Editor Setup Guide

> This guide walks through opening the project in Cocos Creator 3.8.8,
> binding components, and building for WeChat Mini-Game.

---

## Prerequisites

- Cocos Creator 3.8.8 LTS installed
- WeChat DevTools installed (for testing mini-game build)
- Node.js 16+

---

## Step 1: Open Project

1. Launch Cocos Creator 3.8.8
2. Click **Open Project** → select this repository root folder
3. Wait for compilation to complete

The project is already configured:
- Design resolution: 750×1334 (FIXED_WIDTH)
- Script directory: `assets/scripts`
- Start scene: `Main.scene`

---

## Step 2: Scene Structure — Main.scene

Open `assets/scenes/Main.scene`. The scene already has:
- **Canvas** (750×1334)
  - **Camera**
  - **GameRoot** (with prototype component)

### What to add:

Under **Canvas → GameRoot**, create these child nodes:

```
Canvas
├── Camera
├── GameRoot
│   ├── MainMenuPanel          (active by default)
│   │   ├── TitleLabel         (Label: "反弹达人")
│   │   ├── StartBtn           (Button + Label: "开始游戏")
│   │   ├── ContinueBtn        (Button + Label: "继续游戏", hidden by default)
│   │   └── BottomLinks        (Node with settings/about links)
│   ├── WorldSelectPanel       (hidden)
│   │   ├── TopBar
│   │   │   ├── BackBtn
│   │   │   └── TotalStarsLabel
│   │   └── WorldCardsParent
│   ├── LevelSelectPanel       (hidden)
│   │   ├── TopBar
│   │   │   ├── BackBtn
│   │   │   ├── WorldNameLabel
│   │   │   └── WorldStarsLabel
│   │   └── LevelGridParent
│   ├── GameplayPanel          (hidden)
│   │   ├── BallNode           (Sprite with ball.svg)
│   │   ├── LinesParent       (empty container for line nodes)
│   │   ├── LightPointsParent  (empty container for light point nodes)
│   │   ├── EffectsParent      (empty container for particles)
│   │   ├── HUD
│   │   │   ├── LinesLabel     (Label, top-left)
│   │   │   ├── CollectedLabel (Label, bottom-left)
│   │   │   ├── TimeLabel      (Label, bottom-left)
│   │   │   └── PauseBtn       (Button with pause icon)
│   │   ├── PauseOverlay       (hidden, dark mask + panel)
│   │   │   ├── ResumeBtn
│   │   │   ├── RetryBtn
│   │   │   └── ExitBtn
│   │   ├── WinOverlay         (hidden)
│   │   │   ├── StarContainer  (3 star sprites)
│   │   │   ├── ScoreLabel
│   │   │   ├── TimeLabel
│   │   │   ├── NextBtn
│   │   │   ├── ReplayBtn
│   │   │   └── BackBtn
│   │   └── LoseOverlay        (hidden)
│   │       ├── CollectedLabel
│   │       ├── EncourageLabel
│   │       ├── RetryBtn
│   │       └── BackBtn
│   └── SFXSource              (AudioSource for SFX)
│   └── BGMSource              (AudioSource for BGM)
```

---

## Step 3: Attach Components

### GameRoot node
- Remove the existing prototype component
- Add `GameRoot` component (from `assets/scripts/core/GameRoot.ts`)
- Drag `assets/data/levels.json` to the **levelsData** field

### MainMenuPanel node
- Add `MainMenuController` component
- Bind **continueBtn** → ContinueBtn node

### WorldSelectPanel node
- Add `WorldSelectController` component
- Bind **worldCardsParent** → WorldCardsParent node
- Bind **totalStarsLabel** → TotalStarsLabel node

### LevelSelectPanel node
- Add `LevelSelectController` component
- Bind **gridParent** → LevelGridParent node
- Bind **worldNameLabel** → WorldNameLabel node

### GameplayPanel (or Canvas) node
- Add `GameplaySceneAdapter` component (from `src/engine/GameplaySceneAdapter.ts`)
- **Note**: This file needs to be moved or referenced. Cocos Creator compiles scripts in `assets/scripts/`. You may need to:
  1. Copy `src/engine/GameplaySceneAdapter.ts` to `assets/scripts/engine/`
  2. Or configure tsconfig paths in Cocos settings

### HUD node
- Add `GameplayHUD` component
- Bind **linesLabel**, **collectedLabel**, **timeLabel** to respective Label nodes

---

## Step 4: Import Assets

### Textures
Import all SVG files from `assets/textures/` into Cocos Creator:
1. Drag `gameplay/` folder into the assets panel
2. Drag `ui/` folder into the assets panel
3. Drag `backgrounds/` folder into the assets panel
4. Drag `effects/` folder into the assets panel

### Audio
Import all WAV files from `assets/audio/`:
1. Drag `sfx/` and `bgm/` into the assets panel
2. Cocos Creator will auto-detect audio files

### Data
- `assets/data/levels.json` should already be imported as a JsonAsset

---

## Step 5: Create Prefabs (Optional but Recommended)

### WorldCard.prefab
- Size: 650×200
- Children: WorldNameLabel, StarsProgress, LockIcon

### LevelCard.prefab
- Size: 160×160
- Children: LevelNumberLabel, StarsRow, LockIcon, NewBadge

### Line.prefab
- A stretched sprite node for drawn lines
- Use line_active.svg texture

---

## Step 6: Build for WeChat Mini-Game

1. Menu → **Project → Build**
2. Select **WeChat Mini Game** platform
3. Configure:
   - AppID: Replace `wx-placeholder-appid` with your actual AppID
   - Orientation: Portrait
   - Subpackages: Already configured in `settings/v2/packages/builder.json`
4. Click **Build**
5. Open the build output in WeChat DevTools for testing

### Package Size Budget
- Main package: < 4MB
- Audio subpackage: ~2.9MB (loaded on demand)
- World textures: loaded per world via subpackages

---

## File Reference

| Purpose | Pure Logic (src/) | Engine Script (assets/scripts/) |
|---------|-------------------|----------------------------------|
| Game entry | — | `core/GameRoot.ts` |
| Gameplay | `engine/GameplaySceneAdapter.ts` | Copy to `engine/` in assets |
| Main menu | — | `ui/MainMenuController.ts` |
| World select | — | `ui/WorldSelectController.ts` |
| Level select | — | `ui/LevelSelectController.ts` |
| HUD | — | `ui/GameplayHUD.ts` |

### Pure Logic (no Cocos imports, tested)
- `src/core/` — BoundarySystem, CollisionSystem, GameStateManager, OutOfBoundsDetection, SaveSystem
- `src/foundation/` — AudioSystem, InputSystem, SceneManagement, VisualFeedback
- `src/gameplay/` — BallPhysics, LineBounce, LightPointCollection, LevelSystem, StarRating, GameCoordinator
- `src/ui/` — UIScreenController, HUDController, OverlayController
- `src/config/` — GameConfig, UIConfig, AudioManifest

---

## Troubleshooting

### "Cannot find module 'cc'"
Engine scripts in `assets/scripts/` can import from `cc` directly. Pure logic in `src/` cannot — that's intentional.

### TypeScript errors in engine scripts
Ensure `tsconfig.json` includes `cc` type definitions. Cocos Creator provides these automatically.

### Audio not playing
- Check that AudioSource components are attached to nodes
- Verify audio clips are assigned in the inspector
- WeChat Mini-Game requires user interaction before audio plays

### Scene too large/small
- Design resolution is 750×1334 with FIXED_WIDTH
- Adjust Camera → orthoHeight = 667 (half of 1334)
