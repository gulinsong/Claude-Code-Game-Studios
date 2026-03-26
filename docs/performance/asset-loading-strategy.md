# 资源加载策略

## 概述

本文档定义《岁时记》的资源加载策略，主要目标是优化包体大小、启动时间和运行时内存占用，确保在微信小游戏平台上的流畅体验。

## 约束条件

| 祝束 | 数值 | 来源 |
|------|------|------|
| 主包大小上限 | 4 MB | 微信小游戏限制 |
| 总包大小上限 | 20 MB | 微信小游戏限制 |
| 单个分包上限 | 2 MB | 最佳实践 |
| 内存上限 | 150 MB | 小游戏设备限制 |
| 启动时间目标 | < 3s | 用户体验要求 |

## 分包架构

### 分包结构

```
package/
├── main/                    # 主包 (< 4 MB)
│   ├── 代码 (src/)          # ~1.5 MB
│   ├── 启动场景资源          # ~0.5 MB
│   ├── 通用 UI 图集          # ~1 MB
│   └── 配置文件              # ~0.1 MB
│
├── common/                  # 通用分包 (~2 MB)
│   ├── 角色 UI 图集          # ~0.8 MB
│   ├── 物品图标图集          # ~0.6 MB
│   ├── 音效文件              # ~0.4 MB
│   └── 通用动画              # ~0.2 MB
│
├── spring/                  # 春季节日分包 (~1.5 MB)
│   ├── 清明节场景            # ~0.5 MB
│   ├── 清明节 UI            # ~0.3 MB
│   ├── 清明节 音效          # ~0.2 MB
│   └── 青团制作 小游戏       # ~0.5 MB
│
├── summer/                  # 夏季节日分包 (~1.5 MB)
│   ├── 端午节场景
│   ├── 端午节 UI
│   ├── 端午节 音效
│   └── 赛龙舟 小游戏
│
├── autumn/                  # 秋季节日分包 (~1.5 MB)
│   ├── 中秋节场景
│   ├── 中秋节 UI
│   ├── 中秋节 音效
│   └── 赏月 小游戏
│
├── winter/                  # 冬季节日分包 (~1.5 MB)
│   ├── 春节场景
│   ├── 春节 UI
│   ├── 春节 音效
│   └── 鞭炮 小游戏
│
└── remote/                  # 远程资源 (CDN, 不计入包体)
    ├── 背景音乐              # ~5 MB
    ├── 高清立绘              # ~10 MB
    └── 语音文件              # ~5 MB
```

### 分包加载时机

| 分包 | 加载时机 | 预加载 | 卸载时机 |
|------|----------|--------|----------|
| main | 启动时 | 必需 | 从不 |
| common | 主场景后 | 自动 | 从不 |
| spring | 进入春季前 | 可选 | 离开春季后 |
| summer | 进入夏季前 | 可选 | 离开夏季后 |
| autumn | 进入秋季前 | 可选 | 离开秋季后 |
| winter | 进入冬季前 | 可选 | 离开冬季后 |
| remote | 使用时按需 | 手动 | LRU 淘汰 |

## 资源优先级

### 优先级定义

```typescript
enum AssetPriority {
    CRITICAL = 0,    // 必须立即加载，阻塞游戏
    HIGH = 1,        // 高优先级，影响核心体验
    NORMAL = 2,      // 正常优先级
    LOW = 3,         // 低优先级，后台加载
    BACKGROUND = 4   // 后台加载，不急迫
}
```

### 资源分类

| 资源类型 | 优先级 | 示例 |
|----------|--------|------|
| 启动场景 | CRITICAL | Logo 场景、主菜单 |
| 核心 UI | CRITICAL | 主界面、HUD |
| 游戏配置 | CRITICAL | 平衡数据、文本 |
| 当前场景资源 | HIGH | 场景背景、角色 |
| 音效 | NORMAL | 按钮音、环境音 |
| BGM | NORMAL | 背景音乐 |
| 特效 | LOW | 粒子效果 |
| 预加载资源 | BACKGROUND | 下一季节资源 |

## 加载策略实现

### 资源加载器

