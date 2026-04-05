# 瑶绣·智问 - 瑶族刺绣知识问答

## 项目简介

基于 DeepSeek AI 的瑶族刺绣非遗知识问答平台，支持文字对话、图片识别等功能。

## 文件结构

```
瑶web aichat/
├── index.html              # 主程序（前端完整应用）
├── worker.js               # Cloudflare Worker 后端
├── README.md               # 项目说明
│
├── assets/                 # 资源文件
│   └── screenshots/        # 截图
│       ├── ac749219-e00e-46e6-ae89-57b2a15e7ce4.png
│       ├── d8ea9e91-447c-472e-ad3d-14a334f98c22.png
│       └── ScreenShot_2026-04-04_003638_175.png
│
└── docs/                   # 文档
    ├── PRD/                # 产品需求文档
    │   ├── PRD-v2.md
    │   └── PRD-image-upload.md
    │
    ├── design/             # 设计文档
    │   ├── 前端风格提示词.md
    │   ├── 动画设计文档.md
    │   ├── 技术架构说明.md
    │   ├── 瑶绣智问-项目介绍.md
    │   └── 知识图谱动画设计.md
    │
    └── tech/               # 技术文档
        ├── server.py       # 本地开发服务器
        └── settings-requirements.md
```

## 快速开始

### 方式一：本地运行（推荐开发）

1. 修改 `index.html` 第 30 行：
```javascript
const USE_DIRECT_API = true;
const DIRECT_API_KEY = '你的 DeepSeek API Key';
```

2. 直接用浏览器打开 `index.html`

### 方式二：生产部署

1. 部署 `worker.js` 到 Cloudflare Worker
2. 在 Worker 环境变量中设置 `DEEPSEEK_API_KEY`
3. 修改 `index.html` 第 30 行：
```javascript
const USE_DIRECT_API = false;
```
4. 修改 `index.html` 第 26 行，填入你的 Worker URL
5. 部署 `index.html` 到任意静态托管服务

## 核心功能

- 💬 智能问答：基于 DeepSeek V3/R1 的小瑶
- 📷 图片识别：拍照/上传识别瑶绣纹样
- ⭐ 智能收藏：收藏精彩内容，标签管理
- 📤 分享卡片：生成精美分享图
- 🎨 主题切换：黑底红彩/青花蓝调/素雅白底

## 技术栈

- 前端：原生 HTML + Tailwind CSS (CDN)
- 后端：Cloudflare Worker
- AI：DeepSeek API (支持 Vision 多模态)
- 存储：localStorage + IndexedDB

## 注意事项

- `index.html` 和 `worker.js` 是核心文件，必须保留在根目录
- 所有文档已整理到 `docs/` 目录
- 截图已整理到 `assets/screenshots/` 目录
