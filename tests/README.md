# Test Framework — 反弹达人 (Bounce Master)

## Framework

- **Runner**: Jest (TypeScript via ts-jest)
- **Location**: `tests/`
- **Structure**:
  ```
  tests/
  ├── unit/
  │   ├── core/          — Core system tests (collision, boundary, game state, input, scene, visual, audio)
  │   └── gameplay/      — Gameplay system tests (ball physics, line bounce, light point, OOB, level)
  ├── integration/       — Multi-system integration tests
  └── README.md          — This file
  ```

## Naming Convention

- Files: `[system]_[feature].test.ts`
- Functions: `test('[scenario] [expected]', () => {})`

## Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test tests/unit/core/   # Run specific directory
```

## Test Standards

- Tests must be deterministic (no random seeds, no time-dependent assertions)
- Each test sets up and tears down its own state
- Unit tests do not call external APIs or file I/O
- Use dependency injection over singletons
- Test fixtures use constant files or factory functions

## Coverage

Run coverage with:
```bash
npm test -- --coverage
```

Minimum coverage targets:
- Core systems (formulas, state machines): 80%
- Gameplay systems: 70%
- Integration paths: 60%