```typescript
// src/core/AssetLoader.ts

interface LoadTask {
    path: string;
    priority: AssetPriority;
    type: typeof Asset;
    onProgress?: (progress: number) => void;
}

class AssetLoader {
    private static instance: AssetLoader;
    private loadingQueue: LoadTask[] = [];
    private loadedAssets: Map<string, Asset> = new Map();
    private loading: boolean = false;

    /**
     * 加载单个资源
     */
    async load<T extends Asset>(
        path: string,
        type: typeof Asset,
        priority: AssetPriority = AssetPriority.NORMAL
    ): Promise<T> {
        // 检查缓存
        const cached = this.loadedAssets.get(path);
        if (cached) return cached as T;

        // 加载资源
        return new Promise((resolve, reject) => {
            resources.load(path, type, (err, asset) => {
                if (err) {
                    console.error(`Failed to load: ${path}`, err);
                    reject(err);
                } else {
                    this.loadedAssets.set(path, asset);
                    resolve(asset as T);
                }
            });
        });
    }

    /**
     * 批量加载
     */
    async loadBatch(
        tasks: LoadTask[],
        onProgress?: (progress: number) => void
    ): Promise<void> {
        // 按优先级排序
        const sorted = [...tasks].sort(
            (a, b) => a.priority - b.priority
        );

        let completed = 0;
        for (const task of sorted) {
            await this.load(task.path, task.type, task.priority);
            completed++;
            onProgress?.(completed / tasks.length);
        }
    }

    /**
     * 预加载分包
     */
    async preloadSubpackage(name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof wx !== 'undefined') {
                const task = wx.loadSubpackage({
                    name,
                    success: () => resolve(),
                    fail: (err) => reject(err)
                });
                task.onProgressUpdate((res) => {
                    console.log(`Loading ${name}: ${res.progress}%`);
                });
            } else {
                // 非 微信环境，直接完成
                resolve();
            }
        });
    }

    /**
     * 卸载资源
     */
    unload(path: string): void {
        const asset = this.loadedAssets.get(path);
        if (asset) {
            resources.release(path);
            this.loadedAssets.delete(path);
        }
    }

    /**
     * 清理未使用资源
     */
    gc(): void {
        resources.releaseUnusedAssets();
    }
}
```

### 分包加载管理器

```typescript
// src/core/SubpackageManager.ts

interface SubpackageConfig {
    name: string;
    root: string;
    dependencies: string[];
    preloadCondition: () => boolean;
}

const SUBPACKAGES: Record<string, SubpackageConfig> = {
    common: {
        name: 'common',
        root: 'subpackages/common',
        dependencies: [],
        preloadCondition: () => true // 始终预加载
    },
    spring: {
        name: 'spring',
        root: 'subpackages/spring',
        dependencies: ['common'],
        preloadCondition: () => TimeSystem.instance.season === Season.SPRING
    },
    summer: {
        name: 'summer',
        root: 'subpackages/summer',
        dependencies: ['common'],
        preloadCondition: () => TimeSystem.instance.season === Season.SUMMER
    },
    autumn: {
        name: 'autumn',
        root: 'subpackages/autumn',
        dependencies: ['common'],
        preloadCondition: () => TimeSystem.instance.season === Season.AUTUMN
    },
    winter: {
        name: 'winter',
        root: 'subpackages/winter',
        dependencies: ['common'],
        preloadCondition: () => TimeSystem.instance.season === Season.WINTER
    }
};

class SubpackageManager {
    private static instance: SubpackageManager;
    private loadedPackages: Set<string> = new Set();

    /**
     * 加载季节分包
     */
    async loadSeasonPackage(season: Season): Promise<void> {
        const packageName = season.toLowerCase();
        const config = SUBPACKAGES[packageName];

        if (!config) {
            console.warn(`Unknown season package: ${packageName}`);
            return;
        }

        // 检查是否已加载
        if (this.loadedPackages.has(packageName)) {
            return;
        }

        // 加载依赖
        for (const dep of config.dependencies) {
            await this.loadSeasonPackage(dep as Season);
        }

        // 加载分包
        console.log(`Loading subpackage: ${packageName}`);
        await AssetLoader.instance.preloadSubpackage(packageName);
        this.loadedPackages.add(packageName);
        console.log(`Subpackage loaded: ${packageName}`);
    }

    /**
     * 卸载季节分包
     */
    unloadSeasonPackage(season: Season): void {
        const packageName = season.toLowerCase();

        if (!this.loadedPackages.has(packageName)) {
            return;
        }

        // 卸载资源
        AssetLoader.instance.gc();
        this.loadedPackages.delete(packageName);
        console.log(`Subpackage unloaded: ${packageName}`);
    }

    /**
     * 预加载下一季节
     */
    async preloadNextSeason(): Promise<void> {
        const nextSeason = this.getNextSeason();
        const packageName = nextSeason.toLowerCase();

        // 后台加载，不阻塞
        this.loadSeasonPackage(nextSeason).catch(err => {
            console.warn(`Failed to preload ${packageName}:`, err);
        });
    }

    private getNextSeason(): Season {
        const current = TimeSystem.instance.season;
        const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
        const index = seasons.indexOf(current);
        return seasons[(index + 1) % 4];
    }
}
```

