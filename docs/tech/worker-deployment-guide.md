# Cloudflare Worker 部署指南

## 什么是 Worker？

**Cloudflare Worker** 是一个运行在云端的无服务器函数，可以：
- 转发你的 API 请求（解决浏览器 CORS 跨域限制）
- 保护你的 API Key（不暴露在前端代码中）
- 统一处理 DeepSeek + Qwen-VL 两种 AI 服务

## 快速部署（3分钟）

### 第一步：注册 Cloudflare 账号

1. 访问 [cloudflare.com](https://www.cloudflare.com/)
2. 点击 "Sign Up" 注册账号（可用邮箱或手机号）
3. 验证邮箱

### 第二步：创建 Worker

1. 登录后进入 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. 点击 "Create application"
3. 选择 "Create Worker"
4. 给 Worker 起个名字，比如：`yaoembroidery-api`
5. 点击 "Deploy" 创建

### 第三步：配置代码

1. 进入 Worker 编辑页面
2. 删除默认代码，粘贴 `worker.js` 的完整代码
3. 修改配置区域的 API Key：

```javascript
const CONFIG = {
  // DeepSeek API Key（用于文字对话）
  DEEPSEEK_API_KEY: 'sk-你的DeepSeek密钥',
  
  // 阿里云百炼 API Key（用于图片识别）
  QWEN_API_KEY: 'sk-你的阿里云密钥',
  
  // 是否使用环境变量（建议部署后设为 true，在 Workers 设置里添加密钥）
  USE_ENV_KEY: false,
};
```

4. 点击 "Save and deploy"

### 第四步：获取 Worker 地址

部署成功后，你会得到一个地址：
```
https://yaoembroidery-api.你的用户名.workers.dev
```

这个地址就是 `DEFAULT_API_URL`，填写到项目配置中。

---

## 安全建议（推荐）

### 使用环境变量存储 API Key（更安全）

**不要直接把 API Key 写在代码里！**

1. 在 Worker 页面点击 "Settings" → "Variables"
2. 添加两个环境变量：
   - `DEEPSEEK_API_KEY` = `sk-你的DeepSeek密钥`
   - `QWEN_API_KEY` = `sk-你的阿里云密钥`
3. 将代码中的 `USE_ENV_KEY` 设为 `true`：

```javascript
const CONFIG = {
  USE_ENV_KEY: true,  // 使用环境变量
};
```

这样即使别人看到你的 Worker 代码，也拿不到 API Key。

---

## 测试 Worker 是否正常工作

### 方法1：浏览器直接访问
在浏览器地址栏输入：
```
https://你的-worker地址.workers.dev
```

应该会返回：`{"error":"Method not allowed"}`（这是正常的，因为只接受 POST 请求）

### 方法2：在项目中测试
1. 打开项目设置面板
2. 填写 Worker URL
3. 点击 "测试连接"

### 方法3：curl 命令测试

```bash
# 测试文字对话
curl -X POST https://你的-worker地址.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","model":"deepseek-chat"}'

# 测试图片识别（需要有 base64 图片）
curl -X POST https://你的-worker地址.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"type":"vision","imageData":["base64图片数据"],"text":"描述这张图片"}'
```

---

## 常见问题

### Q: Worker 是免费的吗？
A: 是的！Cloudflare Worker 每天有 **100,000 次免费请求**，个人使用完全够用。

### Q: 需要绑定域名吗？
A: 不需要。自带的 `workers.dev` 域名就能用。

### Q: Worker 在国内访问快吗？
A: Cloudflare 全球有节点，国内访问速度一般。如果慢，可以考虑：
- 绑定国内 CDN（如腾讯云、阿里云）
- 或者使用 Vercel/Netlify 的 Serverless Functions 作为替代方案

### Q: 可以多个项目共用一个 Worker 吗？
A: 可以，但建议分开，方便管理和统计用量。

---

## 替代方案（不用 Worker）

如果你不想用 Cloudflare Worker，还有这些选择：

### 方案A：Vercel Serverless Functions
1. 创建 `api/chat.js` 文件
2. 部署到 Vercel
3. 免费额度 generous

### 方案B：本地开发时用 CORS 扩展
安装浏览器扩展临时绕过 CORS（仅测试用）：
- Chrome: [CORS Unblock](https://chrome.google.com/webstore/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino)
- Edge: [Allow CORS](https://microsoftedge.microsoft.com/addons/detail/allow-cors-accesscontro/bhjepjpgngghppolkjdhckmnfphffdag)

### 方案C：后端服务器
自己搭一个 Node.js/Python 后端，部署到云服务器。

---

## 故障排查

### Worker 返回 500 错误
检查：
1. API Key 是否正确填写
2. 代码语法是否正确（括号是否配对）

### Worker 返回 403 错误
可能是 API Key 被阿里云/DeepSeek 拒绝了，检查：
1. Key 是否过期
2. 账户余额是否充足

### 前端显示 "Failed to fetch"
1. Worker 地址是否填写正确
2. Worker 是否已部署（不是只保存了草稿）
3. 浏览器网络是否正常
