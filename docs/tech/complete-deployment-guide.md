# 瑶绣智问 - 完整公网部署指南

> 从零开始，让你的瑶绣 AI 助手上线，全世界都能访问！

---

## 📋 部署流程概览

```
1. 部署 Worker（后端API）
      ↓
2. 准备域名（免费/付费）
      ↓
3. 绑定域名到 Worker
      ↓
4. 部署前端（Vercel/Netlify/Cloudflare Pages）
      ↓
5. 配置完成，全球访问！
```

---

## 第一步：部署 Worker（已完成）

参考 `worker-deployment-guide.md`，确保：
- Worker 已创建并部署
- API Key 已配置
- 测试连接成功

**记住你的 Worker 地址**：
```
https://your-worker.your-name.workers.dev
```

---

## 第二步：准备域名

### 方案 A：免费域名（推荐测试用）

#### 1. Freenom（.tk/.ml/.ga/.cf/.gq）
**注意：Freenom 目前不太稳定，建议用方案 B**

访问 [freenom.com](https://freenom.com)
1. 搜索你想要的域名（如 `yaoxiu-ai.tk`）
2. 选择 12 个月免费
3. 注册账号并结账（$0.00）
4. 记住域名：`yaoxiu-ai.tk`

#### 2. Cloudflare Pages 子域名（最简单）
**不需要买域名！** 部署前端时会自动获得：
```
https://your-project.pages.dev
```

#### 3. Vercel 子域名（最简单）
**不需要买域名！** 部署前端时会自动获得：
```
https://your-project.vercel.app
```

---

### 方案 B：付费域名（推荐正式使用）

#### 推荐购买平台

| 平台 | 价格 | 特点 |
|------|------|------|
| [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | 成本价 | 无溢价，.com 约 $9/年 |
| [Namecheap](https://www.namecheap.com/) | 便宜 | .com 首年 $5-8，常促销 |
| [阿里云](https://wanwang.aliyun.com/) | 中文 | .com 约 ¥60/年，国内备案方便 |
| [腾讯云](https://dnspod.cloud.tencent.com/) | 中文 | .com 约 ¥60/年 |

#### 推荐域名后缀

| 后缀 | 价格 | 适用场景 |
|------|------|----------|
| .com | ¥60-80/年 | 正式项目，最正规 |
| .net | ¥70/年 | 技术项目 |
| .org | ¥80/年 | 开源/非营利 |
| .app | ¥120/年 | 应用类，强制 HTTPS |
| .dev | ¥120/年 | 开发者项目，强制 HTTPS |
| .ai | ¥300+/年 | AI 项目，贵但潮 |
| .cn | ¥30/年 | 国内项目，需备案 |

#### 购买步骤（以 Cloudflare 为例）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 "Domain Registration" → "Register Domains"
3. 搜索你想要的域名（如 `yaoxiu-ai.com`）
4. 添加到购物车，填写信息
5. 支付（支持支付宝/信用卡）
6. 域名归你了！

---

## 第三步：绑定域名到 Worker

### 情况 1：使用 Cloudflare Pages 子域名（推荐）

**最简单！不需要额外配置**

部署前端到 Cloudflare Pages 后，自动获得 `xxx.pages.dev`，Worker 可以直接访问。

### 情况 2：使用自己的域名

#### A. 域名在 Cloudflare 购买（最简单）

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名
3. 左侧菜单 "Workers Routes"
4. 点击 "Add route"
5. 填写：
   - Route: `api.yaoxiu-ai.com/*`（你的子域名）
   - Worker: 选择你创建的 Worker
6. 保存！

#### B. 域名在其他平台购买

**需要修改 DNS 解析**

1. 登录你的域名管理平台（如阿里云/腾讯云）
2. 找到 DNS 解析/域名解析设置
3. 添加 CNAME 记录：
   - 主机记录: `api`（表示 api.yaoxiu-ai.com）
   - 记录类型: `CNAME`
   - 记录值: `your-worker.your-name.workers.dev`
   - TTL: 默认
4. 等待 5-10 分钟生效

验证是否成功：
```bash
ping api.yaoxiu-ai.com
# 应该显示 Cloudflare 的 IP
```

---

## 第四步：部署前端

### 方案 1：Cloudflare Pages（推荐，国内访问快）

#### 方法一：Git 部署（推荐）

1. 把代码上传到 GitHub/GitLab
```bash
cd 瑶web-aichat
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/yaoxiu-ai.git
git push -u origin master
```

2. 登录 [Cloudflare Pages](https://pages.cloudflare.com)
3. 点击 "Create a project"
4. 连接 GitHub，选择你的仓库
5. 配置：
   - Framework preset: None
   - Build command: （留空）
   - Build output directory: （留空）
6. 点击 "Save and Deploy"
7. 等待部署完成，获得域名：`https://yaoxiu-ai.pages.dev`

#### 方法二：直接上传

1. [Cloudflare Pages](https://pages.cloudflare.com) → "Upload assets"
2. 拖拽整个项目文件夹
3. 自动部署，获得域名

---

### 方案 2：Vercel（部署最简单）

1. 把代码上传到 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 点击 "Add New Project"
4. 导入 GitHub 仓库
5. Framework Preset: 选 "Other"
6. 点击 Deploy
7. 获得域名：`https://yaoxiu-ai.vercel.app`

**Vercel 特点**：
- ✅ 部署最简单，一键完成
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ❌ 国内访问可能稍慢

---

### 方案 3：Netlify

类似 Vercel，也是：
1. 连接 GitHub
2. 选择仓库
3. 一键部署

---

### 方案 4：GitHub Pages（纯静态，免费）

1. 上传代码到 GitHub
2. 进入仓库 Settings → Pages
3. Source: Deploy from a branch
4. Branch: master / root
5. 保存，获得域名：`https://你的用户名.github.io/yaoxiu-ai`

**限制**：
- 只能是纯静态（你的项目可以）
- 国内访问慢

---

## 第五步：配置项目

### 修改 index.html 中的配置

部署完成后，需要告诉前端你的 Worker 地址：

```javascript
// index.html 中修改
const DEFAULT_API_URL = 'https://你的-worker地址';
// 或
const DEFAULT_API_URL = 'https://api.yaoxiu-ai.com'; // 如果你绑定了自定义域名
```

### 环境变量配置（推荐）

不同平台配置环境变量的方式：

#### Vercel
Settings → Environment Variables
```
API_URL = https://api.yaoxiu-ai.com
```

#### Cloudflare Pages
Settings → Environment variables
```
API_URL = https://api.yaoxiu-ai.com
```

#### Netlify
Site settings → Build & deploy → Environment
```
API_URL = https://api.yaoxiu-ai.com
```

---

## 第六步：绑定自定义域名（可选）

### 前端绑定域名

#### Cloudflare Pages
1. 进入项目 → Custom domains
2. 点击 "Set up a custom domain"
3. 输入你的域名：`yaoxiu-ai.com`
4. 按照提示添加 DNS 记录
5. 等待生效（通常几分钟）

#### Vercel
1. 进入项目 → Settings → Domains
2. 输入你的域名
3. 按照提示配置 DNS
4. 自动申请 HTTPS 证书

---

## 完整示例配置

### 场景：使用 Cloudflare 全套（推荐）

```
域名: yaoxiu-ai.com（在 Cloudflare 购买，¥60/年）

Worker: worker.yaoxiu-ai.com
   ↓ 绑定
前端: yaoxiu-ai.com（Cloudflare Pages）
```

**用户访问流程**：
```
用户 → yaoxiu-ai.com（前端页面）
         ↓ 用户发送消息
      worker.yaoxiu-ai.com（Worker API）
         ↓ 转发请求
      DeepSeek / 阿里云 Qwen-VL
         ↓ 返回结果
      用户看到回复
```

---

## 费用总结

| 项目 | 费用 | 说明 |
|------|------|------|
| Worker | 免费 | 10万次请求/天 |
| 域名 | ¥0-80/年 | .tk免费，.com约¥60 |
| 前端托管 | 免费 | Vercel/Netlify/Pages都免费 |
| DeepSeek API | 按量 | 约 ¥1-2/千次对话 |
| 阿里云 Qwen-VL | 按量 | 约 ¥2-4/千次识别 |

**月均成本**：¥0-100（取决于使用量）

---

## 故障排查

### 域名打不开
1. DNS 解析是否生效？`ping 你的域名`
2. SSL 证书是否生效？访问 `https://你的域名`
3. 前端是否正确部署？检查构建日志

### API 请求失败
1. Worker 地址是否正确？
2. Worker 是否正常运行？查看 Worker 日志
3. API Key 是否有效？检查余额

### 国内访问慢
1. 使用 Cloudflare Pages（有国内节点）
2. 或购买国内 CDN 加速
3. 或部署到国内平台（Vercel 国内版、阿里云 OSS）

---

## 下一步

完成部署后，你可以：
1. 分享给朋友使用
2. 提交到产品导航站（如 即刻、V2EX）
3. 收集反馈，持续优化

恭喜你，你的瑶绣 AI 助手正式上线了！🎉
