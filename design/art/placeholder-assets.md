# 占位资源清单

本文档列出所有需要的美术资源及其状态。

---

## 资源优先级

| 优先级 | 说明 | 时间 |
| ------ | ---- | ---- |
| P0 | MVP 必需 | 第1周 |
| P1 | 核心体验 | 第2-3周 |
| P2 | 完整体验 | 第4周+ |

---

## 1. 角色 (Characters)

### 玩家角色

| ID | 资源 | 尺寸 | 帧数 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- | ---- |
| char_player_idle | 玩家待机 | 32x32 | 4 | ⬜ | AI |
| char_player_walk | 玩家行走 | 32x32 | 4 | ⬜ | AI |
| char_player_interact | 玩家交互 | 32x32 | 2 | ⬜ | AI |

### 村民 (P1)

| ID | 资源 | 尺寸 | 帧数 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- | ---- |
| char_elder | 长老 | 32x32 | 4 | ⬜ | AI |
| char_merchant | 商人 | 32x32 | 4 | ⬜ | AI |
| char_farmer | 农夫 | 32x32 | 4 | ⬜ | AI |
| char_craftsman | 手艺人 | 32x32 | 4 | ⬜ | AI |
| char_student | 学生 | 32x32 | 4 | ⬜ | AI |

---

## 2. 物品 (Items)

### 材料类 (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| item_bamboo | 竹子 | 32x32 | ⬜ | AI/Kenney |
| item_paper | 纸张 | 32x32 | ⬜ | AI/Kenney |
| item_flower | 花朵 | 32x32 | ⬜ | AI/Kenney |
| item_herb | 草药 | 32x32 | ⬜ | AI/Kenney |
| item_wood | 木材 | 32x32 | ⬜ | AI/Kenney |
| item_stone | 石头 | 32x32 | ⬜ | AI/Kenney |

### 食物类 (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| item_mooncake | 月饼 | 32x32 | ⬜ | AI |
| item_zongzi | 粽子 | 32x32 | ⬜ | AI |
| item_qingtuan | 青团 | 32x32 | ⬜ | AI |
| item_dumpling | 饺子 | 32x32 | ⬜ | AI |
| item_tangyuan | 汤圆 | 32x32 | ⬜ | AI |

### 工具类 (P1)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| item_lantern | 灯笼 | 32x32 | ⬜ | AI |
| item_sachet | 雅囊 | 32x32 | ⬜ | AI |
| item_kite | 风筝 | 32x32 | ⬜ | AI |
| item_firework | 烟花 | 32x32 | ⬜ | AI |

---

## 3. 场景 (Environments)

### 地面 Tiles (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| tile_grass | 草地 | 16x16 | ⬜ | Kronbits |
| tile_path | 小路 | 16x16 | ⬜ | Kronbits |
| tile_stone | 石板 | 16x16 | ⬜ | Kronbits |
| tile_water | 水面 | 16x16 | ⬜ | Kronbits |

### 建筑 (P1)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| bldg_house | 民居 | 64x64 | ⬜ | AI |
| bldg_shop | 商店 | 64x64 | ⬜ | AI |
| bldg_temple | 祠堂 | 64x64 | ⬜ | AI |
| bldg_well | 水井 | 32x32 | ⬜ | AI |
| bldg_bridge | 桥 | 64x32 | ⬜ | AI |

### 装饰 (P2)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| prop_tree | 树木 | 32x48 | ⬜ | Kronbits |
| prop_flower | 花丛 | 16x16 | ⬜ | Kronbits |
| prop_rock | 岩石 | 16x16 | ⬜ | Kronbits |
| prop_fence | 篱笆 | 32x16 | ⬜ | Kronbits |

### 背景 (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| bg_village_spring | 村庄-春 | 1280x720 | ⬜ | AI |
| bg_village_summer | 村庄-夏 | 1280x720 | ⬜ | AI |
| bg_village_autumn | 村庄-秋 | 1280x720 | ⬜ | AI |
| bg_village_winter | 村庄-冬 | 1280x720 | ⬜ | AI |

---

## 4. UI (User Interface)

