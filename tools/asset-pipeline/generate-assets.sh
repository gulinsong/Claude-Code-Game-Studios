#!/bin/bash
# 资源生成脚本
# 用于将 SVG 占位图转换为 PNG，并提供 AI 生成指南

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ASSETS_DIR="$PROJECT_ROOT/assets"

echo "=== 岁时记 资源生成工具 ==="
echo ""

# 检查依赖
check_dependencies() {
    echo "检查依赖..."

    # 检查 Inkscape (SVG -> PNG)
    if command -v inkscape &> /dev/null; then
        echo "✓ Inkscape 已安装"
    else
        echo "⚠ Inkscape 未安装 (可选，用于 SVG->PNG 转换)"
        echo "  安装: sudo apt install inkscape"
    fi

    # 检查 ImageMagick
    if command -v convert &> /dev/null; then
        echo "✓ ImageMagick 已安装"
    else
        echo "⚠ ImageMagick 未安装 (可选，用于图片处理)"
        echo "  安装: sudo apt install imagemagick"
    fi

    echo ""
}

# 转换所有 SVG 到 PNG
convert_svgs() {
    echo "转换 SVG 到 PNG..."

    if ! command -v inkscape &> /dev/null; then
        echo "错误: 需要安装 Inkscape"
        return 1
    fi

    find "$ASSETS_DIR" -name "*.svg" | while read svg; do
        png="${svg%.svg}.png"
        echo "  $svg -> $png"
        inkscape "$svg" --export-type="png" --export-filename="$png" 2>/dev/null
    done

    echo "✓ SVG 转换完成"
    echo ""
}

# 生成 AI 资源提示词
generate_ai_prompts() {
    echo "=== AI 生成提示词 ==="
    echo ""
    echo "将以下提示词复制到 AI 图像生成工具中:"
    echo ""

    cat << 'PROMPTS'
## 角色 (32x32 像素)

### 玩家角色 - 待机
pixel art character, Chinese village youth, traditional clothing,
green tunic, simple hairstyle, cute chibi proportion,
32x32 pixels, 16 colors, transparent background, game asset,
idle pose, front view

### 玩家角色 - 行走
pixel art character, Chinese village youth, traditional clothing,
green tunic, walking animation, cute chibi proportion,
32x32 pixels, 16 colors, transparent background, game asset,
4 frames walk cycle, side view

### 长老
pixel art character, elderly Chinese village elder with gray beard,
wearing traditional gray robe, wise expression, cute chibi proportion,
32x32 pixels, 16 colors, transparent background, game asset

### 商人
pixel art character, Chinese merchant, brown outfit,
friendly smile, carrying goods bag, cute chibi proportion,
32x32 pixels, 16 colors, transparent background, game asset

## 物品 (32x32 像素)

### 月饼
pixel art mooncake, Chinese traditional pastry, round shape,
golden brown color, decorative pattern on top,
32x32 pixels, clean outline, game icon, transparent background

### 灯笼
pixel art red lantern, Chinese traditional festival lantern,
glowing effect, red and gold colors,
32x32 pixels, clean outline, game icon, transparent background

### 竹子
pixel art bamboo stick, Chinese bamboo piece,
green segments, natural texture,
32x32 pixels, clean outline, game icon, transparent background

### 青团
pixel art qingtuan, Chinese green glutinous rice ball,
bright green color, smooth round shape,
32x32 pixels, clean outline, game icon, transparent background

## 场景背景 (1280x720 像素)

### 村庄 - 春
pixel art village scene, Chinese traditional village,
spring atmosphere, cherry blossoms blooming,
green fields, wooden houses, stone bridge over stream,
warm sunlight, peaceful mood, top-down view,
1280x720 pixels, game background, no characters

### 村庄 - 夏
pixel art village scene, Chinese traditional village,
summer atmosphere, lush green trees, lotus pond,
bright sunny day, wooden houses,
vibrant colors, top-down view,
1280x720 pixels, game background, no characters

### 村庄 - 秋
pixel art village scene, Chinese traditional village,
autumn atmosphere, golden and red leaves,
harvest time, wheat fields, wooden houses,
warm orange tones, top-down view,
1280x720 pixels, game background, no characters

### 村庄 - 冬
pixel art village scene, Chinese traditional village,
winter atmosphere, snow covered ground,
bare trees, smoke from chimneys, wooden houses,
cool blue-white tones, top-down view,
1280x720 pixels, game background, no characters

PROMPTS
}

