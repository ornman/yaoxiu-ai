/**
 * 小瑶刺绣AI - 本地上下文管理系统
 * 
 * 【数据存储说明】
 * - 所有对话数据存储在浏览器本地（IndexedDB/LocalStorage）
 * - 数据不会上传到任何服务器，完全本地离线可用
 * - 清除浏览器缓存会导致数据丢失，重要对话请定期导出备份
 * 
 * 功能：
 * 1. 构建完整的对话上下文（包含历史消息）
 * 2. 智能截断策略（防止token超限）
 * 3. 上下文摘要生成
 * 4. 本地持久化存储（localforage + IndexedDB）
 * 5. 多会话管理
 * 6. 数据导出/导入（JSON格式）
 */

const CONTEXT_CONFIG = {
    // 最大上下文消息数（不包括system prompt）
    MAX_CONTEXT_MESSAGES: 20,
    // 单条消息最大长度（字符）
    MAX_MESSAGE_LENGTH: 2000,
    // 上下文总长度限制（字符）
    MAX_TOTAL_LENGTH: 8000,
    // 保留的最近消息数（截断时始终保留）
    PRESERVE_RECENT: 4,
    // 需要摘要的阈值
    SUMMARY_THRESHOLD: 10
};

/**
 * 上下文管理器类
 */
