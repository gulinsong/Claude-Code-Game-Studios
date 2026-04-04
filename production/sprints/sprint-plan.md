# Sprint Plan -- 反弹达人 (Bounce Master) MVP

> **Created**: 2026-04-04
> **Status**: Draft
> **Project Stage**: Pre-Production
> **Target**: MVP Playable in ~3 weeks (5 sprints)

---

## Milestone Overview

| Milestone | Sprints | Duration | Target Date | Status |
|-----------|---------|----------|-------------|--------|
| M0: Core Prototype | Sprint 1 | 3 days | 2026-04-07 | Not Started |
| M1: Foundation Layer | Sprint 2 | 5 days | 2026-04-14 | Not Started |
| M2: Feature Layer | Sprint 3 | 6 days | 2026-04-22 | Not Started |
| M3: Presentation Layer | Sprint 4 | 4 days | 2026-04-28 | Not Started |
| M4: Polish & Integration | Sprint 5 | 4 days | 2026-05-02 | Not Started |

**MVP Target Date**: 2026-05-02 (4 weeks from today)

### System Rollup by Sprint

| Sprint | Systems | Risk Level | Design Status |
|--------|---------|------------|---------------|
| Sprint 1 | 球物理系统 + 画线反弹系统 (prototype) | **HIGH** | Approved |
| Sprint 2 | 输入系统, 场景管理, 碰撞系统, 边界系统, 游戏状态管理, 音频系统, 视觉反馈系统 | Low | All Approved |
| Sprint 3 | 光点收集系统, 出界检测系统, 关卡系统 | Low-Medium | **Requires GDD first** |
| Sprint 4 | 星级评价系统, UI系统 | Low | **Requires GDD first** |
| Sprint 5 | Integration, bug fixes, performance, playtest | Medium | N/A |

### Key Decision Points

| Decision Point | When | What Gets Decided |
|---------------|------|-------------------|
| Prototype Go/No-Go | End of Sprint 1 | Does the bounce feel good enough? Proceed or pivot? |
| Remaining GDD Design | Start of Sprint 2 | Design 5 remaining MVP systems while implementing foundation |
| MVP Scope Cut | Mid Sprint 3 | If behind schedule, what gets cut from MVP? |
| Release Readiness | End of Sprint 5 | Ship or extend? |

---

## Sprint 1 -- Core Prototype

**2026-04-04 to 2026-04-07 (3 days)**

### Sprint Goal
Validate the core bounce mechanic feel: does drawing lines and watching the ball bounce feel satisfying? This is the highest-risk sprint -- if the physics feel is wrong, the game concept needs rethinking.

### Capacity
- Total days: 3
- Buffer (20%): 0.5 days
- Available: 2.5 days

### Objectives
1. Build a minimal prototype that proves the core "draw line -> bounce ball" loop
2. Validate physics parameters from 球物理系统 GDD
3. Validate line-to-collider conversion from 画线反弹系统 GDD
4. Answer open question: does the bounce feel satisfying?

### Tasks

#### Must Have (Critical Path)

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S1-01 | Create prototype scene with Cocos Creator physics | programmer | 0.5 | None | Scene loads, physics world active, 60fps |
| S1-02 | Implement ball launch + gravity + speed clamping | programmer | 0.5 | S1-01 | Ball launches downward, arcs with gravity, speed clamped |
| S1-03 | Implement touch-to-line conversion (draw line on screen) | programmer | 0.5 | S1-01 | Touch generates a visible line segment |
| S1-04 | Implement line-as-static-collider (ball bounces off drawn lines) | programmer | 0.5 | S1-02, S1-03 | Ball bounces off drawn lines with correct reflection |
| S1-05 | Implement ball-boundary collision (walls + bottom detection) | programmer | 0.5 | S1-02 | Ball bounces off walls, detected when passing bottom edge |
| S1-06 | Playtest prototype and document physics feel assessment | producer + user | 0.5 | S1-04, S1-05 | Written assessment: bounce feel, tuning recommendations |

