# 盲盒抽卡系统重构开发须知

> 本文档用于指导外部独立开发抽卡系统，并最终无缝集成到主项目

---

## 一、现有架构分析

### 1.1 当前抽卡系统组成

```
盲盒系统 (BlindBoxSystem)
├── 数据层
│   ├── PATTERN_DATABASE - 卡牌数据库
│   ├── localStorage - 抽卡次数存储
│   └── 用户缓存 - 已抽中卡牌
├── 逻辑层
│   ├── 概率计算 (randomRarity)
│   ├── 抽卡消耗 (useDraw)
│   ├── 奖励发放 (addBonusDraw)
│   └── XP结算 (addXP)
├── 展示层
│   ├── 盲盒弹窗 (blindboxModal)
│   ├── 卡牌翻转动画 (drawBlindBox)
│   ├── 粒子效果 (createDrawParticles)
│   └── 罕见度特效 (createMythicEffect)
└── 集成层
    ├── 对话奖励派发
    ├── 签到奖励派发
    └── 分享奖励派发
```

### 1.2 关键入口点

| 入口点 | 位置 | 功能 |
|--------|------|------|
| `openBlindBoxModal()` | 全局函数 | 打开盲盒弹窗 |
| `drawBlindBox()` | 全局函数 | 执行抽卡逻辑 |
| `BlindBoxSystem.render()` | 对象方法 | 更新UI显示 |
| `BlindBoxSystem.addBonusDraw(n)` | 对象方法 | 添加奖励次数 |

---

## 二、外部开发预留接口

### 2.1 必须保留的全局变量

这些变量在主项目中必须存在，外部模块需要读取/写入：

```javascript
// 必须保留的全局变量
let isGenerating = false;        // 是否正在生成AI回复
let chatHistory = [];            // 对话历史
let messageCount = 0;            // 消息计数

// 用于奖励派发的回调（需要主项目实现）
function onConversationComplete() {
    // 对话完成后触发
}

function onShareSuccess() {
    // 分享成功后触发
}

function onCheckinSuccess() {
    // 签到成功后触发
}
```

### 2.2 LocalStorage 键值规范

外部模块需要与主项目共享以下 localStorage 键：

```javascript
// 必须使用的 localStorage 键名前缀： yao-
const LS_KEYS = {
    // 抽卡次数
    DRAW_DATE: 'yao-draw-date',      // 最后抽卡日期
    DRAW_BASE: 'yao-draw-base',      // 基础次数
    DRAW_BONUS: 'yao-draw-bonus',    // 奖励次数
    
    // 已抽卡牌
    PATTERNS: 'yao-patterns',        // 已收集卡牌ID数组 JSON
    
    // 用户等级
    XP: 'yao-xp',                    // 当前经验值
    
    // 签到
    LAST_CHECKIN: 'yao-last-checkin',
    STREAK: 'yao-streak',
    
    // 每日对话计数（用于限制）
    CHAT_COUNT: 'yao-chat-{date}'
};
```

### 2.3 卡牌数据格式

外部模块必须提供符合以下格式的卡牌数据：

```typescript
interface PatternCard {
    id: string;           // 唯一标识，如 'c1', 'r2', 'e3', 'l1', 'm1'
    name: string;         // 卡牌名称
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    theme: string;        // 主题/字典
    description: string;  // 详细描述
    quote: string;        // 引用语句
    svg: string;          // SVG图标字符串
    
    // 可选：外部素材配置
    effect?: {
        type: 'lottie' | 'css' | 'image';
        src: string;      // 资源路径或CDN链接
        loop?: boolean;
        autoplay?: boolean;
    };
}
```

---

## 三、外部开发模块结构

### 3.1 推荐的目录结构

```
blindbox-refactor/              # 外部开发目录
├── src/
│   ├── core/                    # 核心逻辑
│   │   ├── BlindBoxCore.js       # 抽卡核心逻辑
│   │   ├── CardDatabase.js       # 卡牌数据库
│   │   └── RewardSystem.js       # 奖励系统
│   ├── ui/                      # UI组件
│   │   ├── BlindBoxModal.js      # 盲盒弹窗
│   │   ├── CardComponent.js      # 卡牌组件
│   │   ├── ParticleSystem.js     # 粒子系统
│   │   └── AnimationController.js # 动画控制器
│   ├── effects/                 # 特效资源
│   │   ├── lottie/               # Lottie动画
│   │   ├── css/                  # CSS动画
│   │   └── images/               # 图片素材
│   └── styles/
│       ├── blindbox.css          # 主样式
│       ├── animations.css        # 动画样式
│       └── rarity-effects.css    # 稀有度特效
├── demo/                       # 演示页面
│   ├── index.html              # 测试页面
│   └── mock-data.js            # 模拟数据
├── dist/                       # 构建输出
├── docs/                       # 文档
├── package.json
└── README.md
```

### 3.2 必须实现的核心接口

外部模块必须导出以下API，主项目才能正常调用：