## 远程资源加载

### CDN 配置

```typescript
// src/config/cdn.ts

const CDN_CONFIG = {
    baseUrl: 'https://cdn.suiji-game.com/assets/',
    version: '1.0.0',

    getAssetUrl(path: string): string {
        return `${this.baseUrl}v${this.version}/${path}`;
    }
};
```

### 远程资源加载器

```typescript
// src/core/RemoteAssetLoader.ts

class RemoteAssetLoader {
    private static instance: RemoteAssetLoader;
    private cache: Map<string, Asset> = new Map();
    private maxSize: number = 50 * 1024 * 1024; // 50 MB
    private currentSize: number = 0;

    /**
     * 加载远程资源
     */
    async loadRemote<T extends Asset>(
        path: string,
        type: 'image' | 'audio' | 'json'
    ): Promise<T> {
        // 检查缓存
        const cached = this.cache.get(path);
        if (cached) {
            // 更新 LRU
            this.cache.delete(path);
            this.cache.set(path, cached);
            return cached as T;
        }

        const url = CDN_CONFIG.getAssetUrl(path);

        return new Promise((resolve, reject) => {
            assetManager.loadRemote(url, (err, asset) => {
                if (err) {
                    reject(err);
                } else {
                    this.addToCache(path, asset);
                    resolve(asset as T);
                }
            });
        });
    }

    /**
     * 添加到缓存 (LRU)
     */
    private addToCache(path: string, asset: Asset): void {
        // 检查大小限制
        const assetSize = this.estimateSize(asset);

        while (this.currentSize + assetSize > this.maxSize && this.cache.size > 0) {
            // 移除最旧的
            const oldest = this.cache.keys().next().value;
            const oldAsset = this.cache.get(oldest);
            this.cache.delete(oldest);
            this.currentSize -= this.estimateSize(oldAsset!);
        }

        this.cache.set(path, asset);
        this.currentSize += assetSize;
    }

    /**
     * 估算资源大小
     */
    private estimateSize(asset: Asset): number {
        if (asset instanceof Texture2D) {
            const tex = asset as Texture2D;
            return tex.width * tex.height * 4; // RGBA
        }
        if (asset instanceof AudioClip) {
            return (asset as AudioClip).duration * 176400; // 估算
        }
        return 1024; // 默认 1KB
    }
}
```

## 启动流程优化

### 启动序列

```
┌─────────────────────────────────────────────────────────────────┐
│                        游戏启动流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0-500ms   ┌─────────────────┐                                  │
│            │ 引擎初始化       │ ← 显示 Logo                      │
│            └────────┬────────┘                                  │
│                     │                                           │
│  500-1000ms ┌───────▼────────┐                                  │
│             │ 加载主包资源    │ ← 显示进度条                     │
│             │ (配置、核心UI)  │                                  │
│             └────────┬───────┘                                  │
│                      │                                          │
│  1000-1500ms ┌───────▼────────┐                                 │
│              │ 初始化系统      │ ← EventSystem, ConfigSystem    │
│              └────────┬───────┘                                 │
│                       │                                         │
│  1500-2000ms ┌────────▼────────┐                                │
│              │ 加载 通用分包   │ ← 后台加载                      │
│              │ 显示主菜单      │ ← 用户可交互                    │
│              └────────┬────────┘                                │
│                       │                                         │
│  2000ms+    ┌─────────▼─────────┐                               │
│             │ 预加载当前季节    │ ← 后台加载                      │
│             │ 用户进入游戏      │                                │
│             └───────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 启动加载器

```typescript
// src/core/StartupLoader.ts

class StartupLoader {
    private loadingView: LoadingView | null = null;

