# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Cocos Creator 3.8.8
- **Language**: TypeScript
- **Rendering**: Cocos Creator 2D Renderer (主), 3D (可选)
- **Physics**: Cocos Creator 内置 2D 物理系统 (Box2D / Builtin)
- **Target Platform**: 微信小程序 (首发) → iOS App (后续)

## Naming Conventions (TypeScript / Cocos Creator)

- **Classes**: PascalCase (e.g., `PlayerController`, `FestivalManager`)
- **Variables**: camelCase (e.g., `moveSpeed`, `currentFestival`)
- **Functions/Methods**: camelCase (e.g., `takeDamage()`, `prepareFestival()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_VILLAGERS`, `FESTIVAL_DURATION`)
- **Interfaces**: PascalCase with `I` prefix optional (e.g., `IVillager`, `IFestivalData`)
- **Enums**: PascalCase, values UPPER_SNAKE_CASE (e.g., `Season { SPRING, SUMMER }`)
- **Files**: PascalCase for components (e.g., `PlayerController.ts`)
- **Prefabs/Scenes**: PascalCase (e.g., `Player.prefab`, `Village.scene`)
- **Assets**: snake_case (e.g., `village_bg.png`, `bgm_autumn.mp3`)
- **Node Names**: PascalCase in scene (e.g., `MainCamera`, `UIRoot`)

## Performance Budgets

- **Target Framerate**: 60 FPS (高端设备), 30 FPS (低端设备兜底)
- **Frame Budget**: 16.6ms (60 FPS)
- **Draw Calls**: < 100 (2D 场景)
- **Memory Ceiling**: < 150MB (小程序限制)
- **Package Size**: 主包 < 4MB, 总包 < 20MB

## Testing

- **Framework**: Jest (单元测试) + Cocos Creator 内置测试
- **Minimum Coverage**: 核心系统 > 70%
- **Required Tests**: 节日系统逻辑、村民关系系统、存档/读档、内购流程

## Forbidden Patterns

- **禁止使用 `any` 类型** — 必须明确类型定义
- **禁止在 `update` 中进行 heavy 计算** — 使用缓存或事件驱动
- **禁止直接操作 DOM** — 通过 Cocos Creator API 操作节点
- **禁止同步加载大资源** — 使用 `resources.load` 或远程加载

## Allowed Libraries / Addons

- **Cocos Creator 官方插件**: 允许
- **微信小游戏 SDK**: 允许 (登录、分享、支付、广告)
- **Lodash / Underscore**: 允许 (按需引入)
- **第三方 UI 库**: 需评估后添加
- **资源格式**: PNG (纹理), MP3/OGG (音频), JSON (数据), Spine/DragonBones (动画)

## WeChat Mini Program Specifics

- **登录**: 微信一键登录, openid 作为用户标识
- **存档**: 微信云开发 / 自建服务器
- **分享**: 微信分享 API (好友、朋友圈)
- **支付**: 微信支付 (内购)
- **广告**: 微信激励视频广告 (可选)

## Architecture Decisions Log

- [ADR-0001: 事件驱动架构](../architecture/adr-0001-event-driven-architecture.md) — 发布-订阅模式，支持系统间解耦通信
