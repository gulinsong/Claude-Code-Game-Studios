# Art Bible: 岁时记 (Suìshí Jì)

## Document Status
- **Version**: 1.0
- **Last Updated**: 2026-03-26
- **Owned By**: art-director
- **Status**: Approved

---

## Visual Identity Summary

岁时记采用温馨治愈的像素风格，融合中国传统美学元素。画面以柔和的色调为主，四季有明显的色彩变化。角色设计简洁可爱，场景有手绘质感的细节装饰。整体氛围温暖、放松，让玩家感受到古村落的宁静与人情味。

---

## Reference Board

| Reference | Medium | What We're Taking |
| --------- | ------ | ----------------- |
| 《星露谷物语》 | Game | 像素风格、温馨氛围、四季变化 |
| 《江南百景图》 | Game | 中国传统美学、水墨元素、节日氛围 |
| 《旅行青蛙》 | Game | 简约画风、治愈感、小程序适配 |
| 《太吾绘卷》 | Game | 中国古风像素、传统文化表现 |
| Kenney Assets | Asset Pack | 简洁UI图标、免费商用 |
| Pixel Frog Assets | Asset Pack | 免费像素素材、可改造 |

---

## Color Palette

### Primary Palette

| Name | Hex | Usage |
| ---- | --- | ----- |
| 自然绿 | `#4A7C59` | 主色调，春天、生机、自然 |
| 温暖棕 | `#D4A574` | 辅助色，秋天、丰收、木质 |
| 米白色 | `#F5E6D3` | 背景色，温暖舒适 |
| 中国红 | `#C75146` | 强调色，节日、喜庆 |
| 深灰 | `#2D2D2D` | 文字色，确保可读性 |

### Season Color Mapping

| Season | Primary | Secondary | Accent | Mood |
| ------ | ------- | --------- | ------ | ---- |
| 春 Spring | `#A8D5BA` 浅绿 | `#FFB7C5` 樱粉 | `#4A7C59` 深绿 | 生机、希望 |
| 夏 Summer | `#7BC47F` 翠绿 | `#4ECDC4` 清蓝 | `#FFD93D` 阳光黄 | 活力、热情 |
| 秋 Autumn | `#D4A574` 暖棕 | `#E8A838` 金黄 | `#C75146` 红叶 | 丰收、温馨 |
| 冬 Winter | `#E8E8E8` 雪白 | `#B8D4E3` 冰蓝 | `#8B7355` 枯褐 | 宁静、期待 |

### Festival Color Accents

| Festival | Accent Color | Usage |
| -------- | ------------ | ----- |
| 春节 | `#E74C3C` 大红 | 灯笼、对联、红包 |
| 清明 | `#7CB342` 嫩绿 | 青团、柳枝 |
| 端午 | `#2E7D32` 深绿 | 粽叶、艾草 |
| 七夕 | `#9C27B0` 紫色 | 鹊桥、星空 |
| 中秋 | `#FFC107` 金黄 | 月亮、月饼 |
| 重阳 | `#FF9800` 橙色 | 菊花、茱萸 |
| 冬至 | `#FAFAFA` 雪白 | 饺子、汤圆 |

---

## Art Style

### Rendering Style
**像素风格 (Pixel Art)** - 16x16 或 32x32 基础单位

- 角色和物品使用 32x32 像素
- 场景 Tile 使用 16x16 像素
- UI 元素使用 32x32 或 64x64 像素
- 整体风格简洁，但保留关键细节

### Proportions
- **角色**: 2-3 头身，Q版可爱风格
- **建筑**: 1.5x 宽于角色，可进入
- **物品**: 1x1 格子大小
- **场景**: 垂直视角偏移 45°（类似星露谷）

### Level of Detail
- **角色**: 简洁轮廓，关键特征（发型、服装），基础动画（4-8帧）
- **环境**: 关键元素突出（树木、建筑），背景简化，装饰性细节适量
- **UI**: 扁平化设计，圆角，中国风边框装饰