    async start(): Promise<void> {
        const startTime = performance.now();

        // 1. 显示加载界面
        this.loadingView = new LoadingView();
        await this.loadingView.show();

        // 2. 加载核心配置 (阻塞)
        this.loadingView.setProgress(0.1, '加载配置...');
        await this.loadCoreConfig();

        // 3. 加载核心 UI (阻塞)
        this.loadingView.setProgress(0.3, '加载界面...');
        await this.loadCoreUI();

        // 4. 初始化系统 (阻塞)
        this.loadingView.setProgress(0.5, '初始化系统...');
        await this.initializeSystems();

        // 5. 显示主菜单 (可交互)
        this.loadingView.setProgress(0.7, '准备完成');
        await this.showMainMenu();

        // 6. 后台加载
        this.backgroundLoad();

        const elapsed = performance.now() - startTime;
        console.log(`Startup completed in ${elapsed.toFixed(0)}ms`);

        // 7. 隐藏加载界面
        this.loadingView.hide();
    }

    private async loadCoreConfig(): Promise<void> {
        await AssetLoader.instance.loadBatch([
            { path: 'config/economy', type: JsonAsset, priority: AssetPriority.CRITICAL },
            { path: 'config/stamina', type: JsonAsset, priority: AssetPriority.CRITICAL },
            { path: 'config/villager', type: JsonAsset, priority: AssetPriority.CRITICAL }
        ]);
    }

    private async loadCoreUI(): Promise<void> {
        await AssetLoader.instance.loadBatch([
            { path: 'textures/ui/common', type: SpriteAtlas, priority: AssetPriority.CRITICAL },
            { path: 'prefabs/ui/MainMenu', type: Prefab, priority: AssetPriority.CRITICAL }
        ]);
    }

    private async initializeSystems(): Promise<void> {
        // 初始化核心系统
        EventSystem.initialize();
        ConfigSystem.initialize();
        SaveSystem.initialize();
    }

    private async showMainMenu(): Promise<void> {
        // 显示主菜单
        director.loadScene('MainMenu');
    }

    private backgroundLoad(): void {
        // 后台加载 通用分包
        SubpackageManager.instance.loadSeasonPackage('common' as Season);

        // 后台加载当前季节
        const currentSeason = TimeSystem.instance.season;
        SubpackageManager.instance.loadSeasonPackage(currentSeason);
    }
}
```

## 内存管理

### 内存预算

| 类别 | 预算 | 说明 |
|------|------|------|
| 纹理 | 80 MB | 图集、立绘、背景 |
| 音频 | 30 MB | BGM (流式)、音效 |
| 代码 | 20 MB | 脚本、引擎 |
| 数据 | 10 MB | 配置、存档 |
| 缓冲 | 10 MB | 预留 |
| **总计** | **150 MB** | |

### 内存监控

```typescript
// src/core/MemoryMonitor.ts

class MemoryMonitor {
    private static instance: MemoryMonitor;
    private warningThreshold: number = 120 * 1024 * 1024; // 120 MB

    update(dt: number): void {
        if (typeof wx !== 'undefined') {
            const info = wx.getPerformance();
            const used = info.usedJSHeapSize;

            if (used > this.warningThreshold) {
                console.warn(`Memory usage high: ${(used / 1024 / 1024).toFixed(1)} MB`);
                this.triggerGC();
            }
        }
    }

    private triggerGC(): void {
        // 清理未使用资源
        AssetLoader.instance.gc();
        RemoteAssetLoader.instance.trimCache();

        // 强制 GC (微信小游戏)
        if (typeof wx !== 'undefined' && wx.triggerGC) {
            wx.triggerGC();
        }
    }

    getMemoryUsage(): { used: number; total: number } {
        if (typeof wx !== 'undefined') {
            const info = wx.getPerformance();
            return {
                used: info.usedJSHeapSize,
                total: info.totalJSHeapSize
            };
        }
        return { used: 0, total: 0 };
    }
}
```

## 验证清单

- [ ] 主包大小 < 4 MB
- [ ] 总包大小 < 20 MB
- [ ] 启动时间 < 3s
- [ ] 内存占用 < 150 MB
- [ ] 分包加载正常
- [ ] 远程资源加载正常
- [ ] LRU 缓存工作正常
- [ ] 内存监控告警正常

## 相关文档

- [渲染优化策略](./rendering-optimization.md)
- [ADR-0006: 云存档系统](../../docs/architecture/adr-0006-cloud-save-system.md)
- [微信小游戏分包加载](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subpackages.html)

---

*最后更新: 2026-03-26*