#### Nice to Have

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S1-07 | Add basic bounce SFX (placeholder audio) | programmer | 0.25 | S1-04 | Sound plays on bounce, timing feels synced |
| S1-08 | Add basic particle burst on bounce | programmer | 0.25 | S1-04 | Visual feedback on bounce impact point |
| S1-09 | Create physics tuning scene (slider for gravity, restitution, speed) | programmer | 0.5 | S1-04 | Can tweak physics params in real-time |

### Deliverables
- Working prototype: ball launches, player draws lines, ball bounces off lines and walls
- Physics parameter tuning document (initial values validated or adjusted)
- Prototype assessment report: go/no-go recommendation

### Dependencies
- Cocos Creator 3.8.8 project must be set up (project.json exists)
- Legacy code archived to `prototypes/archive/` (or ignored for prototype)

### Success Criteria
- [ ] Ball bounces off drawn lines with visually correct reflection angles
- [ ] Ball does not tunnel through lines at high speeds (CCD working)
- [ ] Player can draw 3 lines maximum per attempt
- [ ] Ball is detected when passing bottom boundary
- [ ] Physics feel assessment: "this could be fun with more polish" (minimum bar)
- [ ] Performance: 60fps sustained during prototype play

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cocos Creator 2D physics does not feel right | Medium | **Critical** -- game concept fails | Test Box2D defaults early; prepare custom physics fallback |
| Line collider conversion is unreliable | Low | High -- core mechanic broken | Use simple line segment collider, not polygon approximation |
| Touch input has latency on WeChat | Low | Medium | Test on real device early; use Cocos input system |
| Prototype scope creeps into "mini-game" | Medium | Medium | Strict definition: NO UI, NO scoring, NO levels -- just bounce |

### Notes
- This prototype is THROWAWAY code -- do not design for reuse
- Use hardcoded values from GDD (GRAVITY=980, BALL_INITIAL_SPEED=300, etc.)
- The goal is feel validation, not production code
- If prototype fails, schedule a creative pivot meeting before Sprint 2

---

## Sprint 2 -- Foundation Layer

**2026-04-08 to 2026-04-14 (5 working days)**

### Sprint Goal
Implement all 7 foundation and core systems with production-quality code. In parallel, design the 5 remaining MVP GDDs. By the end of this sprint, the game has a working foundation that all features will build on.

### Capacity
- Total days: 5
- Buffer (20%): 1 day
- Available: 4 days

### Objectives
1. Implement all foundation systems: 输入系统, 场景管理, 音频系统, 视觉反馈系统
2. Implement all core systems: 碰撞系统, 边界系统, 游戏状态管理
3. **Parallel track**: Design GDDs for 光点收集系统, 出界检测系统, 关卡系统, 星级评价系统, UI系统
4. Validate that the prototype bounce feel is preserved in production architecture

### Tasks

#### Must Have (Critical Path)

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S2-01 | Archive legacy farming sim code | programmer | 0.25 | None | Old code moved to `prototypes/archive/farming-sim/` |
| S2-02 | Set up project architecture (folder structure, module system) | programmer | 0.5 | None | `assets/scripts/` structure matches design docs |
| S2-03 | Implement 输入系统 (touch input, line preview, line creation events) | programmer | 0.5 | S2-02 | Touch generates start->end line data, preview shown |
| S2-04 | Implement 场景管理 (scene types, transitions, fade) | programmer | 0.5 | S2-02 | Can switch between MainMenu, Gameplay, Result scenes |
| S2-05 | Implement 碰撞系统 (collision categories, register/unregister, callbacks) | programmer | 1.0 | S2-04 | Ball-Line, Ball-LightPoint, Ball-Boundary collisions detected |
| S2-06 | Implement 边界系统 (4 boundaries, bottom as sensor) | programmer | 0.5 | S2-05 | Walls bounce ball, bottom detects out-of-bounds |
| S2-07 | Implement 游戏状态管理 (phases, line quota, collection count, timer) | programmer | 0.5 | S2-04 | State tracks Ready/Playing/Paused/Win/Lose phases |
| S2-08 | Implement 音频系统 (playSound API, volume control, 4 core SFX) | programmer | 0.5 | S2-02 | bounce, collect, win, lose sounds play on trigger |
| S2-09 | Implement 视觉反馈系统 (preview line, confirmed line, bounce particles) | programmer | 0.5 | S2-02 | Visual feedback for all core events |
| S2-10 | Integration: wire all foundation systems together in gameplay scene | programmer | 0.5 | S2-03..S2-09 | Ball + lines + boundaries + state + feedback working end-to-end |

