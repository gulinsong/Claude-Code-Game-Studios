# ADR-005: Audio System -- Callback-Based Audio Dispatch

**Date**: 2026-04-10
**Status**: Accepted
**Context**: Sprint 1 Implementation

## Context

反弹达人 needs centralized audio management for 6 sound effect types and 2 music tracks, with per-channel volume control, mute support, and concurrent playback limiting. Audio is a core pillar of the "物理爽感" (physics satisfaction) experience -- every bounce, collection, and game outcome must have crisp, timely audio feedback. The audio system sits at the Foundation layer and must not depend on the engine's audio implementation directly, so it can be unit-tested and ported if needed.

The GDD (`design/gdd/audio-system.md`) defines volume calculation as `masterVolume * channelVolume * soundVolume`, a concurrent sound limit, and 4 audio states (Muted, SFX Only, BGM Only, Full Audio). This ADR captures the architectural decision for an engine-agnostic audio dispatch system.

## Decision

Use a **callback-based audio dispatcher** with a three-tier volume multiplication formula, concurrent sound limiting (max 8), and a SoundType/MusicType enum-driven API. The logic layer calculates effective volumes and manages playback policy; the engine layer handles actual audio playback through registered callbacks.

### Architecture

```
Gameplay Events (collision, collection, phase change)
    |
    v
+------------------------+
|  AudioSystem           |         Callbacks
|                        +--------------------> Engine Audio Adapter
|  Volume Calculation    |                     (actual playback)
|  Concurrent Limiting   |
|  Mute Management       |
+------------------------+

Sound Types: BOUNCE, COLLECT, WIN, LOSE, LINE_PLACE, LINE_UNDO
Music Types: MENU, GAMEPLAY
```

### Key Interfaces

```typescript
enum SoundType {
  BOUNCE = 'BOUNCE',
  COLLECT = 'COLLECT',
  WIN = 'WIN',
  LOSE = 'LOSE',
  LINE_PLACE = 'LINE_PLACE',
  LINE_UNDO = 'LINE_UNDO',
}

enum MusicType {
  MENU = 'MENU',
  GAMEPLAY = 'GAMEPLAY',
}

interface AudioCallbacks {
  onPlaySound(soundType: SoundType, volume: number): void;
  onPlayMusic(musicType: MusicType, volume: number): void;
  onStopMusic(): void;
  onStopSound(soundType: SoundType): void;
}

// Core methods
playSound(type: SoundType): void;
playMusic(type: MusicType): void;
stopMusic(): void;
setMasterVolume(volume: number): void;
setSFXVolume(volume: number): void;
setBGMVolume(volume: number): void;
setMute(mute: boolean): void;
```

### Implementation Guidelines

1. **Volume formula**: `effectiveVolume = masterVolume * channelVolume * baseVolume`. `masterVolume` and `channelVolume` (SFX or BGM) are user settings (0.0-1.0). `baseVolume` comes from `AUDIO_CONFIG` per sound/music asset.
2. **Concurrent limiting**: Track active sounds count. If `activeSounds >= MAX_CONCURRENT_SOUNDS` (8), stop the oldest sound before playing the new one. This prevents audio spam during rapid bounce chains.
3. **Mute behavior**: When muted, `playSound()` and `playMusic()` are no-ops at the logic layer. Calling `stopMusic()` signals the engine layer to stop any currently playing music. Unmuting does not auto-resume music; the scene must re-request it.
4. **Engine adapter**: The engine layer receives callbacks with pre-calculated volume values. It maps `SoundType`/`MusicType` enums to actual asset paths and calls Cocos Creator's `AudioSource` API.
5. **Config-driven via AUDIO_CONFIG**: All default volumes, concurrent limits, and fade times are externalized. Default values: `MASTER_VOLUME_DEFAULT=1.0`, `SFX_VOLUME_DEFAULT=1.0`, `BGM_VOLUME_DEFAULT=0.7`, `MAX_CONCURRENT_SOUNDS=8`, `MUSIC_FADE_TIME=0.5s`.

## Rationale

1. **Pure logic layer, no engine dependencies**: The audio system imports no Cocos Creator modules. All playback is delegated through callbacks, making the volume calculation, concurrent limiting, and mute logic fully unit-testable.
2. **Concurrent limiting prevents audio spam**: Without limiting, rapid bounce chains could queue dozens of overlapping sounds, causing distortion and performance degradation. The 8-sound cap with oldest-first eviction is a standard game audio pattern.
3. **Three-tier volume formula allows granular control**: `masterVolume * channelVolume * baseVolume` means the user can adjust master volume, SFX volume independently, and each sound can have its own base volume from config. This matches the GDD's requirement for separate master/SFX/BGM sliders.
4. **Enum-driven API is type-safe**: Using `SoundType` and `MusicType` enums instead of string literals prevents typos and makes it easy to audit which audio events are supported.
5. **Config values from AUDIO_CONFIG**: All tunable parameters are externalized per the GDD tuning knobs, enabling balancing without code changes.

## Consequences

- **Positive**: Fully unit-testable volume calculation and concurrent limiting logic. Type-safe audio API prevents invalid sound requests. Granular volume control matching the GDD specification. Consistent callback pattern with Input and Visual Feedback systems. Audio failures (missing assets) are isolated to the engine layer and cannot crash the game.
- **Negative**: Callback registration must happen before gameplay events arrive, or sounds will be silently dropped. The concurrent limiting strategy (stop oldest) may cut off long-duration sounds (like WIN) if many short sounds fire immediately after. Music crossfading between MENU and GAMEPLAY is the engine adapter's responsibility and adds complexity there. The 8-sound concurrent cap is a fixed default; different device capabilities may warrant different limits.

## Related

- GDD: `design/gdd/audio-system.md` (volume formulas, edge cases, tuning knobs, audio states)
- GDD: `design/gdd/ball-physics-system.md` (triggers BOUNCE sound)
- GDD: `design/gdd/light-point-collection-system.md` (triggers COLLECT sound)
- GDD: `design/gdd/input-system.md` (triggers LINE_PLACE, LINE_UNDO sounds)
- GDD: `design/gdd/scene-management.md` (triggers MENU/GAMEPLAY music switching)
- Source: `src/foundation/AudioSystem.ts`
