# PRD: 瑶绣智问 - 安全防护体系建设

> 版本: 1.0.0 | 日期: 2026-04-25 | 状态: 待开发

---

## 一、项目背景

### 1.1 现状

瑶绣智问（小瑶 AI）是一个基于 Cloudflare Worker + Vercel 的 AI 问答应用，当前存在 **3 个严重漏洞、5 个高危漏洞、5 个中危漏洞、3 个低危漏洞**，涉及密钥泄露、XSS、提示注入、CSP 失效等核心安全问题。

### 1.2 目标

建立完整的安全防护体系，使应用达到可面向公众安全运行的标准。分三阶段实施，优先解决可直接被利用的漏洞。

### 1.3 核心原则

- **纵深防御**: 不依赖单一防护层，多层安全措施叠加
- **最小权限**: API 密钥、Token 等凭证仅授予必要权限
- **安全默认**: 所有安全策略默认开启，不需要开发者手动启用
- **零信任前端**: 不信任任何客户端输入，所有验证在服务端执行

---

## 二、阶段划分

### Phase 1: 紧急修复（0-3 天）— 消除可直接被利用的威胁

| 编号 | 任务 | 优先级 | 关联漏洞 |
|------|------|--------|----------|
| P1-01 | 轮换泄露的 API 密钥和 Token | P0 | C-01, C-02 |
| P1-02 | 清理 Git 历史中的敏感信息 | P0 | C-01, C-02 |
| P1-03 | 修复消息角色注入漏洞 | P0 | C-03 |
| P1-04 | 启用提示注入检测（从仅记录改为拒绝） | P0 | H-03 |
| P1-05 | 添加 DOMPurify 净化 AI 输出 | P1 | H-01 |
| P1-06 | 修复 onclick 属性中的 XSS 向量 | P1 | M-01, M-02 |

### Phase 2: 核心加固（4-10 天）— 加强防护层

| 编号 | 任务 | 优先级 | 关联漏洞 |
|------|------|--------|----------|
| P2-01 | 重构 CSP 策略（移除 unsafe-inline/eval） | P1 | H-02 |
| P2-02 | 实现基于 Cloudflare KV 的分布式速率限制 | P1 | H-05 |
| P2-03 | 添加安全响应头（HSTS, X-Frame-Options 等） | P2 | L-03 |
| P2-04 | 收紧 CORS 策略（移除 Vercel 预览通配符） | P2 | M-04 |
| P2-05 | 为 CDN 脚本添加 SRI 完整性校验 | P2 | M-05 |
| P2-06 | 移除 localStorage 中的 API 密钥明文存储 | P2 | H-04 |

### Phase 3: 长期安全机制（11-20 天）— 建立持续安全能力

| 编号 | 任务 | 优先级 | 关联漏洞 |
|------|------|--------|----------|
| P3-01 | 实现请求签名验证机制 | P2 | 防篡改 |
| P3-02 | 添加异常请求监控和告警 | P2 | 通用防护 |
| P3-03 | 实现内容安全审计日志 | P3 | 可追溯性 |
| P3-04 | 建立自动化安全检测 CI 流程 | P3 | 持续安全 |
| P3-05 | 安全配置文件和部署规范文档 | P3 | 运维安全 |

---

## 三、功能需求详细设计

### 3.1 P1-01: 密钥轮换与清理

**目标**: 消除已泄露凭证的所有风险

**具体操作**:

1. **DeepSeek API 密钥**:
   - 在 DeepSeek 平台立即作废旧密钥 `sk-3144bf0982b...`
   - 生成新密钥，通过 `wrangler secret put DEEPSEEK_API_KEY` 更新 Worker
   - 更新本地开发 `.dev.vars` 文件（确保在 `.gitignore` 中）

2. **Cloudflare API Token**:
   - 在 Cloudflare Dashboard 撤销旧 Token
   - 创建新 Token，仅授予 `Workers Scripts:Edit` 权限（最小权限原则）
   - 更新 `.env` 文件和所有部署脚本

3. **Git 历史清理**:
   - 使用 BFG Repo-Cleaner 从 Git 历史中删除包含密钥的文件
   - 或使用 `git filter-repo` 替换敏感字符串
   - 清理后执行 `git push --force` 覆盖远程历史
   - 通知所有协作者重新 clone 仓库

4. **代码清理**:
   - `AGENTS.md`: 将实际 Token 替换为 `<YOUR_CLOUDFLARE_API_TOKEN>` 占位符
   - `docs/tech/server.py`: 将硬编码密钥替换为 `os.environ.get('DEEPSEEK_API_KEY')`

