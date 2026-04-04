# ADR-001: 2D Physics Engine Selection

**Date**: 2026-04-04
**Status**: Accepted
**Context**: Pre-Production Gate Check

## Context

反弹达人 requires 2D physics for ball movement, line collision, gravity, and bounce restitution. We need to decide whether to use Cocos Creator's built-in 2D physics (Box2D) or implement custom physics.

## Decision

Use **Cocos Creator's built-in 2D physics system (Box2D)**.

## Rationale

1. **Native integration**: Cocos Creator 3.8.8 provides RigidBody2D, Collider2D, PolygonCollider2D, CircleCollider2D as first-class components
2. **No EdgeCollider2D limitation**: Can be worked around with PolygonCollider2D using 4-point thin rectangles (validated in prototype)
3. **Proven in prototype**: The bounce mechanic prototype (`prototypes/bounce-mechanic/`) successfully uses Box2D with:
   - Dynamic RigidBody2D (ball) with bullet=true for CCD
   - Static RigidBody2D (lines) with PolygonCollider2D
   - Restitution, friction, gravity all configurable
4. **WeChat Mini-Game compatible**: Built-in physics runs on all target platforms
5. **No additional dependency**: Avoids adding a custom physics library

## Consequences

- **Positive**: No physics library to maintain, prototype-validated approach, standard Cocos patterns
- **Negative**: Box2D has some quirks (no thin edge colliders, contact filtering limitations), physics step not fully controllable
- **Risk**: If performance becomes an issue with many colliders, may need contact filtering optimization

## Related

- Prototype: `prototypes/bounce-mechanic/`
- GDD: `design/gdd/ball-physics-system.md`, `design/gdd/line-bounce-system.md`
- GDD: `design/gdd/collision-system.md`
