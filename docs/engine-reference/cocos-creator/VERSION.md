# Cocos Creator — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Cocos Creator 3.8.8 |
| **Release Date** | February 2026 |
| **Project Pinned** | 2026-03-24 |
| **Last Docs Verified** | 2026-03-24 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

The LLM's training data covers Cocos Creator up to approximately version 3.6-3.7.
Version 3.8.x may contain changes that the model does NOT know about.
Always cross-reference official documentation before suggesting APIs.

## Risk Level

**MEDIUM** — Version is slightly beyond training data, but Cocos Creator API is relatively stable.

## Official Resources

- **Official Docs**: https://docs.cocos.com/creator/3.8/
- **API Reference**: https://docs.cocos.com/creator/3.8/api/
- **Chinese Docs**: https://docs.cocos.com/creator/3.8/manual/zh/
- **GitHub**: https://github.com/cocos/cocos-engine
- **Download**: https://www.cocos.com/en/creator-download

## Platform Support

| Platform | Support Status |
|----------|---------------|
| **WeChat Mini Game** | ✅ Primary target |
| **Web (HTML5)** | ✅ Supported |
| **iOS Native** | ✅ Planned for Phase 2 |
| **Android Native** | ✅ Supported |
| **Windows/Mac** | ✅ Supported (development) |

## Key Features for This Project

### 2D Game Development
- Native 2D rendering pipeline
- Sprite, Label, Mask, Layout components
- UI system with Widget and Canvas
- Spine and DragonBones animation support

### WeChat Mini Game
- Built-in WeChat Mini Game build target
- Engine plugin for reduced package size
- WeChat SDK integration (login, share, payment, ads)

### TypeScript Support
- Full TypeScript support with type definitions
- Component-based architecture
- Decorator system (`@property`, `@ccclass`)

### Asset Management
- AssetDatabase for editor-time assets
- `resources` folder for runtime loading
- Remote asset loading via HTTP
- Asset bundle for code splitting

## Project Structure Convention

```
assets/
├── scenes/           # 场景文件
├── scripts/          # TypeScript 脚本
│   ├── components/   # 通用组件
│   ├── systems/      # 游戏系统
│   ├── data/         # 数据模型
│   └── utils/        # 工具函数
├── textures/         # 纹理图片
├── audio/            # 音频文件
├── prefabs/          # 预制体
├── animations/       # 动画资源
└── resources/        # 运行时加载资源
```

## Next Steps

- Read `wechat-mini-game.md` for WeChat Mini Game development guide
- Check official docs for any API uncertainties
- Run `/setup-engine refresh` to update reference docs when new versions release
