# Game Concept: 反弹达人 (Bounce Master)

*Created: 2026-03-27*
*Status: Draft*

---

## Elevator Pitch

> 画挡板让小球反弹，用3条线收集所有光点——一球清台的物理爽感。
>
> 像弹球游戏，**但你来画挡板的位置和角度**。

---

## Core Identity

| Aspect | Detail |
| ---- | ---- |
| **Genre** | 休闲益智 / 物理弹球 |
| **Platform** | 微信小游戏 |
| **Target Audience** | 成就型玩家，喜欢反应挑战和策略规划 |
| **Player Count** | 单人（有排行榜竞争） |
| **Session Length** | 5-15分钟 |
| **Monetization** | 免费 + 广告 + 皮肤内购 |
| **Estimated Scope** | 小（2-4周） |
| **Comparable Titles** | Hopscotch、割绳子、弹球游戏 |

---

## Core Fantasy

你是一个物理大师，用简单的线条控制小球的命运。看着一颗球按照你规划的路径弹跳，精准收集所有光点——那种"一杆清台"的满足感是无可比拟的。

这不是复杂的瞄准游戏，而是直觉的画线体验。你不需要精确计算角度，只需要画出大致的路径，剩下的交给物理。

---

## Unique Hook

**"像弹球游戏，但你来画挡板"**

传统弹球游戏的挡板是固定的，玩家只能控制发射角度。本游戏的独特之处在于：**挡板由玩家自己画**。

- 每关只能画3条线 → 资源有限，需要策略
- 线的位置和角度完全自由 → 创造性解法
- 球出界就失败 → 有紧张感，不是无脑乱画

---

## Player Experience Analysis (MDA Framework)

### Target Aesthetics (What the player FEELS)

| Aesthetic | Priority | How We Deliver It |
| ---- | ---- | ---- |
| **Sensation** (sensory pleasure) | 1 | 爽快的反弹音效、粒子爆发、流畅的物理动画 |
| **Challenge** (obstacle course, mastery) | 2 | 3条线限制、出界失败、3星追求 |
| **Discovery** (exploration, secrets) | 3 | 程序生成关卡，总有新布局 |
| **Expression** (self-expression, creativity) | 4 | 皮肤系统，不同的解法风格 |
| **Fantasy** | N/A | 不强调角色扮演 |
| **Narrative** | N/A | 无故事内容 |
| **Fellowship** | N/A | 无实时多人（但有排行榜） |
| **Submission** | N/A | 不是放松型游戏 |

### Key Dynamics (Emergent player behaviors)

- **"再试一次"循环**：玩家会反复尝试同一关，优化线的位置
- **创意解法**：有些关卡可能有多种通关方式，玩家会分享"最佳解法"
- **分享炫耀**：3星通关或高分会激发分享欲望

### Core Mechanics (Systems we build)

1. **画线反弹系统**：玩家在屏幕上画线，线成为物理挡板
2. **球物理系统**：球会根据入射角反弹，有重力和摩擦
3. **光点收集系统**：球碰到光点即收集，全部收集=过关
4. **关卡系统**：手工关卡 + 程序生成关卡

---

## Player Motivation Profile

### Primary Psychological Needs Served

| Need | How This Game Satisfies It | Strength |
| ---- | ---- | ---- |
| **Autonomy** (freedom, meaningful choice) | 玩家自由决定线的位置、角度、长度 | Core |
| **Competence** (mastery, skill growth) | 通过练习提高规划能力，追求3星 | Core |
| **Relatedness** (connection, belonging) | 排行榜竞争，分享成绩 | Supporting |

### Player Type Appeal (Bartle Taxonomy)

- [x] **Achievers** (goal completion, collection, progression) — How: 3星系统、排行榜、皮肤收集
- [x] **Explorers** (discovery, understanding systems) — How: 程序生成关卡，探索最优解
- [ ] **Socializers** — 无实时社交功能
- [ ] **Killers/Competitors** — 排行榜有竞争元素，但非核心

### Flow State Design

- **Onboarding curve**: 第1关教画线，第2关教出界失败，第3关教3条线限制
- **Difficulty scaling**: 关卡逐渐引入新元素（障碍物、移动平台、加速带）
- **Feedback clarity**: 收集光点=音效+视觉爆发，出界=清晰提示
- **Recovery from failure**: 失败后1秒内可重试，无惩罚

---

## Core Loop

### Moment-to-Moment (30 seconds)

1. 观察关卡布局（光点位置、边界形状）
2. 思考线的位置
3. 画第一条线
4. 发射球
5. 看球弹跳、收集光点
6. 根据球的位置，适时画第2、3条线
7. 球出界或收集完毕

**这个循环必须爽**：每次球撞到线发出"叮"的声音，收集光点时的粒子爆发，都是核心爽点。

### Short-Term (5-15 minutes)

- 完成3-5个关卡
- 追求每关3星
- "差点就过了" → "再来一次" → "终于过了！"

### Session-Level (30-120 minutes)

- 通过一个"世界"（10-15关）
- 解锁新世界
- 收集足够星星解锁皮肤

### Long-Term Progression

| 阶段 | 内容 |
|------|------|
| 第1周 | 通关前3个世界，熟悉玩法 |
| 第2周 | 追求全3星，解锁皮肤 |
| 长期 | 排行榜竞争，每日挑战 |

### Retention Hooks

- **Curiosity**: 下一个世界长什么样？有什么新机制？
- **Investment**: 已收集的星星和皮肤
- **Mastery**: 优化解法，追求更高分数

