# 音效占位文件

本目录存放游戏音效。由于无法直接创建音频文件，请使用以下方法获取音效：

## P0 必需音效

| 文件名 | 描述 | 时长 | 来源建议 |
|--------|------|------|----------|
| sfx_click.mp3 | 点击/触摸音效 | <0.5s | Freesound: "click ui" |
| sfx_collect.mp3 | 收集物品音效 | <0.5s | Freesound: "pickup coin" |
| sfx_craft.mp3 | 制作完成音效 | <1s | Freesound: "craft success" |
| sfx_success.mp3 | 成功/完成音效 | <0.5s | Freesound: "success chime" |
| sfx_error.mp3 | 错误/失败音效 | <0.5s | Freesound: "error buzz" |

## 下载来源

1. **Freesound.org** - https://freesound.org/
   - 搜索关键词: click, ui, pickup, success, error
   - 许可证: CC0 或 CC-BY

2. **Mixkit** - https://mixkit.co/free-sound-effects/
   - 免费音效，无需署名

3. **Zapsplat** - https://www.zapsplat.com/
   - 需注册，免费额度

## 音效规格

| 属性 | 要求 |
|------|------|
| 格式 | MP3 |
| 采样率 | 44100 Hz |
| 比特率 | 128 kbps |
| 单文件大小 | < 100 KB |
| 声道 | 单声道 (游戏音效) |

## 文件命名规范

```
sfx_[动作]_[变体].mp3

Examples:
sfx_click_01.mp3
sfx_click_02.mp3
sfx_collect_item.mp3
sfx_craft_food.mp3
```
