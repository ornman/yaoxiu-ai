# PRD-v2.6.9 盲盒动画重构 "绣韵幻境·臻"

## 一、现状问题诊断

### 1.1 功能缺陷
| 问题 | 严重程度 | 影响 |
|------|---------|------|
| 卡牌未添加到绣谱 | 🔴 Critical | 用户抽到的卡牌无法收集 |
| 绣谱数量显示错误 (0/11) | 🟠 High | 实际30张但显示11张 |
| 部分卡牌不显示 | 🟠 High | SVG渲染或数据问题 |
| 稀有度色彩样式缺失 | 🟡 Medium | 视觉反馈不完整 |

### 1.2 动画问题
| 问题 | 描述 | 期望效果 |
|------|------|---------|
| 翻转生硬 | 只有简单的rotateY，缺乏层次感 | 3D透视翻转+阴影变化 |
| 缺乏悬念 | 直接显示结果，没有开盒期待感 | 摇晃→发光→翻转→光芒四射 |
| 粒子效果简陋 | 只有20个圆点粒子 | 根据稀有度有不同粒子形态 |
| 神话级特效缺失 | 没有全屏震撼效果 | 彩虹光晕+金色雨+屏幕震动 |

### 1.3 对话气泡问题
参考截图显示：
- 用户消息：圆角气泡，浅色背景，底部有操作按钮（编辑/复制/分享）
- 当前实现：需要优化样式和交互

---

## 二、动画效果参考调研

### 2.1 业界优秀案例

#### A. 原神祈愿系统
- **机制**: 流星划过→光圈扩散→物品浮现
- **启示**: 多层次动画，从外到内聚焦

#### B. 阴阳师抽卡
- **机制**: 符咒燃烧→鸟居显现→SSR全屏特效
- **启示**: 文化元素融入动画

#### C. 星穹铁道跃迁
- **机制**: 列车穿越→光锥展开→角色立绘
- **启示**: 3D空间感，摄像机运动

#### D. 王者荣耀积分夺宝
- **机制**: 水晶旋转→光芒汇聚→物品弹出
- **启示**: 物理质感，弹性动画

### 2.2 动画心理学原理
1. **期待感构建**: 延迟0.5-1秒揭示结果，多巴胺分泌峰值
2. **损失厌恶转化**: 即使是普通品质也要有"安慰奖"视觉
3. **惊喜最大化**: 高稀有度需要打破常规动画模式

---

## 三、重构方案设计

### 3.1 整体动画流程 (Timeline)

```
0ms     - 用户点击
100ms   - 卡牌轻微缩小 (按压反馈)
300ms   - 开始摇晃 (3次，每次150ms)
800ms   - 盒盖缝隙透出光芒 (根据稀有度颜色)
1200ms  - 摇晃停止，悬浮上升
1500ms  - 盒盖爆开粒子效果
1700ms  - 3D翻转开始 (Y轴180度+Z轴微转)
2000ms  - 翻转完成，结果显现
2100ms  - 结果光晕扩散
2300ms  - 粒子爆炸 (根据稀有度)
2500ms  - 卡牌弹性回弹
2800ms  - 显示"收入绣谱"提示
```

### 3.2 分稀有度动画差异

#### ★ 普通 (Common)
- 光芒: 柔和白光
- 粒子: 10个银灰色小圆点，简单扩散
- 音效: 轻微"叮"声 (可选)
- 时长: 1.5秒

#### ★★ 稀有 (Rare)
- 光芒: 淡蓝色光晕
- 粒子: 20个蓝色星形，带拖尾
- 特殊: 卡牌边缘蓝色描边闪烁
- 时长: 1.8秒

#### ★★★ 史诗 (Epic)
- 光芒: 紫色旋转光晕
- 粒子: 35个紫水晶碎片，旋转扩散
- 特殊: 背景轻微模糊聚焦
- 时长: 2.2秒

#### ★★★★ 传说 (Legendary)
- 光芒: 金色光芒从缝隙射出
- 粒子: 50个金币+羽毛，抛物线落下
- 特殊: 
  - 屏幕轻微震动 (CSS shake)
  - 卡牌边框金色流光
  - 背景变暗聚光效果
- 时长: 2.8秒

#### ★★★★★ 神话 (Mythic)
- 光芒: 彩虹色光柱冲天
- 粒子: 80个多彩粒子 + 金色雨
- 特殊:
  - 全屏彩虹光晕覆盖
  - 卡牌悬浮旋转3周
  - 背景星光闪烁
  - "神话"字样浮现
  - 屏幕震动+波纹效果
- 时长: 4秒

### 3.3 3D翻转动画技术规格