#### Should Have (Parallel Design Track)

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S2-D1 | Design GDD: 光点收集系统 | game-designer | 0.5 | None | All 8 sections complete, reviewed |
| S2-D2 | Design GDD: 出界检测系统 | game-designer | 0.5 | None | All 8 sections complete, reviewed |
| S2-D3 | Design GDD: 关卡系统 | game-designer | 0.5 | None | All 8 sections complete, reviewed |
| S2-D4 | Design GDD: 星级评价系统 | game-designer | 0.5 | S2-D1 | All 8 sections complete, reviewed |
| S2-D5 | Design GDD: UI系统 | game-designer | 0.5 | S2-D3, S2-D4 | All 8 sections complete, reviewed |

### Deliverables
- All 7 foundation/core systems implemented with unit tests
- All 5 remaining MVP GDDs approved
- Working gameplay scene with: ball physics, line drawing, boundary collision, state management, visual feedback, audio
- End-to-end "draw -> bounce -> out-of-bounds" loop working in production code

### Dependencies
- Sprint 1 prototype validated (go decision made)
- Cocos Creator project properly configured

### Success Criteria
- [ ] All 7 systems pass their GDD acceptance criteria
- [ ] End-to-end loop works: draw line -> ball bounces -> ball goes out -> state changes to Lose
- [ ] All 5 GDDs approved and ready for Sprint 3
- [ ] Unit test coverage for core logic (collision, state management)
- [ ] Performance: 60fps sustained, draw calls < 50
- [ ] No hardcoded values -- all params in config files

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GDD design delays block Sprint 3 | Medium | High | Start design on day 1, review continuously |
| Integration issues between systems | Medium | Medium | Wire incrementally, test end-to-end daily |
| 碰撞系统 implementation more complex than estimated | Low | Medium | Use Cocos built-in Box2D, don't roll custom physics |
| Legacy code removal breaks project config | Low | Low | Verify project loads in Cocos Creator after archiving |

### Notes
- Production code standards apply: doc comments, config-driven values, no `any` types
- Design track runs in parallel -- do not block implementation on GDD completion
- By end of Sprint 2, we should have 14/14 MVP GDDs approved

---

## Sprint 3 -- Feature Layer

**2026-04-15 to 2026-04-22 (6 working days)**

### Sprint Goal
Implement all feature-layer systems that complete the core gameplay loop: light points to collect, out-of-bounds detection, and level management. By the end of this sprint, the game is fully playable with multiple levels.

### Capacity
- Total days: 6
- Buffer (20%): 1 day
- Available: 5 days

### Objectives
1. Implement 光点收集系统 (ball touches light point -> collected -> progress tracked)
2. Implement 出界检测系统 (ball passes bottom -> lose state triggered)
3. Implement 关卡系统 (level loading, configuration, win/lose conditions, transitions)
4. Create 5-10 handcrafted test levels
5. Full core loop playable: start level -> draw lines -> launch ball -> collect/lose -> result

### Tasks

#### Must Have (Critical Path)

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S3-01 | Implement 光点收集系统 (register light points, detect collection, track count) | programmer | 0.75 | S2-05 (碰撞系统) | Ball touches light point -> collected event fires, count updates |
| S3-02 | Implement light point visual behavior (spawn, collect animation, disappear) | programmer | 0.5 | S3-01, S2-09 | Light points visible, collect animation plays, removed from scene |
| S3-03 | Implement 出界检测系统 (bottom boundary sensor -> lose event) | programmer | 0.5 | S2-06 (边界系统) | Ball passes bottom -> out-of-bounds event fires -> state = Lose |
| S3-04 | Implement 关卡系统 (level config format, level loader, win/lose conditions) | programmer | 1.0 | S2-07 (游戏状态管理) | Level loads from config, win when all collected, lose when out-of-bounds |
| S3-05 | Create level config data format (JSON schema for ball spawn, light points, boundaries) | programmer | 0.5 | None | JSON schema defined, sample level validates |
| S3-06 | Create 5 handcrafted test levels (tutorial -> easy -> medium) | game-designer | 0.5 | S3-05 | 5 playable levels, difficulty progression clear |
| S3-07 | Implement level transition flow (win -> result -> next level; lose -> retry) | programmer | 0.5 | S3-04, S2-04 | Player can play through levels sequentially or retry |
| S3-08 | Integrate 球物理系统 into production architecture | programmer | 0.5 | S2-05, S2-06 | Prototype ball physics refactored to production code |
| S3-09 | Integrate 画线反弹系统 into production architecture | programmer | 0.5 | S2-03, S2-05 | Prototype line drawing refactored to production code |
| S3-10 | End-to-end integration test (full game loop) | programmer | 0.5 | S3-01..S3-09 | Complete loop: play -> draw -> bounce -> collect -> win/lose -> retry |

