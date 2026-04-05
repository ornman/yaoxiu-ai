# 瑶绣项目结构说明

## 📁 目录结构

```
E:\桌面\瑶web aichat\
├── index.html              # 主页面（前端应用）
├── worker.js               # Cloudflare Worker 后端代码
├── README.md               # 项目说明文档
├── PROJECT_STRUCTURE.md    # 本文件（项目结构说明）
│
├── assets/                 # 静态资源
│   └── screenshots/        # 截图文件
│       ├── 355565dc-52c8-4537-8558-07a1fddee427.png
│       ├── 7e69cebf-28d5-42ec-8eb9-b80173aac58c.png
│       ├── f4f66daf-2f46-42c6-8efa-48c6e4eba075.png
│       └── ScreenShot_2026-04-04_122924_797.png
│
├── docs/                   # 文档目录
│   └── 国内无墙部署指南.md   # 部署教程
│
├── tests/                  # 测试文件
│   ├── fav-share-test.html # 分享功能测试
│   ├── test-qwen-vl.html   # Qwen-VL 测试
│   └── wrangler.toml       # Worker 配置文件
│
└── archive/                # 归档目录（临时文件）
```

## 📄 核心文件

| 文件 | 说明 |
|------|------|
| `index.html` | 前端主页面，包含完整的聊天界面和功能 |
| `worker.js` | Cloudflare Worker 后端，处理 API 请求和安全验证 |
| `README.md` | 项目基本信息和使用说明 |

## 🚀 部署方式

1. **前端**: 通过 GitHub → Vercel 自动部署
2. **后端**: 通过 Wrangler CLI 部署到 Cloudflare Workers

## 🔒 安全特性

- CORS 域名限制
- 速率限制（30 req/min）
- 输入验证和注入检测
- CSP 内容安全策略
- XSS 防护

## 📱 适配

- 响应式设计（移动端/桌面端）
- iOS/Android 安全区域适配
- 底部输入框固定