### Visual Hierarchy
1. **交互元素** (NPC、物品、建筑入口) - 最亮、有轮廓光
2. **角色** - 独特颜色、动态
3. **环境** - 中等亮度、静态
4. **背景** - 最暗、模糊

---

## Character Art Standards

### Base Character Template
```
    ████████  ← 头部 (8x8)
  ████████████
  ██  ●  ●  ██  ← 眼睛
  ██    ▼    ██  ← 嘴巴
  ████████████
    ████████
  ████████████  ← 身体 (12x8)
  ██        ██
  ██  ████  ██  ← 腿部
    ████  ████
```

### Character Specifications

| Attribute | Value |
| --------- | ----- |
| Canvas Size | 32x32 px |
| Color Count | ≤ 16 colors per character |
| Animation Frames | 4 (idle), 4 (walk), 2 (interact) |
| Outline | 1px dark outline, consistent |

### Villager Color Coding

| Villager Type | Primary Color | Example |
| ------------- | ------------- | ------- |
| 长老 | 深灰 `#5D5D5D` | 村长 |
| 商人 | 棕色 `#8B4513` | 杂货店老板 |
| 农人 | 绿色 `#228B22` | 农夫 |
| 手艺人 | 蓝色 `#4169E1` | 裁缝、木匠 |
| 年轻人 | 亮色系 | 学生、旅人 |

---

## Environment Art Standards

### Tile Specifications

| Tile Type | Size | Format | Notes |
| --------- | ---- | ------ | ----- |
| Ground | 16x16 | PNG | 无缝平铺 |
| Building | 64x64 | PNG | 居中对齐 |
| Tree | 32x48 | PNG | 底部对齐 |
| Prop | 16x16/32x32 | PNG | 按实际大小 |

### Scene Layers
1. **Ground** - 地面纹理、道路
2. **Decoration** - 小物件、花草
3. **Building Base** - 建筑底层
4. **Character** - 角色层
5. **Building Top** - 建筑顶层（遮挡）
6. **Overlay** - 天气、光影效果

### Seasonal Variations

| Element | 春 | 夏 | 秋 | 冬 |
| ------- | - | - | - | - |
| 树木 | 嫩绿叶 | 深绿叶 | 黄红叶 | 秃枝+雪 |
| 地面 | 青草 | 绿草 | 落叶 | 雪地 |
| 天空 | 浅蓝 | 深蓝 | 橙红 | 灰白 |
| 花朵 | 樱花 | 荷花 | 菊花 | 梅花 |

---

## UI Art Standards

### Button Style
- 圆角矩形 (8px radius)
- 中国风边框装饰（可选）
- 3 态: Normal, Hover, Pressed
- 最小尺寸: 120x48 px

### Typography
- 主字体: 思源黑体 / Noto Sans SC
- 装饰字体: 方正清刻本悦宋 (标题)
- 最小字号: 14px (正文), 24px (标题)

### Icon Style
- 32x32 px 基础尺寸
| 1px 描边
- 扁平化 + 简化细节
| 统一圆角

### Panel Style
- 背景: `#F5E6D3` 米白 + 20% 透明
- 边框: `#4A7C59` 自然绿 2px
- 阴影: 4px 模糊，向下偏移

---

## VFX Standards

### Particle Effects

| Effect Type | Max Particles | Duration |
| ----------- | ------------- | -------- |
| 落叶 | 20 | 2s loop |
| 雪花 | 30 | 3s loop |
| 花瓣 | 15 | 2s loop |
| 烟花 | 50 | 1.5s |
| 烟雾 | 10 | 2s loop |

### Animation Standards
- **帧率**: 12 FPS (角色), 24 FPS (特效)
- **循环**: 无缝循环，注意首尾帧衔接
- **过渡**: 0.2-0.3s 淡入淡出

---

## AI Generation Guidelines

### Recommended AI Tools
1. **Midjourney** - 概念图、背景
2. **DALL-E 3** - 物品图标
3. **PixelLab** - 像素风格调整
4. **Aseprite** - 像素编辑、动画