#### Should Have

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S3-11 | Create 5 more test levels (medium -> hard) | game-designer | 0.5 | S3-05 | 10 total levels covering tutorial through challenge |
| S3-12 | Implement ball trail effect (visual polish) | programmer | 0.25 | S3-08 | Ball leaves a fading trail while moving |
| S3-13 | Add level selection scene (basic list) | programmer | 0.5 | S3-04, S2-04 | Player can select from unlocked levels |

### Deliverables
- 3 feature systems implemented and tested
- 10 playable levels (5 must-have + 5 should-have)
- Full core loop: start -> draw -> bounce -> collect all -> win, or out-of-bounds -> lose
- Level configuration format documented

### Dependencies
- All 5 remaining GDDs must be approved (from Sprint 2 design track)
- Sprint 2 foundation systems fully operational

### Success Criteria
- [ ] Player can complete a level by collecting all light points
- [ ] Player can lose by ball going out of bounds
- [ ] Level data loads from external JSON config
- [ ] At least 5 levels are completable
- [ ] Win/lose transitions work correctly
- [ ] All system acceptance criteria from GDDs pass
- [ ] No physics bugs (tunneling, stuck ball, infinite bounce)
- [ ] Performance: 60fps during gameplay

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GDDs not ready by Sprint 3 start | Low | High | Blocked by Sprint 2 design track -- hard deadline |
| Level design tooling slows level creation | Medium | Medium | Use simple JSON format, create level editor tool if needed |
| Integration of prototype code into production is harder than expected | Medium | Medium | Refactor incrementally, don't rewrite from scratch |
| Difficulty tuning: levels too easy or too hard | High | Low | Expect multiple iterations, plan for tuning sessions |

### Notes
- This is the most code-heavy sprint -- capacity is tight
- Level creation should happen in parallel with implementation
- By end of Sprint 3, the game should be playable end-to-end (minus polish)

---

## Sprint 4 -- Presentation Layer

**2026-04-23 to 2026-04-28 (4 working days)**

### Sprint Goal
Add progression feedback (star ratings) and user interface (HUD, menus, results screen). The game should feel complete from a player's perspective -- clear feedback on performance and clear navigation between levels.

### Capacity
- Total days: 4
- Buffer (20%): 0.75 days
- Available: 3.25 days

### Objectives
1. Implement 星级评价系统 (1-3 star rating based on lines used, time, etc.)
2. Implement UI系统 (HUD, main menu, level select, result screen)
3. Polish visual transitions and feedback
4. Create remaining levels (target: 20 for MVP)

### Tasks

#### Must Have (Critical Path)

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S4-01 | Implement 星级评价系统 (star calculation from line count, display logic) | programmer | 0.5 | S3-04 (关卡系统) | Stars calculated per GDD formula, stored in game state |
| S4-02 | Implement main menu UI (start game button, settings placeholder) | programmer | 0.5 | S2-04 (场景管理) | Main menu loads, can navigate to level select |
| S4-03 | Implement HUD overlay (line counter, light point counter, pause button) | programmer | 0.5 | S2-07, S3-01 | HUD displays real-time game state |
| S4-04 | Implement result screen (win/lose state, star display, retry/next buttons) | programmer | 0.5 | S4-01 | Result screen shows outcome, stars, and navigation |
| S4-05 | Implement level select screen (level list, locked/unlocked, star display) | programmer | 0.5 | S4-01, S3-04 | Player can browse and select levels |
| S4-06 | Polish transitions (fade between scenes, win/lose animations) | programmer | 0.5 | S4-02..S4-05 | Scene transitions are smooth and feel good |
| S4-07 | Create levels 11-20 (medium -> hard progression) | game-designer | 1.0 | S3-05 | 20 total levels, difficulty curve validated |