class ContextManager {
    constructor(conversationId = null) {
        this.conversationId = conversationId || this.generateId();
        this.messages = []; // 当前会话的所有消息
        this.metadata = {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            title: '',
            preview: '',
            messageCount: 0,
            totalTokens: 0
        };
        this.summary = ''; // 对话摘要
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 添加消息到上下文
     * @param {string} role - 'user' | 'assistant' | 'system'
     * @param {string} content - 消息内容
     * @param {Object} extra - 额外数据（如图片、时间戳等）
     */
    addMessage(role, content, extra = {}) {
        const message = {
            id: this.generateId(),
            role,
            content: this.truncateContent(content),
            timestamp: Date.now(),
            ...extra
        };

        this.messages.push(message);
        this.metadata.updatedAt = Date.now();
        this.metadata.messageCount = this.messages.length;
        
        // 更新预览文本
        if (role === 'user' && !this.metadata.title) {
            this.metadata.title = this.generateTitle(content);
        }
        this.metadata.preview = this.generatePreview(content);

        return message;
    }

    /**
     * 截断过长的内容
     */
    truncateContent(content) {
        if (!content || content.length <= CONTEXT_CONFIG.MAX_MESSAGE_LENGTH) {
            return content;
        }
        return content.substring(0, CONTEXT_CONFIG.MAX_MESSAGE_LENGTH) + '...(内容已截断)';
    }

    /**
     * 生成对话标题
     */
    generateTitle(content) {
        // 取前20个字符，去掉特殊符号
        let title = content.replace(/[\n\r]/g, ' ').trim();
        if (title.length > 20) {
            title = title.substring(0, 20) + '...';
        }
        return title || '新对话';
    }

    /**
     * 生成预览文本
     */
    generatePreview(content) {
        let preview = content.replace(/[\n\r]/g, ' ').trim();
        if (preview.length > 50) {
            preview = preview.substring(0, 50) + '...';
        }
        return preview;
    }

    /**
     * 构建发送给AI的上下文
     * @param {string} systemPrompt - 系统提示词
     * @param {Object} options - 构建选项
     * @returns {Array} - messages 数组
     */
    buildContext(systemPrompt, options = {}) {
        const { 
            strategy = 'sliding-window', // 'sliding-window' | 'summary' | 'full'
            includeImages = false 
        } = options;

        // 始终包含system prompt
        const context = [{
            role: 'system',
            content: systemPrompt
        }];

        // 根据策略选择历史消息
        let historyMessages = [];

        switch (strategy) {
            case 'full':
                historyMessages = this.getAllMessages();
                break;
            case 'summary':
                historyMessages = this.getSummarizedContext();
                break;
            case 'sliding-window':
            default:
                historyMessages = this.getSlidingWindowContext();
                break;
        }

        // 检查总长度并必要时截断
        historyMessages = this.enforceLengthLimit(historyMessages);

        // 添加历史消息（过滤图片如果需要）
        historyMessages.forEach(msg => {
            const formattedMsg = {
                role: msg.role,
                content: msg.content
            };
            
            // 如果需要包含图片且有图片数据
            if (includeImages && msg.images && msg.images.length > 0) {
                // 图片在Qwen-VL模式下通过其他方式处理
                formattedMsg.images = msg.images;
            }

            context.push(formattedMsg);
        });

        return context;
    }

    /**
     * 获取所有消息（用于导出）
     */
    getAllMessages() {
        return this.messages.filter(m => m.role !== 'system');
    }

    /**
     * 滑动窗口策略：保留最近N条消息
     */
    getSlidingWindowContext() {
        const nonSystemMessages = this.messages.filter(m => m.role !== 'system');
        
        if (nonSystemMessages.length <= CONTEXT_CONFIG.MAX_CONTEXT_MESSAGES) {
            return nonSystemMessages;
        }

        // 保留最近的消息
        return nonSystemMessages.slice(-CONTEXT_CONFIG.MAX_CONTEXT_MESSAGES);
    }

    /**
     * 摘要策略：早期消息生成摘要，保留近期完整消息
     */
    getSummarizedContext() {
        const nonSystemMessages = this.messages.filter(m => m.role !== 'system');
        
        if (nonSystemMessages.length <= CONTEXT_CONFIG.SUMMARY_THRESHOLD) {
            return nonSystemMessages;
        }

        // 分成两部分：早期消息和近期消息
        const earlyMessages = nonSystemMessages.slice(0, -CONTEXT_CONFIG.PRESERVE_RECENT);
        const recentMessages = nonSystemMessages.slice(-CONTEXT_CONFIG.PRESERVE_RECENT);

        // 生成早期消息的摘要（简化版，实际可以调用AI生成）
        const summary = this.generateSimpleSummary(earlyMessages);

        // 返回：摘要 + 近期完整消息
        const result = [];
        if (summary) {
            result.push({
                role: 'system',
                content: `[对话摘要] ${summary}`,
                isSummary: true
            });
        }
        result.push(...recentMessages);

        return result;
    }

    /**
     * 生成简单摘要（本地规则生成，不调用API）
     */
    generateSimpleSummary(messages) {
        if (messages.length === 0) return '';

        // 提取关键信息
        const topics = new Set();
        const userQuestions = messages
            .filter(m => m.role === 'user')
            .map(m => m.content.substring(0, 30));

        // 检测讨论主题
        messages.forEach(m => {
            const content = m.content.toLowerCase();
            if (content.includes('八角花')) topics.add('八角花纹样');
            if (content.includes('挑花') || content.includes('针法')) topics.add('挑花针法');
            if (content.includes('配色') || content.includes('颜色')) topics.add('配色方案');
            if (content.includes('盘瑶') || content.includes('布努瑶')) topics.add('瑶族支系');
            if (content.includes('历史') || content.includes('传承')) topics.add('历史传承');
        });

        let summary = '';
        if (topics.size > 0) {
            summary += `讨论了：${Array.from(topics).join('、')}。`;
        }
        if (userQuestions.length > 0) {
            summary += `用户之前询问了：${userQuestions.slice(-2).join('；')}。`;
        }

        return summary || `之前共有 ${messages.length} 轮对话`;
    }

    /**
     * 强制执行长度限制
     */
    enforceLengthLimit(messages) {
        let totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

        if (totalLength <= CONTEXT_CONFIG.MAX_TOTAL_LENGTH) {
            return messages;
        }

        // 从最早的消息开始截断
        const result = [...messages];
        while (totalLength > CONTEXT_CONFIG.MAX_TOTAL_LENGTH && result.length > CONTEXT_CONFIG.PRESERVE_RECENT) {
            const removed = result.shift();
            totalLength -= (removed.content?.length || 0);
        }

        return result;
    }

    /**
     * 清空上下文
     */
    clear() {
        this.messages = [];
        this.summary = '';
        this.metadata = {
            ...this.metadata,
            updatedAt: Date.now(),
            messageCount: 0,
            totalTokens: 0
        };
    }

    /**
     * 导出会话数据
     */
    export() {
        return {
            conversationId: this.conversationId,
            messages: this.messages,
            metadata: this.metadata,
            summary: this.summary,
            exportedAt: Date.now()
        };
    }

    /**
     * 导入会话数据
     */
    import(data) {
        if (data.conversationId) this.conversationId = data.conversationId;
        if (data.messages) this.messages = data.messages;
        if (data.metadata) this.metadata = { ...this.metadata, ...data.metadata };
        if (data.summary) this.summary = data.summary;
    }
}

/**
 * 上下文存储管理器（localforage封装）
 */
class ContextStorage {
    constructor() {
        this.DB_NAME = 'YaoEmbroideryAI';
        this.CONVERSATION_PREFIX = 'conv_';
        this.METADATA_KEY = 'conversations_metadata';
    }

