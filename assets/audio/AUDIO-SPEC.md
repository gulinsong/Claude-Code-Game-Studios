# Audio Asset Specification

All audio assets for 反弹达人 (Bounce Master). Contains specs for 12 SFX + 2 BGM.

## Format Requirements

| Property | SFX | BGM |
|----------|-----|-----|
| **Format** | MP3 (primary), OGG (fallback) | MP3 (primary), OGG (fallback) |
| **Sample Rate** | 44100 Hz | 44100 Hz |
| **Channels** | Mono | Stereo |
| **Bit Rate** | 128 kbps | 128 kbps |
| **Max File Size** | 50 KB each | 500 KB each |

> WeChat Mini-Game total package limit: 4MB (main package). Audio should be
> loaded on-demand or in subpackages to stay within budget.

---

## Sound Effects (SFX) — `assets/audio/sfx/`

### 1. `bounce` — 反弹音效
| Property | Value |
|----------|-------|
| **Duration** | 0.15 - 0.25s |
| **Waveform** | Short sine wave pluck, fast decay |
| **Frequency** | 800-1200 Hz (pitch varies with ball speed) |
| **Envelope** | Sharp attack (5ms), fast decay (150ms) |
| **Mood** | Crisp, satisfying "ding" — like a marble hitting glass |
| **Volume** | Base 0.8 |

**Reference**: Wind chime, glass marble bounce, xylophone hit

### 2. `collect` — 收集光点音效
| Property | Value |
|----------|-------|
| **Duration** | 0.3 - 0.5s |
| **Waveform** | Rising sine tone + shimmer |
| **Frequency** | 600 Hz → 1200 Hz (ascending sweep) |
| **Envelope** | Medium attack (20ms), medium decay (300ms) |
| **Mood** | Rewarding "sparkle" — like collecting a coin |
| **Volume** | Base 0.7 |

**Reference**: Coin collect (Mario), crystal chime, bell arpeggio

### 3. `win` — 过关音效
| Property | Value |
|----------|-------|
| **Duration** | 1.0 - 1.5s |
| **Waveform** | Major chord arpeggio (C-E-G-C) |
| **Frequency** | 523 → 659 → 784 → 1047 Hz |
| **Envelope** | Each note: sharp attack, medium decay; notes overlap |
| **Mood** | Triumphant fanfare — "You did it!" |
| **Volume** | Base 0.9 |

**Reference**: Level complete jingle (casual games), victory chime

### 4. `lose` — 失败音效
| Property | Value |
|----------|-------|
| **Duration** | 0.5 - 0.8s |
| **Waveform** | Descending tone + subtle thud |
| **Frequency** | 400 Hz → 200 Hz (descending) |
| **Envelope** | Quick attack, longer decay |
| **Mood** | Gentle disappointment — not harsh, encouraging retry |
| **Volume** | Base 0.6 |

**Reference**: "Wah wah" (mild), soft trombone descend, gentle thud

### 5. `line_place` — 放置线段音效
| Property | Value |
|----------|-------|
| **Duration** | 0.1 - 0.15s |
| **Waveform** | Soft click / snap |
| **Frequency** | 400-600 Hz |
| **Envelope** | Instant attack, very fast decay |
| **Mood** | Satisfying "snap" — line is locked in place |
| **Volume** | Base 0.5 |

**Reference**: Pencil snap, magnet click, pen cap click

### 6. `line_reject` — 线段太短/拒绝
| Property | Value |
|----------|-------|
| **Duration** | 0.1 - 0.15s |
| **Waveform** | Short buzzy tone |
| **Frequency** | 200-300 Hz |
| **Envelope** | Quick attack, fast decay |
| **Mood** | Gentle "nope" — not punitive |
| **Volume** | Base 0.4 |

**Reference**: Soft error beep, muted buzzer

### 7. `button_click` — 按钮点击
| Property | Value |
|----------|-------|
| **Duration** | 0.05 - 0.1s |
| **Waveform** | Very short tap |
| **Frequency** | 1000 Hz |
| **Envelope** | Instant attack, immediate decay |
| **Mood** | Clean UI click |
| **Volume** | Base 0.4 |

### 8. `level_select` — 选择关卡
| Property | Value |
|----------|-------|
| **Duration** | 0.1 - 0.2s |
| **Waveform** | Quick ascending ping |
| **Frequency** | 800 → 1000 Hz |
| **Envelope** | Quick attack, short decay |
| **Mood** | Affirming selection |
| **Volume** | Base 0.5 |

### 9. `world_unlock` — 世界解锁
| Property | Value |
|----------|-------|
| **Duration** | 0.4 - 0.6s |
| **Waveform** | Triumphant ascending sweep + shimmer |
| **Frequency** | 500 → 1500 Hz |
| **Envelope** | Medium attack, medium decay |
| **Mood** | Exciting reveal — new content unlocked! |
| **Volume** | Base 0.7 |

### 10. `pause_open` — 暂停菜单打开
| Property | Value |
|----------|-------|
| **Duration** | 0.1s |
| **Waveform** | Soft slide-down |
| **Frequency** | 600 → 400 Hz |
| **Envelope** | Quick attack, short decay |
| **Mood** | Calm transition |
| **Volume** | Base 0.3 |

### 11. `pause_close` — 暂停菜单关闭
| Property | Value |
|----------|-------|
| **Duration** | 0.1s |
| **Waveform** | Soft slide-up (inverse of pause_open) |
| **Frequency** | 400 → 600 Hz |
| **Envelope** | Quick attack, short decay |
| **Mood** | Getting back to action |
| **Volume** | Base 0.3 |

### 12. `result_appear` — 结果覆盖层出现
| Property | Value |
|----------|-------|
| **Duration** | 0.15s |
| **Waveform** | Whoosh + impact |
| **Frequency** | 300-800 Hz broadband |
| **Envelope** | Quick attack, short decay |
| **Mood** | Dramatic reveal |
| **Volume** | Base 0.5 |

---

## Background Music (BGM) — `assets/audio/bgm/`

### 1. `menu_music` — 主菜单音乐
| Property | Value |
|----------|-------|
| **Duration** | 60-90s (seamless loop) |
| **Tempo** | 90-110 BPM |
| **Key** | C Major or G Major |
| **Instruments** | Soft piano, light synth pads, subtle percussion |
| **Mood** | Relaxed, welcoming — "Come play, no rush" |
| **Loop** | Seamless loop point |
| **Volume** | Base 0.6 |

**Reference**: Cut the Rope menu music, Monument Valley ambient, lo-fi chill

### 2. `gameplay_music` — 游戏场景音乐
| Property | Value |
|----------|-------|
| **Duration** | 60-90s (seamless loop) |
| **Tempo** | 100-120 BPM |
| **Key** | C Major or F Major |
| **Instruments** | Light electronic, plucky synths, gentle beat |
| **Mood** | Light, focused — "You can think, but keep moving" |
| **Loop** | Seamless loop point |
| **Volume** | Base 0.5 |

**Reference**: Casual puzzle game BGM, upbeat but not distracting

---

## Audio Priority Rules

1. SFX always takes priority over BGM
2. When multiple SFX trigger simultaneously, play only the newest
3. MAX_CONCURRENT_SOUNDS = 4 (configurable in GameConfig)
4. BGM crossfade time: 0.5s between menu and gameplay
5. All audio pauses when app goes to background

## Generation Notes

Placeholder audio can be generated programmatically:
- Run `node tools/generate-placeholder-audio.js` to create sine-wave placeholders
- Requires `ffmpeg` to be installed
- Placeholder files help test the audio pipeline before final assets are ready