#### Should Have

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S4-08 | Implement pause menu (pause gameplay, resume/retry/quit options) | programmer | 0.5 | S4-03 | Pause freezes game, menu accessible |
| S4-09 | Add tutorial overlay (first-play guidance for drawing and launching) | programmer | 0.5 | S4-03 | New players understand controls within 30 seconds |
| S4-10 | WeChat Mini-Game share button integration | programmer | 0.5 | S4-04 | Player can share result from result screen |

### Deliverables
- Star rating system working
- Full UI flow: main menu -> level select -> gameplay -> result -> next level
- 20 playable levels
- Game is feature-complete from player's perspective

### Dependencies
- Sprint 3 feature systems fully operational
- 星级评价系统 and UI系统 GDDs approved

### Success Criteria
- [ ] Stars are calculated correctly per GDD formula
- [ ] Player can navigate full flow without encountering dead ends
- [ ] All 20 levels are completable
- [ ] HUD accurately reflects game state in real-time
- [ ] Result screen displays correct outcome and stars
- [ ] Level select shows locked/unlocked status correctly
- [ ] UI is usable on target screen size (750x1334)

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| UI layout breaks on different screen sizes | Medium | Medium | Test on target resolution early, use Cocos UI layout system |
| 20 levels require more design time than expected | Medium | Medium | Ship with 10-15 levels if needed -- level count is flexible |
| Star rating formula feels unfair | Medium | Low | Playtest and tune -- star thresholds are easy to adjust |

### Notes
- Focus on usability over beauty -- clean and functional is enough for MVP
- WeChat-specific features (share, ads) can be stubbed for now
- This sprint should leave the game in a "playable demo" state

---

## Sprint 5 -- Polish & Integration

**2026-04-29 to 2026-05-02 (4 working days)**

### Sprint Goal
Polish the game to release quality: fix bugs, optimize performance, balance levels, and validate the complete experience through playtesting. Prepare for MVP release.

### Capacity
- Total days: 4
- Buffer (20%): 0.75 days
- Available: 3.25 days

### Objectives
1. Fix all known bugs (S1 and S2 severity)
2. Performance optimization to meet budgets
3. Level balance and difficulty tuning
4. Playtesting with feedback collection
5. WeChat Mini-Game build and testing
6. Release preparation

### Tasks

#### Must Have (Critical Path)

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S5-01 | Bug bash: fix all S1/S2 bugs from previous sprints | programmer | 1.0 | Sprint 4 complete | Zero S1 bugs, zero S2 bugs |
| S5-02 | Performance optimization (frame time, draw calls, memory) | programmer | 0.5 | Sprint 4 complete | 60fps stable, draw calls < 100, memory < 50MB |
| S5-03 | Level balance pass (tune difficulty, verify all 20 levels completable with 3 stars) | game-designer | 0.5 | S5-01 | All levels beatable, difficulty curve smooth |
| S5-04 | Playtest session (3-5 testers, collect feedback) | producer | 0.5 | S5-01 | Playtest report written, top 5 issues identified |
| S5-05 | Address top playtest issues | programmer | 0.5 | S5-04 | Critical playtest feedback addressed |
| S5-06 | WeChat Mini-Game build test (build, test on real device) | programmer | 0.5 | S5-01 | Game runs on WeChat developer tools without errors |
| S5-07 | Final QA pass (full playthrough of all levels) | producer + QA | 0.5 | S5-05 | All 20 levels complete, no crashes, no soft-locks |

#### Should Have

| ID | Task | Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------|-----------|-------------|-------------------|
| S5-08 | Add sound effect polish (volume balancing, pitch variation on bounce) | programmer | 0.25 | S5-01 | Audio feels consistent and satisfying |
| S5-09 | Add visual polish (screen shake on lose, confetti on win) | programmer | 0.25 | S5-01 | Win/lose moments feel impactful |
| S5-10 | Create store listing assets (icon, screenshots, description) | producer | 0.25 | None | WeChat store listing ready |
| S5-11 | Write simple tutorial/help text in game | game-designer | 0.25 | S5-01 | New players understand rules without external help |

