# 渲染优化策略

## 概述

本文档定义《岁时记》的渲染优化策略，主要目标是减少 Draw Call 数量，确保在微信小游戏平台上达到目标帧率。

## 性能目标

| 指标 | 目标值 | 优先级 |
|------|--------|--------|
| 帧率 | 60 FPS (高端), 30 FPS (低端) | P0 |
| Draw Calls | < 100 | P0 |
| 内存占用 | < 150 MB | P1 |
| 启动时间 | < 3s | P1 |

## 当前状态分析

### 预估 Draw Call 来源

| 来源 | 预估数量 | 优化潜力 |
|------|----------|----------|
| UI 层 | 20-30 | 高 (合批) |
| 背景层 | 5-10 | 中 (图集) |
| 角色层 | 10-20 | 高 (合批) |
| 特效层 | 10-15 | 中 (对象池) |
| **总计** | **45-75** | - |

### 瓶颈分析

```
┌─────────────────────────────────────────────────────────────┐
│                    渲染管线瓶颈分析                          │
├─────────────────────────────────────────────────────────────┤
│  CPU 瓶颈                                                   │
│  ├── Draw Call 过多 (每次调用有 CPU 开销)                    │
│  ├── 脚本逻辑过重 (update 中计算)                            │
│  └── UI 重绘频繁 (脏标记未正确使用)                           │
│                                                             │
│  GPU 瓶颈                                                   │
│  ├── 过度绘制 (透明物体叠加)                                 │
│  ├── 纹理过大 (内存带宽)                                     │
│  └── 着色器复杂度过高                                        │
└─────────────────────────────────────────────────────────────┘
```

## 优化策略

### 策略 1: 图集合并 (Texture Atlas)

**原理**: 将多个小纹理合并到一张大纹理，减少纹理切换。

**实施方案**:
```
textures/
├── atlas/
│   ├── ui_common.packer      # 通用 UI (按钮、图标等)
│   ├── ui_gameplay.packer    # 游戏内 UI
│   ├── items.packer          # 物品图标
│   └── characters.packer     # 角色立绘
```

**图集规格**:
- 单张图集最大: 2048x2048
- 格式: PNG (带 Alpha)
- 填充率目标: > 80%

**预期收益**: Draw Call 减少 30-50%

### 策略 2: 动态合批 (Dynamic Batching)

**原理**: Cocos Creator 自动合批使用相同材质的精灵。

**条件**:
- 使用相同的 SpriteFrame (来自同一图集)
- 相同的混合模式
- 相同的着色器
- 顶点数 < 900 (大约)

**实施要点**:
1. 确保 UI 元素使用同一图集
2. 避免在精灵之间插入不同材质的节点
3. 使用 `UITransform` 的优先级控制渲染顺序

### 策略 3: 静态合批 (Static Batching)

**原理**: 将不移动的物体预先合并。

**适用场景**:
- 背景元素 (建筑、树木、地面)
- 装饰物 (灯笼、旗帜)
- 地图 Tile

**实施方案**:
```typescript
// 将静态背景合并为一个节点
const staticBg = this.node.getChildByName('StaticBackground');
const gfx = staticBg.getComponent(UITransform);
// 使用 Cocos Creator 的合批标记
staticBg.getComponent(Sprite).markForRender(true);
```

### 策略 4: 对象池 (Object Pooling)

**原理**: 复用节点而非频繁创建销毁。

**适用场景**:
- 特效 (粒子、动画)
- 列表项 (背包、任务列表)
- 弹出框

**实现**:
```typescript
// 已有 ObjectPool.ts 在 src/core/
class EffectPool {
    private pool: Node[] = [];

    get(): Node {
        return this.pool.pop() || instantiate(this.prefab);
    }

    put(node: Node): void {
        node.removeFromParent();
        this.pool.push(node);
    }
}
```

### 策略 5: UI 优化

**减少重绘**:
```typescript
// ❌ 错误: 每帧更新
update(dt: number) {
    this.label.string = `金币: ${this.coins}`;
}

// ✅ 正确: 只在变化时更新
private _coins: number = 0;
set coins(value: number) {
    if (this._coins !== value) {
        this._coins = value;
        this.label.string = `金币: ${value}`;
    }
}
```

**脏标记模式**:
```typescript
class UIComponent {
    private dirty: boolean = false;

    markDirty(): void {
        this.dirty = true;
    }

    lateUpdate(dt: number) {
        if (this.dirty) {
            this.refresh();
            this.dirty = false;
        }
    }
}
```