---

## Game Pillars

### Pillar 1: 物理爽感

> 每一次反弹都要让人感觉"啪"的一声很爽

*Design test*: 如果在"更真实的物理"和"更爽的反馈"之间选择，选后者。音效和视觉反馈比物理精确性更重要。

### Pillar 2: 策略简洁

> 3条线，1个目标——规则简单，但解法有深度

*Design test*: 如果新机制让规则变复杂（比如引入多种球、复杂的计分规则），砍掉。保持"画线→弹球→收集"的核心。

### Pillar 3: 一球清台

> 看着一颗球弹来弹去吃完所有光点，是最高级的满足

*Design test*: 如果设计让"多球乱飞"比"一球精准"更容易成功，重新设计。游戏应该奖励精准规划，而不是混乱。

### Anti-Pillars (What This Game Is NOT)

- **NOT 多球混乱游戏**：保持单球，策略清晰，不变成弹幕游戏
- **NOT 精确瞄准的台球模拟**：画线比瞄准更直觉，不需要显示角度数值
- **NOT 长时间投入的重度游戏**：每关30秒-1分钟，随时可停

---

## Inspiration and References

| Reference | What We Take From It | What We Do Differently | Why It Matters |
| ---- | ---- | ---- | ---- |
| Hopscotch (跳格子) | 简单的跳跃收集玩法 | 用画线代替点击跳跃 | 验证了"收集+简洁"在小游戏的成功 |
| 割绳子 | 物理谜题、3星系统 | 用反弹代替切割 | 验证了物理+策略的休闲游戏市场 |
| 弹球游戏 | 反弹物理手感 | 玩家自己画挡板 | 经典物理反馈，用户熟悉 |

**Non-game inspirations**: 台球（一杆清台的满足感）、弹珠台（物理爽感）

---

## Target Player Profile

| Attribute | Detail |
| ---- | ---- |
| **Age range** | 18-35 |
| **Gaming experience** | 休闲玩家 |
| **Time availability** | 碎片时间，等车、休息间隙 |
| **Platform preference** | 微信小游戏 |
| **Current games they play** | 跳一跳、合成大西瓜、开心消消乐 |
| **What they're looking for** | 简单但有挑战，能炫耀成绩，不花太多时间 |
| **What would turn them away** | 太难上手、广告太多、需要长时间投入 |

---

## Technical Considerations

| Consideration | Assessment |
| ---- | ---- |
| **Recommended Engine** | Cocos Creator（微信小游戏原生支持）或 Phaser.js（轻量Web引擎） |
| **Key Technical Challenges** | 物理手感调优、程序生成关卡算法 |
| **Art Style** | 2D几何图形 + 粒子效果，霓虹/简约风格 |
| **Art Pipeline Complexity** | 低（无需复杂美术资源） |
| **Audio Needs** | 简单但爽快的音效（反弹、收集、过关） |
| **Networking** | 仅排行榜（微信开放数据域） |
| **Content Volume** | MVP: 20关 / 完整版: 100+关 + 程序生成 |
| **Procedural Systems** | 关卡程序生成（后期） |

---

## Risks and Open Questions

### Design Risks

- **物理手感不好**：反弹感不够爽，需要早期原型重点调试
- **玩法太简单容易腻**：需要通过新机制（障碍物、传送门）保持新鲜感

### Technical Risks

- **程序生成关卡质量不稳定**：可能生成无解或太简单的关卡
- **微信小游戏性能**：低端机型可能有性能问题

### Market Risks

- **同类游戏竞争**：弹球类游戏很多，需要有足够的差异化
- **留存率**：休闲游戏留存普遍较低，需要好的关卡曲线

### Scope Risks

- **功能膨胀**：想要太多系统（皮肤、每日挑战、排行榜）可能超时

### Open Questions

- **线的消失机制**：线是永久存在还是过几秒消失？需要原型测试
- **关卡难度曲线**：多快引入新机制？需要玩家测试

---

## MVP Definition

**Core hypothesis**: 玩家觉得"画线→弹球→收集"的核心循环足够有趣，愿意反复尝试同一关。

**Required for MVP**:
1. 画线机制（画线成为物理挡板）
2. 球物理反弹
3. 光点收集
4. 出界失败
5. 10-20个手工关卡
6. 星级评价系统

**Explicitly NOT in MVP** (defer to later):
- 程序生成关卡
- 皮肤系统
- 排行榜
- 每日挑战

### Scope Tiers (if budget/time shrinks)

| Tier | Content | Features | Timeline |
| ---- | ---- | ---- | ---- |
| **MVP** | 20关手工关卡 | 画线+反弹+收集+星级 | 2周 |
| **Vertical Slice** | 1个世界(15关)完整体验 | +皮肤系统 | 3周 |
| **Alpha** | 5个世界(75关) | +排行榜 | 4周 |
| **Full Vision** | 100+关 + 程序生成 | +每日挑战 | 6周 |

---

## Next Steps

- [ ] 用 `/setup-engine` 配置引擎（推荐 Cocos Creator）
- [ ] 用 `/design-review design/gdd/game-concept.md` 验证文档完整性
- [ ] 用 `/map-systems` 拆解系统，规划设计文档顺序
- [ ] 用 `/prototype` 快速验证核心循环（画线反弹手感）
- [ ] 用 `/playtest-report` 测试原型
- [ ] 用 `/sprint-plan new` 规划第一个开发冲刺