### Deliverables
- Zero S1/S2 bugs
- Playtest report with feedback
- WeChat Mini-Game build that runs on target platform
- All 20 levels balanced and completable
- MVP ready for release

### Dependencies
- Sprint 4 fully complete
- Access to WeChat developer tools and test device
- Playtesters available

### Success Criteria
- [ ] Zero crash bugs
- [ ] All 20 levels completable
- [ ] At least 3 star ratings achievable on all levels
- [ ] Performance budget met (60fps, <100 draw calls, <50MB memory)
- [ ] WeChat Mini-Game build runs without errors
- [ ] Playtest feedback collected and critical issues addressed
- [ ] No TODO/FIXME/HACK markers in shipped code

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| WeChat build has unexpected issues | Medium | High | Build early (S5-06), leave time for platform-specific fixes |
| Playtest reveals fundamental design flaw | Low | **Critical** | If core mechanic is unfun, consider pivot -- but unlikely after Sprint 1 validation |
| Performance issues on low-end devices | Medium | Medium | Profile on WeChat dev tools, reduce particle count if needed |
| Bug count higher than expected | Medium | Medium | Prioritize S1/S2 only; S3 bugs ship with known issues list |

### Notes
- This sprint has significant buffer for unexpected issues
- If the game is not ready for release, identify what is blocking and extend by 2-3 days
- Document all known issues for future sprints (post-MVP)
- Celebrate the MVP milestone

---

## Cross-Sprint Risk Register

| # | Risk | Probability | Impact | Owner | Mitigation | Status |
|---|------|------------|--------|-------|------------|--------|
| R1 | Core bounce mechanic does not feel satisfying | Medium | Critical | creative-director | Sprint 1 prototype validates early | Open |
| R2 | Scope creep (adding features beyond MVP) | High | High | producer | Strict MVP definition, cut features not in systems index | Open |
| R3 | WeChat Mini-Game platform limitations | Medium | Medium | technical-director | Build early on platform, test regularly | Open |
| R4 | Design docs not ready when implementation starts | Medium | High | game-designer | Sprint 2 parallel design track | Open |
| R5 | Physics performance on low-end devices | Low | Medium | technical-director | Profile early, keep particle count low | Open |
| R6 | Level design quality inconsistent | Medium | Medium | game-designer | Playtest levels, define star rating tuning knobs | Open |
| R7 | Team burnout (aggressive 4-week timeline) | Low | Medium | producer | 20% buffer per sprint, cut scope if needed | Open |

---

## Scope Management Rules

### What Is In Scope (MVP)
- 14 systems as defined in systems-index.md
- 20 handcrafted levels
- Full core loop: draw -> bounce -> collect -> win/lose
- Star rating system
- Basic UI flow
- WeChat Mini-Game build

### What Is NOT In Scope (MVP)
- 存档系统 (save system) -- VS priority
- 皮肤系统 (skin system) -- VS priority
- 排行榜系统 (leaderboard) -- Alpha priority
- Procedural level generation
- Daily challenges
- Ads integration
- Social features beyond basic share

### Scope Cut Priority (if behind schedule)

Cut in this order:
1. Levels 16-20 (ship with 15 levels instead of 20)
2. Levels 11-15 (ship with 10 levels -- minimum viable)
3. Tutorial overlay
4. Pause menu (use system back button)
5. WeChat share button
6. Visual polish (particles, screen shake)
7. Audio polish (pitch variation)

**Never cut**: Ball physics, line drawing, light point collection, out-of-bounds, basic UI

---

## Definition of Done (All Sprints)

- [ ] All Must Have tasks completed and passing acceptance criteria
- [ ] No S1 or S2 severity bugs in delivered features
- [ ] Code follows coding standards (doc comments, no `any`, config-driven)
- [ ] Unit tests for core logic passing
- [ ] Design documents updated for any deviations from GDD
- [ ] Performance within budget (60fps, <100 draw calls)

---

*Generated by Producer Agent on 2026-04-04*
*Next action: Review this plan, then execute Sprint 1 prototype*
