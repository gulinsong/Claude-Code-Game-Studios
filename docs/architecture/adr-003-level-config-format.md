# ADR-003: Level Configuration Format

**Date**: 2026-04-04
**Status**: Accepted
**Context**: Pre-Production Gate Check

## Context

反弹达人 has 32 levels across 4 worlds. Level data includes ball spawn position, light point positions, star thresholds, and max lines. We need a format that is easy to author, device-independent, and performant at load time.

## Decision

Use **JSON configuration files with normalized (0-1) coordinates**, converted to pixel coordinates at load time.

## Format

```json
{
  "id": "1-1",
  "world": 1,
  "level": 1,
  "name": "First Bounce",
  "difficulty": 0.1,
  "ball": { "spawn": { "x": 0.5, "y": 0.85 }, "direction": -90 },
  "lightPoints": [{ "x": 0.3, "y": 0.5 }, { "x": 0.7, "y": 0.5 }],
  "starThresholds": { "one": 1, "two": 2, "three": 2 },
  "maxLines": 3,
  "timeLimit": 0,
  "obstacles": []
}
```

## Rationale

1. **Device independence**: Normalized coordinates (0-1) work across all screen sizes. Conversion happens once at load time
2. **Easy authoring**: JSON is human-readable, editable, and diff-friendly
3. **Hot-updatable**: Individual level JSON files can be updated without rebuilding the game (important for WeChat Mini-Game content updates)
4. **Validated by level-system.md**: The GDD defines this format with all field specifications
5. **Scalable**: New levels only require adding a JSON file, no code changes

## Coordinate Conversion

```
pixelX = normalizedX * playableWidth + leftBoundary
pixelY = normalizedY * playableHeight + bottomBoundary
```

Values from the boundary system (playableWidth, playableHeight, leftBoundary, bottomBoundary).

## File Organization

```
assets/data/levels/
├── 1-1.json
├── 1-2.json
├── ...
├── 4-7.json
└── 4-8.json
```

## Consequences

- **Positive**: Device-independent, easy to author, hot-updatable, no code changes for new levels
- **Negative**: Coordinate conversion adds a small load-time cost (~50ms for JSON parse + conversion)
- **Trade-off**: Normalized coordinates are less intuitive than pixel values for designers, but the 0-1 range is simpler

## Related

- GDD: `design/gdd/level-system.md`
- GDD: `design/gdd/boundary-system.md` (provides conversion parameters)