### 策略 6: 遮挡剔除

**原理**: 不渲染屏幕外的物体。

**实施方案**:
- 使用 Cocos Creator 内置的视锥剔除
- 对于 UI 列表，使用虚拟列表 (只渲染可见项)

**虚拟列表示例**:
```typescript
// 背包系统使用虚拟列表
// 只渲染屏幕可见的 10-15 个物品，而非全部 100+ 个
class VirtualList {
    private visibleStart: number = 0;
    private visibleEnd: number = 0;

    updateVisibleItems(scrollOffset: number) {
        // 计算可见范围
        // 复用节点，只更新数据
    }
}
```

### 策略 7: 分帧加载

**原理**: 将加载分散到多帧，避免卡顿。

**实施方案**:
```typescript
async function loadAssetsInFrames(assets: string[], perFrame: number = 5) {
    for (let i = 0; i < assets.length; i += perFrame) {
        const batch = assets.slice(i, i + perFrame);
        await Promise.all(batch.map(loadAsset));
        await waitForNextFrame();
    }
}
```

## Cocos Creator 特定优化

### 1. Sprite 组件优化

```typescript
// 使用 SpriteFrame 的 trim 属性减少透明像素
sprite.spriteFrame = atlas.getSpriteFrame('item_001');

// 禁用不必要的组件
const sprite = node.getComponent(Sprite);
if (!sprite.enabled) {
    sprite.destroy(); // 完全移除而非禁用
}
```

### 2. Label 组件优化

```typescript
// 使用 BMFont 代替 TTF (性能更好)
label.font = bmFont;

// 缓存频繁更新的文本
// 对于数字，使用数字图集而非 Label
```

### 3. Mask 组件优化

```typescript
// Mask 会增加 Draw Call
// 仅在必要时使用
// 考虑使用 Shader 实现遮罩效果
```

### 4. ParticleSystem 优化

```typescript
// 限制粒子数量
particleSystem.capacity = 50; // 而非默认的 500

// 使用简单的粒子纹理
// 避免每个粒子都有独立的光照计算
```

## 实施计划

### Phase 1: 图集整合 (Day 1-2)

| 任务 | 预估 | 产出 |
|------|------|------|
| 创建图集目录结构 | 0.5h | atlas/ 目录 |
| 整合 UI 资源到图集 | 2h | ui_common.packer |
| 整合物品图标到图集 | 1h | items.packer |
| 验证合批效果 | 1h | Draw Call 报告 |

### Phase 2: 代码优化 (Day 2-3)

| 任务 | 预估 | 产出 |
|------|------|------|
| 实现虚拟列表 | 3h | VirtualList 组件 |
| 优化 UI 更新逻辑 | 2h | 脏标记实现 |
| 对象池应用 | 2h | 特效池、弹窗池 |

### Phase 3: 验证与调优 (Day 3-4)

| 任务 | 预估 | 产出 |
|------|------|------|
| 性能基准测试 | 2h | 性能报告 |
| 瓶颈分析 | 2h | 优化建议 |
| 最终调优 | 2h | 达标验证 |

## 监控与验证

### 性能监控组件

```typescript
// src/ui/PerformanceMonitor.ts
@Component
export class PerformanceMonitor extends Component {
    private frameCount: number = 0;
    private lastTime: number = 0;
    private fps: number = 0;

    update(dt: number) {
        this.frameCount++;
        const now = performance.now();

        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;

            // 上报性能数据
            if (this.fps < 30) {
                console.warn(`Low FPS: ${this.fps}`);
            }
        }
    }

    getDrawCalls(): number {
        // 通过 Cocos Creator API 获取
        return director.root?.pipeline?.pipelineStats?.drawCalls ?? 0;
    }
}
```

### 验证清单

- [ ] Draw Calls < 100
- [ ] FPS 稳定在 60 (高端设备)
- [ ] FPS 稳定在 30 (低端设备)
- [ ] 内存占用 < 150 MB
- [ ] 无明显卡顿 (> 100ms 的帧)
- [ ] UI 滚动流畅

## 相关文档

- [ADR-0016: UI 框架](../../docs/architecture/adr-0016-ui-framework.md)
- [性能预算](../../.claude/docs/technical-preferences.md)
- [Cocos Creator 性能优化指南](https://docs.cocos.com/creator/3.8/manual/zh/performance/)

---

*最后更新: 2026-03-26*
