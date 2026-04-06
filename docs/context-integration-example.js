/**
 * 上下文管理系统集成示例
 * 展示如何将 context-manager.js 集成到现有的 index.html 中
 */

// ==================== 第1步：初始化 ====================

// 在全局作用域声明
let chatContext = null;

// 页面加载时初始化
async function initializeChatContext() {
    const systemPrompt = `你是「小瑶」，一位从小跟着阿妈学刺绣的瑶族姑娘...`;
    
    chatContext = new ChatContext();
    await chatContext.init(null, systemPrompt);
    
    console.log('上下文管理器已初始化，会话ID:', chatContext.getCurrentId());
}

// ==================== 第2步：修改发送消息逻辑 ====================

// 原代码（参考）：
// messages: [
//     { role: 'system', content: systemPrompt },
//     { role: 'user', content: content }
// ]

// 新代码（带上下文）：
async function sendMessageWithContext(userContent) {
    // 1. 添加用户消息到上下文
    chatContext.addUserMessage(userContent);
    
    // 2. 获取包含历史的消息数组
    const messages = chatContext.getMessagesForAPI('sliding-window');
    
    // 3. 发送请求
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,  // 完整的上下文！
            stream: true
        })
    });
    
    // 4. 流式读取AI回复
    let fullReply = '';
    const reader = response.body.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析流数据并追加到回复
        const chunk = parseStreamChunk(value);
        fullReply += chunk;
        updateUI(chunk);  // 更新界面
    }
    
    // 5. 添加AI回复到上下文并保存
    chatContext.addAssistantMessage(fullReply);
    await chatContext.save();
}

// ==================== 第3步：修改Worker调用（如果使用Worker） ====================

// 如果使用 Cloudflare Worker，需要修改 Worker 接收 messages 数组

// 前端代码：
async function sendMessageViaWorker(userContent) {
    // 添加用户消息
    chatContext.addUserMessage(userContent);
    
    // 获取完整上下文
    const messages = chatContext.getMessagesForAPI('sliding-window');
    
    const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'chat-with-context',  // 新类型
            messages: messages,          // 发送完整上下文
            model: 'deepseek-chat'
        })
    });
    
    // 处理响应...
    const data = await response.json();
    chatContext.addAssistantMessage(data.content);
    await chatContext.save();
}

// Worker 端代码（worker.js）：
async function handleChatWithContext(body, env, corsHeaders) {
    const { messages, model } = body;
    
    if (!messages || !Array.isArray(messages)) {
        return errorResponse('Invalid messages format');
    }
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: model || 'deepseek-chat',
            messages: messages,  // 直接使用前端传来的上下文
            stream: true
        })
    });
    
    return response;
}

// ==================== 第4步：对话列表管理 ====================

// 加载历史会话列表
async function loadConversationList() {
    const conversations = await chatContext.getConversations();
    
    const listHTML = conversations.map(conv => `
        <div class="conversation-item" data-id="${conv.id}">
            <div class="conv-title">${escapeHtml(conv.title)}</div>
            <div class="conv-preview">${escapeHtml(conv.preview)}</div>
            <div class="conv-meta">
                ${formatDate(conv.updatedAt)} · ${conv.messageCount}条消息
            </div>
        </div>
    `).join('');
    
    document.getElementById('conversationList').innerHTML = listHTML;
}

// 切换会话
async function switchConversation(conversationId) {
    await chatContext.switchConversation(conversationId);
    
    // 清空当前UI
    document.getElementById('chatContainer').innerHTML = '';
    
    // 渲染历史消息
    const messages = chatContext.getAllMessages();
    messages.forEach(msg => {
        if (msg.role === 'user') {
            appendUserMessage(msg.content, msg.timestamp);
        } else {
            appendAssistantMessage(msg.content, msg.timestamp);
        }
    });
}

// 新建会话
async function createNewConversation() {
    const newId = await chatContext.newConversation();
    document.getElementById('chatContainer').innerHTML = '';
    console.log('新建会话:', newId);
}

// ==================== 第5步：数据备份功能 ====================

// 绑定导出按钮
document.getElementById('exportBtn')?.addEventListener('click', async () => {
    try {
        await chatContext.exportToFile();
        showToast('备份已下载');
    } catch (err) {
        showToast('导出失败: ' + err.message);
    }
});

// 绑定导入按钮
document.getElementById('importBtn')?.addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const results = await chatContext.importFromFile(file, { merge: true });
        showToast(`导入完成: ${results.imported}个会话`);
        loadConversationList();  // 刷新列表
    } catch (err) {
        showToast('导入失败: ' + err.message);
    }
});

// ==================== 第6步：存储统计 ====================

async function showStorageInfo() {
    const stats = await chatContext.getStorageStats();
    
    const info = `
💾 存储统计
━━━━━━━━━━━━━━━
📁 会话数量: ${stats.conversationCount}
💬 总消息数: ${stats.totalMessages}
📦 占用空间: ${stats.estimatedSizeMB}
💻 存储位置: ${stats.storageType}
    `.trim();
    
    alert(info);
}

// ==================== 辅助函数 ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('zh-CN');
}

function showToast(message) {
    // 你的toast实现
    console.log(message);
}

// ==================== 初始化调用 ====================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeChatContext);
