# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Cocos Creator 3.8.8 LTS
- **Language**: TypeScript (primary), JavaScript (optional)
- **Rendering**: Cocos Creator 2D/3D renderer
- **Physics**: Cocos Creator built-in 2D physics (Box2D) or custom implementation

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: [TO BE CONFIGURED — e.g., PC, Console, Mobile, Web]
- **Input Methods**: [TO BE CONFIGURED — e.g., Keyboard/Mouse, Gamepad, Touch, Mixed]
- **Primary Input**: [TO BE CONFIGURED — the dominant input for this game]
- **Gamepad Support**: [TO BE CONFIGURED — Full / Partial / None]
- **Touch Support**: [TO BE CONFIGURED — Full / Partial / None]
- **Platform Notes**: [TO BE CONFIGURED — any platform-specific UX constraints]

## Naming Conventions

- **Classes**: PascalCase (e.g., `BallController`, `LevelManager`)
- **Variables**: camelCase (e.g., `moveSpeed`, `lineCount`)
- **Functions**: camelCase (e.g., `onBallBounce()`, `createLine()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_LINES`, `BALL_SPEED`)
- **Files**: PascalCase matching class (e.g., `BallController.ts`)
- **Scenes**: PascalCase (e.g., `Level01.scene`, `MainMenu.scene`)
- **Prefabs**: PascalCase (e.g., `Ball.prefab`, `Line.prefab`)

## Performance Budgets

- **Target Framerate**: 60 FPS
- **Frame Budget**: 16.6ms
- **Draw Calls**: Keep under 100 for 2D games
- **Memory Ceiling**: 50MB for WeChat Mini-Game (platform limit varies)

## Testing

- **Framework**: Jest or Cocos Creator built-in test framework
- **Minimum Coverage**: Core mechanics (physics, collision, scoring)
- **Required Tests**: Ball physics, line collision, level completion logic

## Forbidden Patterns

- Avoid using `any` type in TypeScript — use proper interfaces
- Don't put heavy logic in `update()` — use event-driven architecture
- Avoid circular dependencies between components

## Allowed Libraries / Addons

- Cocos Creator official extensions
- [To be added as dependencies are approved]

## Architecture Decisions Log

- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

- **Primary**: [TO BE CONFIGURED — run /setup-engine]
- **Language/Code Specialist**: [TO BE CONFIGURED]
- **Shader Specialist**: [TO BE CONFIGURED]
- **UI Specialist**: [TO BE CONFIGURED]
- **Additional Specialists**: [TO BE CONFIGURED]
- **Routing Notes**: [TO BE CONFIGURED]

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (primary language) | [TO BE CONFIGURED] |
| Shader / material files | [TO BE CONFIGURED] |
| UI / screen files | [TO BE CONFIGURED] |
| Scene / prefab / level files | [TO BE CONFIGURED] |
| Native extension / plugin files | [TO BE CONFIGURED] |
| General architecture review | Primary |
