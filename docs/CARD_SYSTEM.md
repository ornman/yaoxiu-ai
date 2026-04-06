# 瑶绣卡牌系统技术文档

## 一、当前卡牌生成方式

### 1.1 数据源
卡牌数据存储在 `PATTERN_DATABASE` 对象中，按稀有度分组：

```javascript
const PATTERN_DATABASE = {
    common: [
        { id: 'c1', name: '回纹', rarity: 'common', theme: '连绵不绝', description: '...', quote: '...', svg: '<svg>...</svg>' },
        // ... 更多普通卡牌
    ],
    rare: [...],      // 稀有卡牌
    epic: [...],      // 史诗卡牌
    legendary: [...], // 传说卡牌
    mythic: [...]     // 神话卡牌
};
```

### 1.2 渲染流程
在 `PatternCollection.render()` 方法中：

```javascript
render() {
    // 1. 获取已解锁卡牌ID列表
    const unlocked = this.getUnlocked();
    
    // 2. 获取所有卡牌数据
    const all = this.getAllPatterns();
    
    // 3. 排序：已解锁在前，稀有度高的在前
    const sorted = all.sort((a, b) => {
        const aUnlocked = unlocked.includes(a.id);
        const bUnlocked = unlocked.includes(b.id);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        return rarityWeight[b.rarity] - rarityWeight[a.rarity];
    });
    
    // 4. 生成HTML
    container.innerHTML = sorted.map(p => {
        const isUnlocked = unlocked.includes(p.id);
        const glowClass = isUnlocked ? `glow-${p.rarity}` : '';
        const svgStyle = isUnlocked ? '' : 'filter: grayscale(100%) opacity(0.4);';
        
        return `
            <div class="pattern-card ${glowClass}" onclick="showPatternDetail('${p.id}')">
                <span class="rarity-badge ${rarityClass}">${p.rarity}</span>
                <div class="pattern-icon">${p.svg}</div>
                <div class="pattern-info">
                    <div class="pattern-name">${p.name}</div>
                    <div class="pattern-theme">${p.theme}</div>
                </div>
            </div>
        `;
    }).join('');
}
```

### 1.3 当前卡牌结构
```
卡片容器 (.pattern-card)
├── 稀有度标签 (.rarity-badge) - 右上角绝对定位
├── 图标区域 (.pattern-icon) - SVG图标，居中
└── 信息区域 (.pattern-info)
    ├── 卡牌名称 (.pattern-name)
    └── 主题 (.pattern-theme)
```

---

## 二、外部素材库引用方案

### 2.1 推荐素材库

| 素材库 | 用途 | 链接 |
|---------|------|------|
| **LottieFiles** | 动态特效动画 | https://lottiefiles.com/ |
| **SVG Backgrounds** | 背景图案 | https://www.svgbackgrounds.com/ |
| **Hero Patterns** | 底纹图案 | https://heropatterns.com/ |
| **CSS.gg** | 简洁图标 | https://css.gg/ |
| **Iconoir** | 开源图标 | https://iconoir.com/ |
| **Rive** | 交互式动画 | https://rive.app/ |

### 2.2 引入方式

#### 方案一：直接引用 CDN
```html
<!-- 在 index.html 的 <head> 中添加 -->
<!-- Lottie 动画库 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

<!-- 外部图标库 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/css.gg/icons/all.css">
```

#### 方案二：下载本地引用
```bash
# 创建素材目录
mkdir -p assets/effects
mkdir -p assets/animations
mkdir -p assets/patterns

# 将下载的 JSON 动画/图片放入相应目录
```

### 2.3 实现示例

#### A. 为卡牌添加 Lottie 动画特效

