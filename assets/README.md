# Assets Directory

Cocos Creator 游戏资源目录。

## 目录结构

```
assets/
├── scenes/           # 场景文件 (.scene)
├── scripts/          # TypeScript 脚本 (从 src/ 链接或复制)
├── textures/         # 纹理图片
│   ├── ui/           # UI 界面素材
│   ├── items/        # 物品图标
│   ├── characters/   # 角色立绘/精灵
│   └── backgrounds/  # 背景图
├── audio/            # 音频文件
│   ├── bgm/          # 背景音乐
│   ├── sfx/          # 音效
│   └── voice/        # 语音
├── prefabs/          # 预制体 (.prefab)
│   ├── ui/           # UI 预制体
│   └── gameplay/     # 游戏玩法预制体
├── animations/       # 动画资源
│   ├── ui/           # UI 动画
│   └── characters/   # 角色动画
├── fonts/            # 字体文件 (.ttf, .fnt)
├── data/             # 数据文件
│   └── config/       # 运行时配置 (JSON)
└── resources/        # 运行时动态加载资源
```

## 资源命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 纹理 | `snake_case.png` | `village_bg.png` |
| 音频 | `snake_case.mp3` | `bgm_spring.mp3` |
| 预制体 | `PascalCase.prefab` | `Player.prefab` |
| 场景 | `PascalCase.scene` | `MainMenu.scene` |

## 注意事项

- `resources/` 目录下的资源会通过 `resources.load()` 动态加载
- 大文件 (>500KB) 应考虑使用远程加载而非打包进主包
- 音频文件优先使用 MP3 格式 (微信小游戏兼容性)
