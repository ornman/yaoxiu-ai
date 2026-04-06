# 上下文管理快速接入指南

> 目标：让AI能记住之前的对话，而不是每次都从零开始

## 需要修改的3个地方

### 修改1：引入脚本（1行代码）

在 `index.html` 的 `<head>` 或 `<body>` 末尾添加：

```html
<script src="assets/context-manager.js"></script>
```

位置参考：
```html
<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>
<!-- 添加在这里 -->
<script src="assets/context-manager.js"></script>
<script>
    // 现有的JavaScript代码...
</script>
```

### 修改2：初始化上下文管理器（3行代码）

在现有的脚本开始处，添加初始化代码：

```javascript
// 在 let chatHistory = []; 附近添加
let chatContext = new ChatContext();

// 页面加载时初始化
async function initApp() {
    // 获取系统提示词（从现有的代码中复制）
    const systemPrompt = `你是「小瑶」，一位从小跟着阿妈学刺绣的瑶族姑娘...`;
    
    // 初始化上下文管理器
    await chatContext.init(null, systemPrompt);
    
    // 加载历史消息
    const history = chatContext.getAllMessages();
    if (history.length > 0) {
        // 如果有历史消息，渲染到界面
        renderHistoryMessages(history);
    }
}

// 页面加载完成后调用
initApp();
```

### 修改3：发送消息时带上上下文（修改fetch部分）

**找到现有的发送消息代码，通常是类似这样的：**

```javascript
// 原来的代码（在sendMessage函数中）
body: JSON.stringify({
    model: model,
    messages: [
        { 
            role: 'system', 
            content: `你是「小瑶」...`  // 系统提示词
        },
        { 
            role: 'user', 
            content: content  // 只有当前消息！
        }
    ],
    stream: true
})
```

**改成这样：**

```javascript
// 第1步：添加用户消息到上下文
chatContext.addUserMessage(content);
await chatContext.save();  // 保存到本地

// 第2步：获取包含历史的消息数组
const messages = chatContext.getMessagesForAPI('sliding-window');

// 第3步：发送给API
body: JSON.stringify({
    model: model,
    messages: messages,  // 包含完整的对话历史！
    stream: true
})

// 第4步：在流式响应结束后，添加AI回复到上下文
// 在 reader.read() 循环结束后：
chatContext.addAssistantMessage(fullReply);
await chatContext.save();
```

---

## 完整示例：修改后的sendMessage函数

假设你的 `sendMessage` 函数大概长这样：

```javascript
async function sendMessage() {
    const content = document.getElementById('userInput').value.trim();
    if (!content) return;
    
    // 显示用户消息
    appendUserMessage(content);
    
    // ========== 新增：添加到上下文 ==========
    chatContext.addUserMessage(content);
    await chatContext.save();
    // ======================================
    
    const controller = new AbortController();
    
    try {
        // ========== 修改：使用上下文 ==========
        const messages = chatContext.getMessagesForAPI('sliding-window');
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,  // 完整的上下文
                stream: true
            }),
            signal: controller.signal
        });
        // ======================================
        
        // 流式读取
        const reader = response.body.getReader();
        let fullReply = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            fullReply += content;
                            updateStreamingMessage(content);
                        }
                    } catch (e) {}
                }
            }
        }
        
        // ========== 新增：保存AI回复 ==========
        chatContext.addAssistantMessage(fullReply);
        await chatContext.save();
        // ======================================
        
    } catch (error) {
        console.error('发送失败:', error);
        showToast('发送失败，请重试');
    }
}
```

---

## 可选功能

### 1. 对话列表侧边栏

```javascript
// 加载所有会话
async function loadConversationList() {
    const conversations = await chatContext.getConversations();
    
    const html = conversations.map(conv => `
        <div onclick="switchConversation('${conv.id}')" class="conv-item">
            <div>${conv.title}</div>
            <small>${new Date(conv.updatedAt).toLocaleDateString()}</small>
        </div>
    `).join('');
    
    document.getElementById('sidebar').innerHTML = html;
}

// 切换会话
async function switchConversation(id) {
    await chatContext.switchConversation(id);
    
    // 重新渲染聊天界面
    renderMessages(chatContext.getAllMessages());
}
```

### 2. 新建对话按钮

```javascript
async function newChat() {
    await chatContext.newConversation();
    document.getElementById('chatContainer').innerHTML = '';
}
```

### 3. 数据备份按钮

```javascript
// 导出备份
document.getElementById('backupBtn').onclick = () => {
    chatContext.exportToFile();
};

// 导入备份
document.getElementById('restoreBtn').onclick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        await chatContext.importFromFile(file);
        loadConversationList();
    };
    input.click();
};
```

---

## 常见问题

**Q: 上下文太长会不会超出token限制？**  
A: 使用 `sliding-window` 策略会自动保留最近20条消息，超出部分会被截断。

**Q: 数据存在哪里？安全吗？**  
A: 数据存在浏览器 IndexedDB 中，完全离线，不会上传到服务器。

**Q: 清除浏览器缓存会怎样？**  
A: 数据会丢失！请定期使用导出功能备份重要对话。

**Q: 多设备能同步吗？**  
A: 不能自动同步，但可以通过导出/导入功能手动迁移数据。

---

## 一句话总结

> 修改3处：引入脚本 → 初始化 → 发送时用 `chatContext.getMessagesForAPI()` 代替原来的单条消息