### Prompt Templates

#### 角色生成
```
pixel art character, [描述], Chinese traditional style,
cute chibi proportion, 32x32 pixels, limited color palette,
transparent background, game asset, top-down view
```

示例:
```
pixel art character, elderly Chinese village elder with beard,
wearing traditional gray robe, cute chibi proportion,
32x32 pixels, 16 colors, transparent background, game asset
```

#### 物品生成
```
pixel art [物品名], Chinese traditional style, isometric view,
32x32 pixels, clean outline, game icon, transparent background
```

示例:
```
pixel art red lantern, Chinese traditional style, glowing,
32x32 pixels, clean outline, game icon, transparent background
```

#### 场景生成
```
pixel art [场景描述], Chinese village, [季节] atmosphere,
top-down view, 16x16 tile style, warm colors, cozy mood,
game background, no characters
```

示例:
```
pixel art village center with ancient well, Chinese village,
spring atmosphere, cherry blossoms, top-down view,
16x16 tile style, warm colors, cozy mood, game background
```

### AI Generation Workflow
1. 使用 AI 生成基础图像
2. 在 Aseprite 中调整为标准像素尺寸
3. 优化颜色数量 (≤16 colors)
4. 添加透明背景
5. 调整为项目风格一致性
6. 创建动画帧（如需要）

---

## Placeholder Resources Strategy

### Phase 1: MVP 占位资源
使用免费素材库资源作为占位:

| Resource Type | Source | License |
| ------------- | ------ | ------- |
| UI Icons | [Kenney](https://kenney.nl/assets) | CC0 |
| Pixel Characters | [Pixel Frog](https://pixel-frog.itch.io/) | CC0 |
| Tiles | [Kronbits](https://kronbits.itch.io/) | CC0 |
| Sound Effects | [Freesound](https://freesound.org/) | CC0 |

### Phase 2: AI 替换
逐步用 AI 生成的定制资源替换占位资源

### Phase 3: 最终美术
根据预算考虑:
- 继续使用 AI + 人工调整
- 聘请像素美术师
- 购买商业素材包

---

## Asset Production Standards

### File Naming Convention

```
[category]_[name]_[variant].[ext]

Examples:
char_elder_idle_01.png
item_lantern_red.png
tile_ground_grass_spring.png
ui_btn_primary_normal.png
```

### Folder Structure

```
assets/
├── textures/
│   ├── characters/
│   │   ├── player/
│   │   └── villagers/
│   ├── items/
│   │   ├── materials/
│   │   ├── food/
│   │   └── tools/
│   ├── backgrounds/
│   │   ├── spring/
│   │   ├── summer/
│   │   ├── autumn/
│   │   └── winter/
│   └── ui/
│       ├── buttons/
│       ├── icons/
│       └── panels/
├── animations/
│   ├── characters/
│   └── ui/
└── audio/
    ├── bgm/
    ├── sfx/
    └── voice/
```

### Export Settings

| Asset Type | Format | Max Size | Color Space |
| ---------- | ------ | -------- | ----------- |
| Textures | PNG | 512x512 | sRGB |
| Icons | PNG | 64x64 | sRGB |
| Animations | PNG sequence | 32x32/frame | sRGB |
| Audio (SFX) | MP3 | < 100KB | - |
| Audio (BGM) | MP3 | < 2MB | - |

---

## Quality Checklist

### Before Import
- [ ] 尺寸符合规格
- [ ] 颜色数量 ≤ 16 (角色/物品)
- [ ] 透明背景正确
- [ ] 文件命名规范
- [ ] 无多余空白像素

### Style Consistency
- [ ] 描边粗细一致
- [ ] 色彩风格统一
- [ ] 视角方向一致
- [ ] 细节程度相近

### Accessibility
- [ ] 色盲友好 (不只依赖颜色区分)
- [ ] 对比度足够 (4.5:1 minimum)
- [ ] 图标可辨识 (最小 24x24)

---

*最后更新: 2026-03-26*
