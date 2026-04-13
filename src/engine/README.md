# Engine Adapter Directory

This directory contains Cocos Creator engine adapters — TypeScript components
that bridge the pure-logic game systems to the Cocos Creator API.

## Files

| File | Purpose |
|------|---------|
| `GameplaySceneAdapter.ts` | Main scene component: owns GameCoordinator, wires callbacks, forwards lifecycle/touch/collision events |
| `InputBridge.ts` | Standalone touch-to-logic bridge for input forwarding |

## Architecture

```
Cocos Creator Engine
    ↓ lifecycle / touch / collision
Engine Adapters (this directory)
    ↓ method calls + callbacks
Pure Logic Systems (src/core, src/gameplay, src/ui)
```

The adapters are the **only** files that import from `cc` (Cocos Creator).
All game logic lives in pure TypeScript and is fully testable without the engine.

## Note on Compilation

These files require Cocos Creator's TypeScript environment to compile.
They are excluded from the Jest test suite because they depend on `cc` module.
When running inside Cocos Creator, the engine provides these types.
