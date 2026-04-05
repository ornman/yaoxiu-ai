# 🚀 15 分钟快速上线指南

> 不想看长文档？跟着这 5 步，15 分钟让你的瑶绣 AI 上线！

---

## 你需要准备的

- [ ] GitHub 账号（免费注册）
- [ ] Cloudflare 账号（免费注册）
- [ ] 域名（可选，可以先免费用）

---

## 第 1 步：部署 Worker（5分钟）

1. 登录 [Cloudflare](https://dash.cloudflare.com)
2. Workers & Pages → Create application → Create Worker
3. 取名：`yao-api`
4. 粘贴 `worker.js` 代码
5. 修改 API Key：
   ```javascript
   DEEPSEEK_API_KEY: 'sk-你的DeepSeek密钥',
   QWEN_API_KEY: 'sk-你的阿里云密钥',
   ```
6. Save and deploy
7. 复制地址：`https://yao-api.xxx.workers.dev`

✅ **Worker 部署完成！**

---

## 第 2 步：上传代码到 GitHub（3分钟）

```bash
cd "瑶web aichat"
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/yaoxiu-ai.git
git push -u origin main
```

或用 GitHub Desktop 图形界面上传。

✅ **代码已上传！**

---

## 第 3 步：部署前端到 Vercel（5分钟）

1. 登录 [Vercel](https://vercel.com)（用 GitHub 账号登录）
2. Add New Project → 导入 `yaoxiu-ai` 仓库
3. Framework Preset: **Other**
4. Deploy
5. 等待 1 分钟，获得域名：`https://yaoxiu-ai.vercel.app`

✅ **前端部署完成！**

---

## 第 4 步：配置 API 地址（2分钟）

在 Vercel 项目设置中添加环境变量：

Settings → Environment Variables
```
Name: VITE_API_URL
Value: https://yao-api.xxx.workers.dev
```

或者在 `index.html` 中直接修改：
```javascript
const DEFAULT_API_URL = 'https://yao-api.xxx.workers.dev';
```

然后重新 Deploy。

✅ **配置完成！**

---

## 第 5 步：测试 & 分享（随时）

打开 `https://yaoxiu-ai.vercel.app`

- 发送文字消息测试 ✓
- 上传图片测试 ✓
- 收藏功能测试 ✓

全部正常？**恭喜你，上线了！** 🎉

把链接分享给朋友，全世界都能访问！

---

## 进阶：绑定自己的域名（可选）

### 买域名

推荐：[Namecheap](https://namecheap.com) 或 [Cloudflare Registrar](https://cloudflare.com/products/registrar/)

- .com 约 ¥50-80/年
- .net 约 ¥70/年

### 绑定到 Vercel

1. Vercel 项目 → Settings → Domains
2. 输入你的域名：`yaoxiu-ai.com`
3. 按提示添加 DNS 记录
4. 等待生效（几分钟）

✅ **现在访问 `https://yaoxiu-ai.com` 就是你的 AI 助手！**

---

## 费用

| 项目 | 费用 |
|------|------|
| Worker | 免费（10万次/天） |
| Vercel | 免费 |
| 域名 | 可选，¥0-80/年 |
| API 调用 | 按量付费 |

**初期总成本：¥0！**

---

## 遇到问题？

1. 看详细文档：`complete-deployment-guide.md`
2. 检查 Worker 日志
3. 查看浏览器控制台报错

**祝你上线顺利！** 🚀