```javascript
// ========== 必须导出的API ==========

/**
 * 初始化盲盒系统
 * @param {Object} options - 配置选项
 * @param {Function} options.onDrawComplete - 抽卡完成回调
 * @param {Function} options.onGetReward - 获得奖励回调
 */
function initBlindBoxSystem(options) {}

/**
 * 打开盲盒弹窗
 * @returns {Promise<boolean>} 是否成功打开
 */
function openBlindBox() {}

/**
 * 获取当前抽卡次数
 * @returns {Object} { base: number, bonus: number, total: number }
 */
function getDrawCount() {}

/**
 * 添加奖励抽卡次数
 * @param {number} count - 次数
 * @param {string} source - 来源（conversation/share/checkin）
 */
function addBonusDraw(count, source) {}

/**
 * 获取已收集卡牌列表
 * @returns {Array<string>} 卡牌ID数组
 */
function getCollectedCards() {}

/**
 * 打开绣谱面板
 * @returns {Promise<boolean>}
 */
function openCollection() {}

/**
 * 渲染红点标记
 * @param {HTMLElement} badgeElement - 红点DOM元素
 */
function renderBadge(badgeElement) {}
```

---

## 四、样式隔离方案

### 4.1 BEM命名规范

为避免与主项目样式冲突，必须使用前缀：

```css
/* 正确：使用前缀 */
.bb-modal { }
.bb-card { }
.bb-card__icon { }
.bb-card__name { }
.bb-card--legendary { }
.bb-particle { }

/* 错误：无前缀或通用名 */
.modal { }           /* 冲突风险 */
.card { }            /* 冲突风险 */
.pattern-card { }    /* 与现有重名 */
```

### 4.2 CSS 变量隔离

```css
/* 使用独立的CSS变量命名空间 */
:root {
    /* 盲盒系统专用变量 */
    --bb-primary: var(--gold, #d4a574);
    --bb-rarity-common: #95a5a6;
    --bb-rarity-rare: #3498db;
    --bb-rarity-epic: #9b59b6;
    --bb-rarity-legendary: #f1c40f;
    --bb-rarity-mythic: #e74c3c;
    
    /* 动画时长 */
    --bb-anim-flip: 0.8s;
    --bb-anim-shake: 0.5s;
    --bb-anim-particle: 1s;
}
```

### 4.3 Shadow DOM 方案（推荐）

如果需要完全隔离，可使用 Web Components：

```javascript
class BlindBoxModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                /* 完全隔离的样式 */
                .modal { ... }
                .card { ... }
            </style>
            <div class="modal">
                <slot></slot>
            </div>
        `;
    }
}
customElements.define('blind-box-modal', BlindBoxModal);
```

---

## 五、事件通信方案

### 5.1 发布-订阅模式

```javascript
// 盲盒系统内部发布事件
class BlindBoxEventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }
}

const bbEvents = new BlindBoxEventBus();

// 主项目订阅事件
bbEvents.on('draw:complete', (data) => {
    console.log('抽卡完成:', data.card);
    // 更新等级、XP等
});

bbEvents.on('card:new', (data) => {
    console.log('新卡牌:', data.cardId);
    // 触发收藏提示
});
```

### 5.2 必须触发的事件

| 事件名 | 触发时机 | 传参数据 |
|---------|---------|---------|
| `bb:init` | 系统初始化完成 | `{ version: string }` |
| `bb:open` | 弹窗打开 | `{ drawCount: number }` |
| `bb:draw:start` | 开始抽卡 | `{ timestamp: number }` |
| `bb:draw:complete` | 抽卡完成 | `{ card: PatternCard, isNew: boolean }` |
| `bb:reward` | 获得奖励次数 | `{ count: number, source: string }` |
| `bb:collection:open` | 打开绣谱 | `{ collectedCount: number }` |

---

## 六、数据兼容方案

### 6.1 版本控制

```javascript
// 在 localStorage 中存储版本号
const BB_VERSION = '2.0.0';

function initBlindBoxSystem() {
    const savedVersion = localStorage.getItem('yao-blindbox-version');
    
    if (savedVersion !== BB_VERSION) {
        // 版本更新，执行数据迁移
        migrateData(savedVersion, BB_VERSION);
        localStorage.setItem('yao-blindbox-version', BB_VERSION);
    }
}