    /**
     * 保存会话
     */
    async saveConversation(contextManager) {
        const data = contextManager.export();
        const key = this.CONVERSATION_PREFIX + contextManager.conversationId;
        
        await localforage.setItem(key, data);
        await this.updateMetadata(contextManager.conversationId, {
            id: contextManager.conversationId,
            title: contextManager.metadata.title,
            preview: contextManager.metadata.preview,
            updatedAt: contextManager.metadata.updatedAt,
            messageCount: contextManager.metadata.messageCount
        });

        return true;
    }

    /**
     * 加载会话
     */
    async loadConversation(conversationId) {
        const key = this.CONVERSATION_PREFIX + conversationId;
        const data = await localforage.getItem(key);
        
        if (!data) return null;

        const contextManager = new ContextManager(conversationId);
        contextManager.import(data);
        return contextManager;
    }

    /**
     * 获取所有会话列表
     */
    async getAllConversations() {
        const metadata = await localforage.getItem(this.METADATA_KEY) || {};
        return Object.values(metadata).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * 删除会话
     */
    async deleteConversation(conversationId) {
        const key = this.CONVERSATION_PREFIX + conversationId;
        await localforage.removeItem(key);
        
        const metadata = await localforage.getItem(this.METADATA_KEY) || {};
        delete metadata[conversationId];
        await localforage.setItem(this.METADATA_KEY, metadata);
        
        return true;
    }

    /**
     * 更新元数据
     */
    async updateMetadata(conversationId, info) {
        const metadata = await localforage.getItem(this.METADATA_KEY) || {};
        metadata[conversationId] = info;
        await localforage.setItem(this.METADATA_KEY, metadata);
    }

    /**
     * 搜索会话
     */
    async searchConversations(keyword) {
        const all = await this.getAllConversations();
        const lowerKeyword = keyword.toLowerCase();
        
        return all.filter(conv => 
            conv.title?.toLowerCase().includes(lowerKeyword) ||
            conv.preview?.toLowerCase().includes(lowerKeyword)
        );
    }

    /**
     * 清理旧会话（保留最近N个）
     */
    async cleanupOldConversations(keepCount = 50) {
        const all = await this.getAllConversations();
        if (all.length <= keepCount) return;

        const toDelete = all.slice(keepCount);
        for (const conv of toDelete) {
            await this.deleteConversation(conv.id);
        }
        
        return toDelete.length;
    }

    /**
     * 导出所有数据（JSON格式，用于备份）
     * 【数据安全】导出的JSON文件包含所有本地对话数据，请妥善保管
     */
    async exportAllData() {
        const conversations = await this.getAllConversations();
        const fullData = {
            exportVersion: '1.0',
            exportedAt: new Date().toISOString(),
            exportNote: '小瑶刺绣AI - 对话数据备份',
            storageLocation: '浏览器本地 IndexedDB',
            data: []
        };

        for (const meta of conversations) {
            const fullConv = await this.loadConversation(meta.id);
            if (fullConv) {
                fullData.data.push(fullConv.export());
            }
        }

        return fullData;
    }

    /**
     * 从JSON导入数据（恢复备份）
     * 【注意】导入会合并数据，如有ID冲突则以导入数据为准
     */
    async importAllData(backupData, options = {}) {
        const { merge = true, overwrite = false } = options;
        
        if (!backupData || !backupData.data || !Array.isArray(backupData.data)) {
            throw new Error('无效的备份文件格式');
        }

        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        for (const convData of backupData.data) {
            try {
                const existing = await this.loadConversation(convData.conversationId);
                
                if (existing && !overwrite) {
                    if (merge) {
                        // 合并策略：保留消息更多的那个
                        if (convData.messages?.length > existing.messages.length) {
                            await this.saveConversation(new ContextManager().import(convData));
                            results.imported++;
                        } else {
                            results.skipped++;
                        }
                    } else {
                        results.skipped++;
                    }
                } else {
                    const newContext = new ContextManager();
                    newContext.import(convData);
                    await this.saveConversation(newContext);
                    results.imported++;
                }
            } catch (err) {
                results.errors.push({ id: convData.conversationId, error: err.message });
            }
        }

        return results;
    }

    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
        const conversations = await this.getAllConversations();
        let totalMessages = 0;
        let totalSize = 0;

        // 估算存储大小
        for (const meta of conversations) {
            const key = this.CONVERSATION_PREFIX + meta.id;
            const data = await localforage.getItem(key);
            if (data) {
                const size = JSON.stringify(data).length;
                totalSize += size;
                totalMessages += meta.messageCount || 0;
            }
        }

        return {
            conversationCount: conversations.length,
            totalMessages,
            estimatedSize: totalSize,
            estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            storageType: await this.detectStorageType()
        };
    }