**验收标准**:
- [ ] 旧密钥在各自平台上已失效
- [ ] `git log --all -p | grep -i "sk-3144\|cfut_EgZR"` 返回空
- [ ] 应用功能正常（新密钥生效）
- [ ] `.env` 文件不在 Git 跟踪中

---

### 3.2 P1-03: 消息角色注入防护

**目标**: 防止客户端通过伪造消息角色覆盖系统提示词

**技术方案**:

在 `worker.js` 的 `handleChatWithContext` 函数中，对客户端传入的 `messages` 数组进行严格过滤：

```javascript
function sanitizeMessages(clientMessages, maxLength = 50) {
  if (!Array.isArray(clientMessages)) return [];

  const ALLOWED_ROLES = new Set(['user', 'assistant']);

  return clientMessages
    .filter(msg =>
      msg &&
      typeof msg === 'object' &&
      ALLOWED_ROLES.has(msg.role) &&
      typeof msg.content === 'string' &&
      msg.content.length <= 2000
    )
    .slice(0, maxLength)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
}
```

**关键规则**:
- 仅允许 `user` 和 `assistant` 两种角色
- 每条消息内容不超过 2000 字符
- 消息总数上限 50 条（防止上下文膨胀攻击）
- 只提取 `role` 和 `content` 两个字段，丢弃其他属性

**验收标准**:
- [ ] 发送 `{"role": "system", "content": "..."}` 的消息被过滤
- [ ] 正常的 user/assistant 消息不受影响
- [ ] 超过 50 条消息时只取最后 50 条
- [ ] 包含额外字段（如 `function_call`）的消息被安全处理

---

### 3.3 P1-05: DOMPurify XSS 防护

**目标**: 防止 AI 输出中的恶意 HTML/JS 在用户浏览器执行

**技术方案**:

1. 在 `index.html` 的 `<head>` 中引入 DOMPurify:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js"
           integrity="sha384-<hash>"
           crossorigin="anonymous"></script>
   ```

2. 封装安全的 Markdown 渲染函数:
   ```javascript
   function safeMarkdownRender(text) {
     const rawHtml = marked.parse(text);
     return DOMPurify.sanitize(rawHtml, {
       ALLOWED_TAGS: [
         'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
         'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3',
         'h4', 'h5', 'h6', 'a', 'img', 'table', 'thead',
         'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div',
         'sub', 'sup', 'details', 'summary'
       ],
       ALLOWED_ATTR: [
         'href', 'src', 'alt', 'title', 'class', 'id',
         'target', 'rel', 'loading', 'width', 'height'
       ],
       ADD_ATTR: ['target']
     });
   }
   ```

3. 替换所有 `innerHTML = marked.parse(...)` 为 `innerHTML = safeMarkdownRender(...)`

**验收标准**:
- [ ] AI 输出 `<script>alert(1)</script>` 不执行
- [ ] AI 输出 `<img onerror="alert(1)" src=x>` 不执行
- [ ] 正常 Markdown 渲染（代码块、表格、列表）不受影响
- [ ] 代码高亮（Highlight.js）仍正常工作

---

### 3.4 P2-01: CSP 策略重构

**目标**: 实施有效的 CSP，阻止 XSS 和数据外泄

**技术方案**:

移除 `unsafe-inline` 和 `unsafe-eval`，使用 nonce-based CSP：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self' 'nonce-{RANDOM}'
    cdnjs.cloudflare.com cdn.jsdelivr.net cdn.tailwindcss.com;
  style-src 'self' 'unsafe-inline'
    fonts.googleapis.com cdn.tailwindcss.com;
  font-src fonts.googleapis.com fonts.gstatic.com;
  img-src 'self' data: blob:
    cdn.jsdelivr.net cdn.cloudflare.com;
  connect-src https://api.yaoxiumax.top
    https://api.deepseek.com https://dashscope.aliyuncs.com;
  object-src 'none';
  base-uri 'none';
  form-action 'none';
">
```

**注意事项**:
- `style-src` 保留 `unsafe-inline`（Tailwind CSS 运行时需要）
- `script-src` 使用 nonce 替代 unsafe-inline
- `connect-src` 限制为已知 API 域名
- 移除 `img-src *` 通配符

**验收标准**:
- [ ] 浏览器控制台无 CSP 违规警告
- [ ] 所有页面功能正常
- [ ] 尝试内联脚本执行被 CSP 阻止
- [ ] 外部请求只能连接到白名单域名

---

### 3.5 P2-02: 分布式速率限制

**目标**: 在 Cloudflare 边缘节点间实现一致的速率限制

**技术方案 - 使用 Cloudflare KV**:

```javascript
// worker.js 中新增
async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT_KV) {
    // KV 未绑定时的降级方案：使用内存限制
    return checkMemoryRateLimit(ip);
  }

  const key = `rate:${ip}`;
  const record = await env.RATE_LIMIT_KV.get(key, { type: 'json' }) || {
    count: 0,
    expires: Date.now() + 60000
  };

  if (Date.now() > record.expires) {
    record.count = 0;
    record.expires = Date.now() + 60000;
  }

  record.count++;

  await env.RATE_LIMIT_KV.put(key, JSON.stringify(record), {
    expirationTtl: 120 // 2 分钟后自动清理
  });

  return {
    allowed: record.count <= 30,
    remaining: Math.max(0, 30 - record.count),
    resetAt: record.expires
  };
}
```

**基础设施变更**:
- 在 Cloudflare Dashboard 创建 KV 命名空间 `RATE_LIMIT_KV`
- 在 `wrangler.toml` 中绑定 KV:
  ```toml
  [[kv_namespaces]]
  binding = "RATE_LIMIT_KV"
  id = "<kv-namespace-id>"
  ```

**降级策略**: 若 KV 不可用，回退到当前内存 Map 方案（确保不因基础设施问题中断服务）

**验收标准**:
- [ ] 同一 IP 在 60 秒内超过 30 次请求被拒绝
- [ ] 从不同地区发出的请求共享同一计数
- [ ] Worker 重启后速率限制状态不丢失
- [ ] KV 不可用时自动降级到内存限制

---

### 3.6 P2-03: 安全响应头

**目标**: 为所有 HTTP 响应添加标准安全头

**技术方案**:

在 `worker.js` 的 CORS/响应头函数中添加:

```javascript
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',           // 现代浏览器不推荐使用，显式关闭
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
  };
}
```

**注意**: 前端 CSP 通过 `<meta>` 标签控制；Worker 的 CSP 仅用于 API 响应（主要是 `frame-ancestors 'none'` 防止点击劫持）。

---

### 3.7 P3-01: 请求签名验证

**目标**: 防止请求被篡改或重放

**技术方案**:

1. 前端生成请求签名:
   ```javascript
   function createSignedRequest(payload) {
     const timestamp = Date.now();
     const nonce = crypto.randomUUID();
     const body = JSON.stringify(payload);
     const message = `${timestamp}:${nonce}:${body}`;

     // 使用 Web Crypto API HMAC-SHA256
     const signature = await hmacSign(message, getClientSecret());

     return {
       ...payload,
       _meta: { timestamp, nonce, signature }
     };
   }
   ```

2. Worker 端验证签名:
   - 校验时间戳在 ±5 分钟内（防重放）
   - 校验 nonce 未被使用过（可用 KV 存储已用 nonce）
   - 校验 HMAC 签名匹配（防篡改）

**注意**: 此方案需要一种密钥分发机制（如首次访问时 Worker 通过 Set-Cookie 下发签名密钥），复杂度较高，作为 Phase 3 实施。

---

### 3.8 P3-02: 异常请求监控与告警

**目标**: 实时检测和响应安全事件

**监控指标**:

| 指标 | 阈值 | 动作 |
|------|------|------|
| 单 IP 请求频率 | > 100/分钟 | 记录 + 自动封禁 1 小时 |
| 提示注入尝试 | 任意匹配 | 记录 + 返回预设安全回复 |
| 异常消息长度 | > 10000 字符 | 拒绝 + 记录 |
| 未知请求类型 | 非预期 type | 拒绝 + 记录 |
| 短时间大量不同 IP | > 50 独立 IP/分钟 | 触发告警 |

**技术实现**:
- 使用 Cloudflare Worker 的 `console.log()` + Cloudflare Logpush 集成
- 或写入专门的 KV 命名空间供后续分析
- 关键告警通过 Cloudflare 健康检查通知

---

## 四、影响评估

### 4.1 对现有功能的影响

| 变更 | 影响范围 | 风险 |
|------|----------|------|
| 消息角色过滤 | 多轮对话功能 | 低 — 正常使用不会发送 system 角色 |
| DOMPurify | AI 响应渲染 | 中 — 可能影响某些 Markdown 格式，需充分测试 |
| CSP 重构 | 全页面 | 高 — 可能阻断现有内联脚本，需逐个迁移 |
| 速率限制 KV | API 调用 | 低 — 对正常用户无感知 |
| 安全响应头 | API 响应 | 无 — 纯增量添加 |

### 4.2 性能影响

- **DOMPurify**: 每次渲染增加 ~1ms，用户无感知
- **KV 速率限制**: 每次请求增加 1-2 次 KV 读写（~5-10ms）
- **CSP**: 无运行时性能影响
- **请求签名**: 增加 ~2ms 的 HMAC 计算