```css
/* 基础3D场景 */
.blindbox-scene {
    perspective: 1000px;
    perspective-origin: center center;
}

/* 卡牌容器 */
.blindbox-card {
    transform-style: preserve-3d;
    transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 翻转动画关键帧 */
@keyframes cardFlip3D {
    0% {
        transform: rotateY(0deg) rotateZ(0deg) scale(1);
        filter: brightness(1);
    }
    30% {
        transform: rotateY(60deg) rotateZ(-5deg) scale(1.1);
        filter: brightness(1.3);
    }
    60% {
        transform: rotateY(120deg) rotateZ(5deg) scale(1.1);
        filter: brightness(1.3);
    }
    100% {
        transform: rotateY(180deg) rotateZ(0deg) scale(1);
        filter: brightness(1);
    }
}

/* 正面（盲盒） */
.card-front {
    backface-visibility: hidden;
    transform: rotateY(0deg);
}

/* 背面（图案） */
.card-back {
    backface-visibility: hidden;
    transform: rotateY(180deg);
}
```

### 3.4 粒子系统规格

```javascript
// 粒子类型配置
const PARTICLE_TYPES = {
    common: {
        count: 10,
        shape: 'circle',
        color: ['#95a5a6', '#bdc3c7'],
        size: { min: 4, max: 8 },
        velocity: { min: 2, max: 5 },
        gravity: 0.1,
        fadeOut: true
    },
    rare: {
        count: 20,
        shape: 'star',
        color: ['#3498db', '#5dade2', '#85c1e9'],
        size: { min: 6, max: 12 },
        velocity: { min: 3, max: 7 },
        trail: true,
        rotation: true
    },
    epic: {
        count: 35,
        shape: 'diamond',
        color: ['#9b59b6', '#af7ac5', '#c39bd3'],
        size: { min: 8, max: 16 },
        velocity: { min: 4, max: 9 },
        spiral: true
    },
    legendary: {
        count: 50,
        shapes: ['coin', 'feather', 'sparkle'],
        color: ['#f1c40f', '#f39c12', '#e67e22'],
        size: { min: 10, max: 20 },
        velocity: { min: 5, max: 12 },
        parabola: true,
        glow: true
    },
    mythic: {
        count: 80,
        shapes: ['crystal', 'star', 'orb', 'rainbow'],
        color: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
        size: { min: 12, max: 28 },
        velocity: { min: 6, max: 15 },
        rainbow: true,
        screenShake: true,
        ripple: true
    }
};
```

---

## 四、对话气泡优化

### 4.1 参考截图分析
从截图 `459a7cab-15b3-4059-a70f-4e65c951580b.png` 分析：
- 气泡: 圆角大 (约12px)
- 背景: 极浅灰色 (#f5f5f5)
- 边框: 无，但有细微阴影
- 操作栏: 底部独立区域，浅灰分隔线
- 按钮: 图标+文字，间距适中

### 4.2 新设计方案

```css
/* 用户消息气泡 */
.user-message {
    background: linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%);
    border-radius: 16px 16px 4px 16px;
    box-shadow: 
        0 1px 2px rgba(0,0,0,0.05),
        0 2px 4px rgba(0,0,0,0.03);
    padding: 12px 16px;
    position: relative;
}

/* 操作栏 */
.message-actions {
    display: flex;
    gap: 12px;
    padding-top: 8px;
    margin-top: 4px;
    border-top: 1px solid rgba(0,0,0,0.05);
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-tertiary);
    transition: all 0.2s ease;
}

.action-btn:hover {
    color: var(--primary);
}
```

---

## 五、功能修复清单

### 5.1 Critical Fix
- [ ] 在 `drawBlindBox()` 中添加 `PatternCollection.unlock(pattern.id)`
- [ ] 修复绣谱总数显示为 30

### 5.2 样式修复
- [ ] 为卡牌添加稀有度边框色
- [ ] 修复SVG显示问题
- [ ] 添加 mythic 到颜色映射

### 5.3 动画重构
- [ ] 重写 cardFlip 动画 (3D透视)
- [ ] 实现分稀有度粒子系统
- [ ] 添加神话级全屏特效
- [ ] 优化动画时间线

---

## 六、验收标准

| 检查项 | 验收标准 |
|--------|---------|
| 卡牌收集 | 抽奖后自动添加到绣谱，localStorage正确存储 |
| 数量显示 | 绣谱显示 "已收集 X / 30" |
| 翻转动画 | 3D透视翻转，流畅无卡顿 |
| 稀有度区分 | 5种稀有度视觉差异明显 |
| 神话特效 | 触发时有全屏震撼效果 |
| 对话气泡 | 与参考截图风格一致 |

---

## 七、开发排期

| 阶段 | 内容 | 预估时间 |
|------|------|---------|
| 1 | 功能修复 (收集+显示) | 2h |
| 2 | 对话气泡优化 | 1h |
| 3 | 动画重构核心 | 4h |
| 4 | 粒子系统实现 | 3h |
| 5 | 测试调优 | 2h |
| **总计** | | **12h** |
