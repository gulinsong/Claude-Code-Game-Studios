# Prototype: 反弹手感验证 (Bounce Feel Validation)

> **Type**: Throwaway prototype
> **Created**: 2026-04-09
> **Purpose**: Validate core physics feel — ball bounce, line drawing, collection
> **Status**: Active
> **Success Criteria**: Ball bounce feels satisfying; line drawing is intuitive; collection triggers correctly

## What This Validates

Per the systems-index, two systems are **HIGH RISK**:
1. **球物理系统** — "反弹手感是核心体验"
2. **画线反弹系统** — "画线→物理挡板转换需要精确"

## Core Loop to Test

1. Touch and drag to draw a line
2. Ball launches and falls with gravity
3. Ball bounces off drawn lines
4. Ball collects light points on contact
5. Ball falls out of bottom boundary = fail

## Implementation

This is a single-file HTML prototype using a simple 2D canvas (no engine).
The goal is to validate the feel, not to build production code.

### Physics Parameters (from GDDs)
- GRAVITY: 980 px/s²
- BALL_RADIUS: 15px
- BALL_INITIAL_SPEED: 300 px/s
- MAX_BALL_SPEED: 1500 px/s
- MIN_BALL_SPEED: 50 px/s
- LINE_RESTITUTION: 0.95
- BOUNDARY_RESTITUTION: 0.8
- MAX_LINES: 3
- COLLECTION_TOLERANCE: 5px
- LIGHTPOINT_VISUAL_RADIUS: 12px

### Controls
- Touch/click and drag to draw lines (max 3)
- Click "Launch" button or auto-launch after first line
- Click "Reset" to restart

## Results

_To be filled after testing_

- [ ] Ball bounce angle feels correct (incident ≈ reflected)
- [ ] Gravity feels natural (not too fast, not too slow)
- [ ] Drawing lines is intuitive
- [ ] Collection triggers reliably
- [ ] 3-line limit creates good strategy tension
- [ ] Ball out-of-bounds is clear and fair

## Notes

- This prototype will be discarded after validation
- Parameters validated here will feed into production implementation
- If bounce feel is unsatisfying, adjust GRAVITY and RESTITUTION before coding production systems