    /**
     * 检测实际使用的存储类型
     */
    async detectStorageType() {
        // localforage 优先使用 IndexedDB，其次 WebSQL，最后 LocalStorage
        const driver = localforage.driver();
        const driverNames = {
            'asyncStorage': 'IndexedDB（推荐，容量大）',
            'webSQLStorage': 'WebSQL',
            'localStorageWrapper': 'LocalStorage（容量有限）'
        };
        return driverNames[driver] || driver;
    }

    /**
     * 清空所有数据（危险操作）
     */
    async clearAllData() {
        const conversations = await this.getAllConversations();
        for (const conv of conversations) {
            await this.deleteConversation(conv.id);
        }
        await localforage.removeItem(this.METADATA_KEY);
        return conversations.length;
    }
}

/**
 * 简化的上下文管理API（供主程序使用）
 */
class ChatContext {
    constructor() {
        this.storage = new ContextStorage();
        this.currentContext = null;
        this.systemPrompt = '';
    }

    /**
     * 初始化/加载会话
     */
    async init(conversationId = null, systemPrompt = '') {
        this.systemPrompt = systemPrompt;
        
        if (conversationId) {
            this.currentContext = await this.storage.loadConversation(conversationId);
        }
        
        if (!this.currentContext) {
            this.currentContext = new ContextManager(conversationId);
        }

        return this.currentContext;
    }

    /**
     * 添加用户消息
     */
    addUserMessage(content, extra = {}) {
        return this.currentContext?.addMessage('user', content, extra);
    }

    /**
     * 添加AI回复
     */
    addAssistantMessage(content, extra = {}) {
        return this.currentContext?.addMessage('assistant', content, extra);
    }

    /**
     * 获取发送给API的上下文
     */
    getMessagesForAPI(strategy = 'sliding-window') {
        if (!this.currentContext || !this.systemPrompt) {
            return [];
        }
        return this.currentContext.buildContext(this.systemPrompt, { strategy });
    }

    /**
     * 保存当前会话
     */
    async save() {
        if (this.currentContext) {
            await this.storage.saveConversation(this.currentContext);
        }
    }

    /**
     * 创建新会话
     */
    async newConversation(systemPrompt = '') {
        if (this.currentContext && this.currentContext.messages.length > 0) {
            await this.save();
        }
        
        this.systemPrompt = systemPrompt || this.systemPrompt;
        this.currentContext = new ContextManager();
        return this.currentContext.conversationId;
    }

    /**
     * 切换到指定会话
     */
    async switchConversation(conversationId) {
        await this.save();
        this.currentContext = await this.storage.loadConversation(conversationId);
        return this.currentContext;
    }

    /**
     * 获取所有会话
     */
    async getConversations() {
        return await this.storage.getAllConversations();
    }

    /**
     * 删除会话
     */
    async deleteConversation(conversationId) {
        await this.storage.deleteConversation(conversationId);
        if (this.currentContext?.conversationId === conversationId) {
            this.currentContext = null;
        }
    }

    /**
     * 清空当前会话
     */
    clear() {
        this.currentContext?.clear();
    }

    /**
     * 获取当前会话ID
     */
    getCurrentId() {
        return this.currentContext?.conversationId;
    }

    /**
     * 获取当前会话所有消息（用于UI渲染）
     */
    getAllMessages() {
        return this.currentContext?.getAllMessages() || [];
    }

    /**
     * 导出所有会话数据（备份到文件）
     */
    async exportToFile() {
        const data = await this.storage.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `小瑶刺绣AI_对话备份_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return data;
    }

    /**
     * 从文件导入数据（恢复备份）
     */
    async importFromFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const results = await this.storage.importAllData(data, options);
                    resolve(results);
                } catch (err) {
                    reject(new Error('文件解析失败：' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 获取存储统计
     */
    async getStorageStats() {
        return await this.storage.getStorageStats();
    }

    /**
     * 清空所有数据
     */
    async clearAllData() {
        return await this.storage.clearAllData();
    }
}

// 导出全局实例
window.ContextManager = ContextManager;
window.ContextStorage = ContextStorage;
window.ChatContext = ChatContext;
window.CONTEXT_CONFIG = CONTEXT_CONFIG;