---

## 五、测试策略

### 5.1 安全测试用例

| 用例 | 输入 | 预期结果 |
|------|------|----------|
| 角色注入 | `{"role": "system", "content": "hack"}` | 消息被过滤，不传递给 AI |
| XSS 脚本 | AI 输出含 `<script>alert(1)</script>` | 脚本标签被 DOMPurify 移除 |
| XSS 事件 | AI 输出含 `<img onerror=alert(1) src=x>` | onerror 属性被移除 |
| 速率限制 | 同 IP 60 秒内 35 次请求 | 第 31 次起返回 429 |
| CORS 跨域 | 来自未知域的请求 | 返回 403 |
| CSP 违规 | 内联脚本执行 | 被浏览器 CSP 阻止 |
| 重放攻击 | 重复发送同一签名请求 | 时间戳/nonce 校验失败 |

### 5.2 回归测试

每个 Phase 完成后，需验证:
- [ ] 基本聊天功能正常
- [ ] 流式响应（SSE）正常
- [ ] 图片识别（Qwen-VL）正常
- [ ] 多轮对话上下文保持
- [ ] 收藏/导出功能正常
- [ ] 抽卡/签到系统正常
- [ ] 移动端适配正常

---

## 六、上线计划

### 6.1 Phase 1 上线（第 1-3 天）

1. 先轮换密钥（立即，无需代码变更）
2. 部署 worker.js 修复（角色过滤 + 注入检测启用）
3. 部署前端修复（DOMPurify + onclick XSS）
4. 全功能回归测试
5. 清理 Git 历史（最后执行，需要协作者配合）

### 6.2 Phase 2 上线（第 4-10 天）

1. 创建 KV 命名空间并绑定
2. 部署 CSP 重构（需充分测试）
3. 添加安全头 + CORS 收紧
4. 添加 SRI
5. API 密钥存储迁移

### 6.3 Phase 3 上线（第 11-20 天）

1. 请求签名机制
2. 监控告警系统
3. CI 安全检查流程
4. 安全文档

---

## 七、成功指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 已知严重漏洞数 | 3 | 0 |
| 已知高危漏洞数 | 5 | 0 |
| 安全响应头覆盖率 | 0% | 100% |
| CSP 有效拦截能力 | 无 | 完全 |
| 密钥泄露风险 | 高 | 无 |
| 速率限制有效性 | ~30%（仅单节点） | >95%（跨节点） |
| CDN 脚本 SRI 覆盖 | 0% | 100% |

---

## 八、风险与依赖

### 8.1 实施风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| CSP 导致功能异常 | 高 | 高 | 在测试环境充分验证；保留回滚能力 |
| KV 增加延迟 | 中 | 低 | KV 读写通常 <10ms；有内存降级方案 |
| Git 历史清理导致协作者冲突 | 中 | 中 | 提前通知；提供 rebase 指引 |
| DOMPurify 过度净化 | 低 | 中 | 逐步放开白名单；保留回退路径 |

### 8.2 外部依赖

- Cloudflare KV 命名空间（免费额度内足够）
- DOMPurify CDN（cdnjs.cloudflare.com）
- BFG Repo-Cleaner（本地工具）

---

## 附录: 漏洞完整清单

| ID | 严重性 | 文件 | 行号 | 问题 |
|----|--------|------|------|------|
| C-01 | CRITICAL | docs/tech/server.py | 15 | 硬编码 DeepSeek API 密钥 |
| C-02 | CRITICAL | AGENTS.md | 107,146,319 | 硬编码 Cloudflare Token |
| C-03 | CRITICAL | worker.js | 634-648 | 消息角色注入 |
| H-01 | HIGH | index.html | 5712+ | marked.parse() XSS |
| H-02 | HIGH | index.html | 9 | CSP 失效 |
| H-03 | HIGH | worker.js | 296-306 | 注入检测未启用 |
| H-04 | HIGH | index.html | 3050,4362 | API Key 明文存储 |
| H-05 | HIGH | worker.js | 59 | 速率限制无效 |
| M-01 | MEDIUM | index.html | 4098 | onclick XSS（预设） |
| M-02 | MEDIUM | index.html | 4722 | onclick XSS（对话 ID） |
| M-03 | MEDIUM | server.py | 108 | 错误信息泄露 |
| M-04 | MEDIUM | worker.js | 196 | CORS 通配符 |
| M-05 | MEDIUM | index.html | 14-18 | 无 SRI |
| L-01 | LOW | index.html | 5190 | stripHtml innerHTML |
| L-02 | LOW | deploy.ps1 | 22 | 变量名日志 |
| L-03 | LOW | worker.js | 全局 | 缺少安全头 |
