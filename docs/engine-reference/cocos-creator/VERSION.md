# Cocos Creator — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Cocos Creator 3.8.8 LTS |
| **Release Date** | December 16, 2025 |
| **Project Pinned** | 2026-03-27 |
| **Last Docs Verified** | 2026-03-27 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

The LLM's training data likely covers Cocos Creator up to ~3.7. Version 3.8.x
introduced some changes that the model may not be fully aware of. Cross-reference
this directory before suggesting Cocos Creator APIs.

## Risk Level: MEDIUM

Version 3.8.8 is approximately 7 months beyond the LLM training cutoff.
Most APIs should be accurate, but verify any 3.8-specific features.

## Key Resources

- **Official Docs**: https://docs.cocos.com/creator/3.8/manual/en/
- **API Reference**: https://docs.cocos.com/creator/3.8/api/en/
- **Download**: https://www.cocos.com/en/creator-download
- **Forum**: https://forum.cocosengine.org/c/creator/33
- **GitHub**: https://github.com/cocos/cocos-engine

## Version 3.8 Highlights

- **LTS Release**: Long-term support version
- **Spine Support**: Both Spine 3.8 and Spine 4.2 (selectable via Engine Feature Trimming)
- **HarmonyOS Next**: Game controller support added
- **Android 16KB Page Size**: Compatibility support
- **Bundle Config**: Auto-migrated to project settings on upgrade

## Migration Notes

### From v2.x to v3.x

Major breaking changes:
- Material system completely redesigned
- `loader` module replaced with `assetManager`
- Scene structure changes
- Component lifecycle changes

### From v3.5+

- AppDelegate moved to internal for Mac/Windows native builds
- Gradle plugin updates required for Android

## WeChat Mini-Game Specifics

Cocos Creator has native WeChat Mini-Game support:

1. **Build Target**: Select "WeChat Mini Game" in Build panel
2. **SDK Integration**: Use `wx` API for WeChat-specific features
3. **Size Limit**: Keep main package under 4MB (subpackages for larger games)
4. **Open Data Context**: Separate context for leaderboards/social features

## Key APIs for This Project

### 2D Physics
```typescript
import { RigidBody2D, Collider2D, Contact2DType } from 'cc';
```

### Input (Touch/Draw)
```typescript
import { input, Input, EventTouch } from 'cc';
```

### Node Management
```typescript
import { Node, instantiate, Vec2, Vec3 } from 'cc';
```

## Next Steps

If encountering API uncertainties:
1. Check official API docs: https://docs.cocos.com/creator/3.8/api/en/
2. Search the forum: https://forum.cocosengine.org/c/creator/33
3. Use WebSearch to verify recent API changes