```javascript
// 1. 在 PATTERN_DATABASE 中添加动画配置
const PATTERN_DATABASE = {
    legendary: [
        { 
            id: 'l1', 
            name: '盘王印', 
            rarity: 'legendary',
            // ... 其他字段
            svg: '<svg>...</svg>',
            // 新增：动画配置
            effect: {
                type: 'lottie',
                src: 'assets/animations/gold-sparkle.json', // 本地路径或 CDN
                loop: true,
                autoplay: true
            }
        }
    ]
};

// 2. 修改 render() 方法
render() {
    container.innerHTML = sorted.map(p => {
        const effectHTML = p.effect ? `
            <div class="pattern-effect" 
                 data-effect-type="${p.effect.type}"
                 data-effect-src="${p.effect.src}"
                 data-effect-loop="${p.effect.loop}">
            </div>
        ` : '';
        
        return `
            <div class="pattern-card ${glowClass}" data-pattern-id="${p.id}">
                ${effectHTML}
                <span class="rarity-badge">${p.rarity}</span>
                <div class="pattern-icon">${p.svg}</div>
                <div class="pattern-info">
                    <div class="pattern-name">${p.name}</div>
                    <div class="pattern-theme">${p.theme}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // 3. 初始化动画
    this.initCardEffects();
}

// 3. 新增方法：初始化卡牌特效
initCardEffects() {
    document.querySelectorAll('.pattern-effect').forEach(el => {
        const type = el.dataset.effectType;
        const src = el.dataset.effectSrc;
        
        if (type === 'lottie' && window.lottie) {
            lottie.loadAnimation({
                container: el,
                renderer: 'svg',
                loop: el.dataset.effectLoop === 'true',
                autoplay: true,
                path: src
            });
        }
    });
}
```

#### B. 为不同稀有度添加不同特效

```css
/* 在 CSS 中添加背景动画 */

/* 普通卡牌 - 简单底纹 */
.pattern-card[data-rarity="common"] {
    background-image: url('assets/patterns/dot-pattern.svg');
    background-size: 20px 20px;
}

/* 稀有卡牌 - 渐变光晕 */
.pattern-card[data-rarity="rare"] {
    background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%),
                url('assets/patterns/grid-pattern.svg');
    position: relative;
}
.pattern-card[data-rarity="rare"]::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.3), transparent 50%);
    animation: rareGlow 3s ease-in-out infinite;
}

/* 神话卡牌 - 金色光环 + 流光效果 */
.pattern-card[data-rarity="mythic"] {
    background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
    position: relative;
    overflow: hidden;
}
.pattern-card[data-rarity="mythic"]::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
        45deg,
        transparent 40%,
        rgba(255, 215, 0, 0.3) 50%,
        transparent 60%
    );
    animation: mythicShine 3s ease-in-out infinite;
}

@keyframes mythicShine {
    0% { transform: translateX(-100%) rotate(45deg); }
    100% { transform: translateX(100%) rotate(45deg); }
}
```

#### C. 卡牌悬停 3D 效果

```css
/* 添加 CSS 3D 翻转效果 */
.pattern-card {
    transform-style: preserve-3d;
    transition: transform 0.3s ease;
}

.pattern-card:hover {
    transform: rotateY(5deg) rotateX(-5deg) scale(1.05);
    box-shadow: 
        -10px 10px 30px rgba(0, 0, 0, 0.3),
        0 0 20px rgba(212, 165, 116, 0.5);
}

/* 光泽反射效果 */
.pattern-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.2) 0%,
        transparent 50%,
        rgba(255, 255, 255, 0.1) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    border-radius: inherit;
}

.pattern-card:hover::before {
    opacity: 1;
}
```

---

## 三、实施步骤

1. **选择素材库**：根据需求选择合适的素材来源

2. **下载/引入**：
   - 小文件可直接放入 `assets/` 目录
   - 大文件建议使用 CDN 或懒加载

3. **修改数据结构**：在 `PATTERN_DATABASE` 中添加特效配置

4. **更新渲染逻辑**：在 `PatternCollection.render()` 中处理特效初始化

5. **添加 CSS 样式**：为不同稀有度定义不同的视觉效果

---

## 四、注意事项

- **性能考虑**：大量动画可能影响页面流畅度，建议使用 CSS 动画优先，复杂效果使用 Lottie
- **兼容性**：确保所选素材在目标浏览器中正常显示
- **加载优化**：使用 `loading="lazy"` 或动态加载非首屏资源
