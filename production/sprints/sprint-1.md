# Sprint 1: Foundation Layer

> **Sprint Duration**: 5 sessions
> **Goal**: Implement all Foundation and Core layer systems
> **Started**: 2026-04-09
> **Status**: Planned

---

## Sprint Objective

Build the technical foundation that all gameplay systems depend on. By the end of this sprint, the game should have a running Cocos Creator project with scene management, input handling, collision detection, boundary setup, game state tracking, and basic visual/audio feedback — though no actual gameplay yet.

---

## Stories

### Epic: Foundation Layer (no dependencies)

| # | Story | System | GDD | Est. | Priority |
|---|-------|--------|-----|------|----------|
| 1.1 | Initialize Cocos Creator 3.8.8 project structure | — | — | S | Blocking |
| 1.2 | Implement scene management (4 scenes, transitions) | 场景管理 | scene-management.md | S | High |
| 1.3 | Implement input system (touch → line data) | 输入系统 | input-system.md | S | High |
| 1.4 | Implement audio system (play/stop/volume) | 音频系统 | audio-system.md | S | Medium |
| 1.5 | Implement visual feedback system (particles, animations) | 视觉反馈系统 | visual-feedback-system.md | M | Medium |

### Epic: Core Layer (depends on Foundation)

| # | Story | System | GDD | Est. | Priority |
|---|-------|--------|-----|------|----------|
| 1.6 | Implement collision system (Box2D setup, collision matrix) | 碰撞系统 | collision-system.md | M | High |
| 1.7 | Implement boundary system (4 walls, bottom sensor) | 边界系统 | boundary-system.md | S | High |
| 1.8 | Implement game state management (phases, quotas, progress) | 游戏状态管理 | game-state-management.md | S | High |

---

## Story Details

### 1.1 Initialize Cocos Creator Project

**Tasks**:
- [ ] Create Cocos Creator 3.8.8 project
- [ ] Set up directory structure per `src/CLAUDE.md`
- [ ] Configure TypeScript strict mode
- [ ] Create config files for data-driven parameters
- [ ] Verify build to WeChat Mini-Game target

**Acceptance Criteria**:
- [ ] Project builds successfully
- [ ] TypeScript compilation passes
- [ ] WeChat Mini-Game build target works

### 1.2 Scene Management

**GDD**: design/gdd/scene-management.md

**Tasks**:
- [ ] Create 4 scenes (MainMenu, LevelSelect, Gameplay, Result)
- [ ] Implement scene transition with fade effect
- [ ] Implement scene data passing (levelId, result)
- [ ] Add preloading for LevelSelect scene

**Acceptance Criteria**:
- [ ] Scene transitions work with fade animation
- [ ] Data passes correctly between scenes
- [ ] Unit tests for transition logic

### 1.3 Input System

**GDD**: design/gdd/input-system.md

**Tasks**:
- [ ] Implement touch event capture (single finger)
- [ ] Convert touch start/end to line segment data
- [ ] Implement line preview (semi-transparent)
- [ ] Implement line length validation (MIN_LINE_LENGTH)
- [ ] Implement line undo (before ball hit)

**Acceptance Criteria**:
- [ ] Touch produces correct line segment coordinates
- [ ] Lines shorter than 20px are rejected
- [ ] Max 3 lines enforced
- [ ] Unit tests for line validation

### 1.4 Audio System

**GDD**: design/gdd/audio-system.md

**Tasks**:
- [ ] Implement sound playback (6 SFX + 2 BGM)
- [ ] Implement volume control (master, SFX, BGM)
- [ ] Implement mute toggle
- [ ] Implement concurrent sound limiting
- [ ] Add placeholder audio files

**Acceptance Criteria**:
- [ ] All 6 sound types play correctly
- [ ] Volume control works independently
- [ ] Mute works without affecting game logic
- [ ] Unit tests for volume calculation

### 1.5 Visual Feedback System

**GDD**: design/gdd/visual-feedback-system.md

**Tasks**:
- [ ] Implement particle system with object pool
- [ ] Implement 6 effect types (preview, confirmed, bounce, collect, win, lose)
- [ ] Implement animation system with easing
- [ ] Enforce particle count limit (200 max)

**Acceptance Criteria**:
- [ ] All 6 effects render correctly
- [ ] Particle limit enforced
- [ ] Performance: effects don't drop below 60fps
- [ ] Unit tests for particle count calculation

### 1.6 Collision System

**GDD**: design/gdd/collision-system.md

**Tasks**:
- [ ] Set up Cocos Creator 2D physics (Box2D)
- [ ] Define collision categories (Ball, Line, LightPoint, Boundary)
- [ ] Implement collision matrix
- [ ] Implement register/unregister for colliders
- [ ] Implement collision callbacks with event dispatch

**Acceptance Criteria**:
- [ ] Ball-Line collision detected with correct normal
- [ ] Ball-LightPoint sensor trigger works
- [ ] Ball-Bottom boundary sensor works
- [ ] High-speed ball doesn't tunnel (CCD)
- [ ] Unit tests for collision detection logic

### 1.7 Boundary System

**GDD**: design/gdd/boundary-system.md

**Tasks**:
- [ ] Create 4 boundary colliders (left, right, top = bounce; bottom = sensor)
- [ ] Handle safe areas (notch, home indicator)
- [ ] Calculate playable area from screen size

**Acceptance Criteria**:
- [ ] Ball bounces off left/right/top boundaries
- [ ] Ball triggers out-of-bounds on bottom
- [ ] Safe areas correctly handled
- [ ] Unit tests for boundary calculations

### 1.8 Game State Management

**GDD**: design/gdd/game-state-management.md

**Tasks**:
- [ ] Implement GameState data structure
- [ ] Implement phase state machine (READY → PLAYING → PAUSED/VICTORY/DEFEAT)
- [ ] Implement line quota tracking
- [ ] Implement collection progress tracking
- [ ] Implement pause/resume
- [ ] Add hasPendingVictory() for victory-priority rule

**Acceptance Criteria**:
- [ ] All state transitions valid per GDD
- [ ] Invalid transitions rejected
- [ ] canDrawLine() returns correct value
- [ ] Victory priority over defeat in same frame
- [ ] Unit tests for all state machine transitions

---

## Definition of Done

- [ ] All stories' acceptance criteria met
- [ ] Unit tests pass for all implemented systems
- [ ] No hardcoded values — all parameters in config files
- [ ] Code follows naming conventions (PascalCase classes, camelCase functions)
- [ ] Each system has a corresponding ADR in docs/architecture/
- [ ] Sprint retrospective completed

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cocos Creator 3.8 API uncertainty | Medium | Cross-reference docs/engine-reference/ before using APIs |
| Box2D setup complexity | Medium | Use Cocos Creator built-in physics component |
| Particle performance on low-end devices | Low | Prototype already validated feel; optimize later |

---

## Next Sprint Preview

Sprint 2 will implement the Feature layer:
- Ball Physics System (HIGH RISK)
- Line Bounce System (HIGH RISK)
- Light Point Collection System
- Out of Bounds Detection System
- Level System

This is where the game becomes playable.