function migrateData(fromVersion, toVersion) {
    // 数据迁移逻辑
    console.log(`迁移数据: ${fromVersion} -> ${toVersion}`);
}
```

### 6.2 数据备份与恢复

```javascript
const BlindBoxBackup = {
    // 导出所有盲盒数据
    export() {
        const data = {
            patterns: localStorage.getItem('yao-patterns'),
            drawDate: localStorage.getItem('yao-draw-date'),
            drawBase: localStorage.getItem('yao-draw-base'),
            drawBonus: localStorage.getItem('yao-draw-bonus'),
            xp: localStorage.getItem('yao-xp'),
            version: BB_VERSION
        };
        return JSON.stringify(data);
    },
    
    // 导入数据
    import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            // 验证数据完整性
            if (this.validate(data)) {
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== 'version') {
                        localStorage.setItem(`yao-${key}`, value);
                    }
                });
                return true;
            }
        } catch (e) {
            console.error('导入失败:', e);
        }
        return false;
    },
    
    validate(data) {
        return data && data.patterns && data.drawDate;
    }
};
```

---

## 七、集成步骤

### 7.1 集成前检查清单

```
☐ 1. 所有API函数已实现
☐ 2. 所有事件正确触发
☐ 3. localStorage 键值正确读写
☐ 4. 样式无冲突
☐ 5. 响应式布局正常
☐ 6. 动画流畅无卡顿
☐ 7. 兼容目标浏览器
☐ 8. 错误处理完善
```

### 7.2 渐进式集成

推荐使用功能开关模式：

```javascript
// 主项目配置
const FEATURE_FLAGS = {
    useNewBlindBox: false  // 功能开关
};

// 根据开关加载不同实现
function initBlindBox() {
    if (FEATURE_FLAGS.useNewBlindBox) {
        // 加载新版本
        import('./blindbox-v2/index.js').then(module => {
            module.initBlindBoxSystem();
        });
    } else {
        // 使用旧版本
        BlindBoxSystem.render();
    }
}
```

### 7.3 回滚方案

```javascript
// 保留旧版本备份
const BlindBoxSystemLegacy = { ...BlindBoxSystem };

function rollbackBlindBox() {
    // 恢复旧版本
    Object.assign(BlindBoxSystem, BlindBoxSystemLegacy);
    FEATURE_FLAGS.useNewBlindBox = false;
    showToast('已回滚到旧版本');
}
```

---

## 八、性能优化建议

### 8.1 懒加载策略

```javascript
// 非首屏资源懒加载
const lazyLoadEffects = {
    lottie: () => import('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js'),
    particles: () => import('./effects/ParticleEngine.js')
};

async function loadEffect(type) {
    if (!this.effectCache[type]) {
        this.effectCache[type] = await lazyLoadEffects[type]();
    }
    return this.effectCache[type];
}
```

### 8.2 卡牌池化

```javascript
// 对于大量卡牌，使用虚拟滚动
class CardPool {
    constructor() {
        this.pool = [];
        this.visibleCards = new Set();
    }
    
    // 只渲染可见区域的卡牌
    renderVisible(container, scrollTop, viewportHeight) {
        // 计算可见范围
        const startIndex = Math.floor(scrollTop / CARD_HEIGHT);
        const endIndex = Math.ceil((scrollTop + viewportHeight) / CARD_HEIGHT);
        
        // 重用DOM元素
        this.recycleInvisible(startIndex, endIndex);
        
        // 渲染新可见卡牌
        for (let i = startIndex; i <= endIndex; i++) {
            if (!this.visibleCards.has(i)) {
                this.renderCardAt(i, container);
            }
        }
    }
}
```

---

## 九、测试用例

### 9.1 必须测试的场景

```javascript
const TEST_CASES = [
    { desc: '首次打开盲盒', action: () => openBlindBox() },
    { desc: '次数耗尽抽卡', action: () => drawUntilEmpty() },
    { desc: '抽到神话卡牌', action: () => mockDraw('mythic') },
    { desc: '连续多次抽卡', action: () => rapidDraw(10) },
    { desc: '罕见度特效触发', action: () => testAllRarityEffects() },
    { desc: '对话奖励派发', action: () => testConversationReward() },
    { desc: '网络异常处理', action: () => testNetworkError() },
    { desc: '移动端触控操作', action: () => testTouchEvents() }
];
```

---

## 十、工程化建议

### 10.1 推荐技术栈

| 层级 | 推荐技术 | 说明 |
|------|----------|------|
| 构建工具 | Vite / Rollup | 快速构建，支持ESM |
| 语法 | TypeScript | 类型安全，可维护性强 |
| 样式 | PostCSS + Tailwind | 功能类命名，无冲突 |
| 动画 | GSAP / Framer Motion | 高性能动画库 |
| 测试 | Vitest + Playwright | 单元+端到端测试 |

### 10.2 开发工作流

```bash
# 1. 创建项目
npm create vite@latest blindbox-refactor -- --template vanilla-ts
cd blindbox-refactor

# 2. 安装依赖
npm install gsap @types/node

# 3. 启动开发服务
npm run dev

# 4. 构建生产版本
npm run build

# 5. 测试
npm run test
```

---

## 附录：快速检查清单

集成前确认以下项目：

- [ ] 所有文件使用 `bb-` 前缀命名
- [ ] 样式不影响主项目其他组件
- [ ] LocalStorage 键名符合规范
- [ ] 事件正确触发并传递
- [ ] 所有API函数可被主项目调用
- [ ] 移动端触控交互正常
- [ ] 动画在目标浏览器流畅
- [ ] 错误处理不影响主项目
- [ ] 文档完整最新

---

**版本**: v1.0  
**更新日期**: 2024-04-06  
**作者**: AI Assistant