# 下载免费资源
download_free_assets() {
    echo "=== 下载免费资源 ==="
    echo ""
    echo "推荐资源来源:"
    echo ""
    echo "1. Kenney Assets (UI Icons)"
    echo "   https://kenney.nl/assets/game-icons"
    echo "   下载后解压到: assets/textures/ui/icons/kenney/"
    echo ""
    echo "2. Pixel Frog (角色素材)"
    echo "   https://pixel-frog.itch.io/pixel-adventure-1"
    echo "   可作为角色动画参考"
    echo ""
    echo "3. Kronbits (Tiles)"
    echo "   https://kronbits.itch.io/free-game-tiles"
    echo "   适合作为地形素材"
    echo ""
    echo "4. Freesound (音效)"
    echo "   https://freesound.org/search/?q=click"
    echo "   搜索: click, collect, success, craft"
    echo ""
}

# 检查资源完整性
check_assets() {
    echo "=== 检查资源完整性 ==="
    echo ""

    local missing=0

    # 检查 P0 资源
    echo "P0 (MVP 必需):"

    # 玩家角色
    for anim in idle walk interact; do
        if [ ! -f "$ASSETS_DIR/textures/characters/player/char_player_${anim}.png" ]; then
            echo "  ⬜ char_player_${anim}.png"
            ((missing++))
        else
            echo "  ✅ char_player_${anim}.png"
        fi
    done

    # UI 按钮
    for state in normal pressed; do
        if [ ! -f "$ASSETS_DIR/textures/ui/buttons/ui_btn_primary_${state}.png" ]; then
            echo "  ⬜ ui_btn_primary_${state}.png"
            ((missing++))
        else
            echo "  ✅ ui_btn_primary_${state}.png"
        fi
    done

    # UI 图标
    for icon in backpack settings home; do
        if [ ! -f "$ASSETS_DIR/textures/ui/icons/ui_icon_${icon}.png" ]; then
            echo "  ⬜ ui_icon_${icon}.png"
            ((missing++))
        else
            echo "  ✅ ui_icon_${icon}.png"
        fi
    done

    echo ""
    if [ $missing -eq 0 ]; then
        echo "✓ 所有 P0 资源已就绪"
    else
        echo "⚠ 缺失 $missing 个资源"
    fi
}

# 主菜单
main() {
    check_dependencies

    echo "选择操作:"
    echo "1) 转换 SVG 到 PNG"
    echo "2) 显示 AI 生成提示词"
    echo "3) 显示免费资源下载指南"
    echo "4) 检查资源完整性"
    echo "5) 全部执行"
    echo ""
    read -p "请选择 [1-5]: " choice

    case $choice in
        1) convert_svgs ;;
        2) generate_ai_prompts ;;
        3) download_free_assets ;;
        4) check_assets ;;
        5)
            generate_ai_prompts
            echo ""
            download_free_assets
            echo ""
            convert_svgs
            echo ""
            check_assets
            ;;
        *)
            echo "无效选择"
            exit 1
            ;;
    esac
}

# 如果有参数，直接执行对应功能
if [ $# -gt 0 ]; then
    case $1 in
        convert) convert_svgs ;;
        prompts) generate_ai_prompts ;;
        download) download_free_assets ;;
        check) check_assets ;;
        *) echo "用法: $0 [convert|prompts|download|check]" ;;
    esac
else
    main
fi
