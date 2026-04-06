# 本地上下文管理系统使用说明

## 数据存储说明

**所有数据存储在浏览器本地，不会上传到任何服务器：**
- 存储位置：浏览器 IndexedDB（优先）→ WebSQL → LocalStorage
- 数据类型：对话历史、消息内容、时间戳
- 隐私保护：完全离线，无需登录，无云端同步
- 注意事项：清除浏览器缓存会导致数据丢失，请定期导出备份

## 快速集成

### 1. 引入脚本

```html
<!-- 在 index.html 中，localforage 之后引入 -->
<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>
<script src="assets/context-manager.js"></script>
```

### 2. 初始化

```javascript
// 创建全局上下文实例
const chatContext = new ChatContext();

// 初始化（加载或创建会话）
async function initChat() {
    const systemPrompt = `你是「小瑶」，瑶绣第三代传人...`;
    await chatContext.init(null, systemPrompt);
    
    // 加载历史消息到UI
    const history = chatContext.getAllMessages();
    renderHistory(history);
}
```

### 3. 发送消息时构建上下文

```javascript
async function sendMessage(userContent) {
    // 1. 添加用户消息到上下文
    chatContext.addUserMessage(userContent);
    
    // 2. 构建完整的上下文（包含历史）
    const messages = chatContext.getMessagesForAPI('sliding-window');
    // 返回格式：[{role: 'system', content: '...'}, {role: 'user', content: '...'}, ...]
    
    // 3. 发送给API
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,  // 完整的上下文！
            stream: true
        })
    });
    
    // 4. 接收AI回复并添加到上下文
    const aiContent = await streamResponse(response);
    chatContext.addAssistantMessage(aiContent);
    
    // 5. 保存到本地
    await chatContext.save();
}
```

## API 参考

### ChatContext 类

| 方法 | 说明 |
|------|------|
| `init(conversationId, systemPrompt)` | 初始化会话 |
| `addUserMessage(content, extra)` | 添加用户消息 |
| `addAssistantMessage(content, extra)` | 添加AI回复 |
| `getMessagesForAPI(strategy)` | 构建API上下文（sliding-window/summary/full）|
| `save()` | 保存当前会话 |
| `newConversation()` | 创建新会话 |
| `switchConversation(id)` | 切换会话 |
| `getConversations()` | 获取所有会话列表 |
| `deleteConversation(id)` | 删除会话 |
| `exportToFile()` | 导出所有数据到JSON文件 |
| `importFromFile(file)` | 从JSON文件导入数据 |
| `getStorageStats()` | 获取存储统计 |
| `clearAllData()` | 清空所有数据 |

### 上下文策略

#### 1. sliding-window（滑动窗口）
```javascript
// 默认策略，保留最近N条消息
const messages = chatContext.getMessagesForAPI('sliding-window');
// 配置：CONTEXT_CONFIG.MAX_CONTEXT_MESSAGES = 20
```

#### 2. summary（摘要模式）
```javascript
// 早期消息生成摘要，保留近期完整消息
const messages = chatContext.getMessagesForAPI('summary');
// 适合长对话，节省token
```

#### 3. full（完整模式）
```javascript
// 发送所有历史消息
const messages = chatContext.getMessagesForAPI('full');
// 注意：可能超出token限制
```

## 数据备份与恢复

### 导出备份
```javascript
// 点击"导出备份"按钮时
async function backup() {
    await chatContext.exportToFile();
    // 自动下载：小瑶刺绣AI_对话备份_2026-04-05.json
}
```

### 导入恢复
```javascript
// 选择备份文件后
async function restore(file) {
    const results = await chatContext.importFromFile(file, {
        merge: true,      // 合并重复会话
        overwrite: false  // 不覆盖已有数据
    });
    console.log(`导入完成：${results.imported}个会话，跳过${results.skipped}个`);
}
```

### 查看存储统计
```javascript
async function showStats() {
    const stats = await chatContext.getStorageStats();
    console.log(`
        会话数：${stats.conversationCount}
        总消息：${stats.totalMessages}
        占用空间：${stats.estimatedSizeMB}
        存储类型：${stats.storageType}
    `);
}
```

## 配置参数

```javascript
// 可在引入脚本后修改配置
CONTEXT_CONFIG.MAX_CONTEXT_MESSAGES = 20;  // 最大上下文消息数
CONTEXT_CONFIG.MAX_MESSAGE_LENGTH = 2000;   // 单条消息最大长度
CONTEXT_CONFIG.MAX_TOTAL_LENGTH = 8000;     // 上下文总长度限制
CONTEXT_CONFIG.PRESERVE_RECENT = 4;         // 截断时保留的最近消息数
```

## 与现有代码的对比

### 修改前（无上下文）
```javascript
// 只发送当前消息
body: JSON.stringify({
    model: model,
    messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }  // 只有当前消息！
    ]
})
```

### 修改后（带上下文）
```javascript
// 发送完整对话历史
const messages = chatContext.getMessagesForAPI('sliding-window');
body: JSON.stringify({
    model: model,
    messages: messages  // 包含历史消息！
})
```

## 注意事项

1. **Token限制**：上下文太长会导致API调用失败，建议使用 `sliding-window` 策略
2. **隐私安全**：数据完全本地存储，但导出文件请妥善保管
3. **浏览器限制**：LocalStorage 约5MB限制，IndexedDB 容量较大（取决于磁盘空间）
4. **数据迁移**：导出/导入功能支持在不同设备间迁移数据