### 按钮 (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| ui_btn_primary | 主按钮 (3态) | 120x48 | ⬜ | 自制 |
| ui_btn_secondary | 次按钮 (3态) | 120x48 | ⬜ | 自制 |
| ui_btn_icon | 图标按钮 | 48x48 | ⬜ | 自制 |
| ui_btn_close | 关闭按钮 | 32x32 | ⬜ | Kenney |

### 面板 (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| ui_panel_default | 默认面板 | 9-slice | ⬜ | 自制 |
| ui_panel_dialog | 对话框 | 9-slice | ⬜ | 自制 |
| ui_panel_tooltip | 提示框 | 9-slice | ⬜ | 自制 |

### 图标 (P0)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| ui_icon_settings | 设置 | 32x32 | ⬜ | Kenney |
| ui_icon_backpack | 背包 | 32x32 | ⬜ | Kenney |
| ui_icon_map | 地图 | 32x32 | ⬜ | Kenney |
| ui_icon_mail | 邮件 | 32x32 | ⬜ | Kenney |
| ui_icon_home | 主页 | 32x32 | ⬜ | Kenney |

### 进度条 (P1)

| ID | 资源 | 尺寸 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| ui_bar_health | 体力条 | 100x12 | ⬜ | 自制 |
| ui_bar_exp | 经验条 | 100x8 | ⬜ | 自制 |
| ui_bar_progress | 进度条 | 100x8 | ⬜ | 自制 |

---

## 5. 特效 (VFX)

| ID | 资源 | 类型 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| vfx_leaves | 落叶 | Particle | ⬜ | 自制 |
| vfx_snow | 雪花 | Particle | ⬜ | 自制 |
| vfx_petals | 花瓣 | Particle | ⬜ | 自制 |
| vfx_firework | 烟花 | Particle | ⬜ | 自制 |
| vfx_sparkle | 闪光 | Particle | ⬜ | 自制 |

---

## 6. 音频 (Audio)

### BGM (P1)

| ID | 资源 | 时长 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| bgm_spring | 春之曲 | 2-3min | ⬜ | AI/免费 |
| bgm_summer | 夏之曲 | 2-3min | ⬜ | AI/免费 |
| bgm_autumn | 秋之曲 | 2-3min | ⬜ | AI/免费 |
| bgm_winter | 冬之曲 | 2-3min | ⬜ | AI/免费 |
| bgm_festival | 节日曲 | 2-3min | ⬜ | AI/免费 |

### SFX (P0)

| ID | 资源 | 时长 | 状态 | 来源 |
| -- | ---- | ---- | ---- | ---- |
| sfx_click | 点击 | <0.5s | ⬜ | Freesound |
| sfx_collect | 收集 | <0.5s | ⬜ | Freesound |
| sfx_craft | 制作 | <1s | ⬜ | Freesound |
| sfx_success | 成功 | <0.5s | ⬜ | Freesound |
| sfx_error | 错误 | <0.5s | ⬜ | Freesound |

---

## 资源统计

| 类别 | P0 | P1 | P2 | 总计 |
| ---- | -- | -- | -- | ---- |
| 角色 | 3 | 5 | 0 | 8 |
| 物品 | 10 | 4 | 0 | 14 |
| 场景 | 8 | 5 | 4 | 17 |
| UI | 14 | 3 | 0 | 17 |
| 特效 | 0 | 5 | 0 | 5 |
| 音频 | 5 | 5 | 0 | 10 |
| **总计** | **40** | **27** | **4** | **71** |

---

## 免费素材来源

### 美术
1. **Kenney Assets** - https://kenney.nl/assets (CC0)
2. **Pixel Frog** - https://pixel-frog.itch.io/ (CC0)
3. **Kronbits** - https://kronbits.itch.io/ (CC0)
4. **OpenGameArt** - https://opengameart.org/ (Various)

### 音频
1. **Freesound** - https://freesound.org/ (CC0/CC-BY)
2. **Incompetech** - https://incompetech.com/ (CC-BY)
3. **OpenGameArt** - https://opengameart.org/art-search?keys=music

### AI 工具
1. **Midjourney** - https://midjourney.com/ (付费)
2. **DALL-E 3** - https://openai.com/dall-e-3 (付费)
3. **Leonardo.AI** - https://leonardo.ai/ (免费额度)
4. **Bing Image Creator** - https://www.bing.com/create (免费)

---

*最后更新: 2026-03-26*
