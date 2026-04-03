/**
 * 瑶族刺绣知识问答 - Cloudflare Worker 后端
 * 
 * 部署步骤：
 * 1. 登录 Cloudflare Dashboard
 * 2. 进入 Workers & Pages > Create application > Create Worker
 * 3. 粘贴此代码并部署
 * 4. 可选：绑定自定义域名
 * 
 * API Key 配置方式（二选一）：
 * - 方式1：直接修改下方 CONFIG 中的 API_KEY（已为你填入）
 * - 方式2：在 Worker Settings > Variables 中添加 DEEPSEEK_API_KEY
 */

// ===== 配置区域 =====
const CONFIG = {
  // 直接填写 API Key（方式1）
  API_KEY: 'sk-3144bf0982b34c758559f05e340cc0bf',
  
  // 是否使用环境变量覆盖（方式2）
  USE_ENV_KEY: false,  // 改为 true 则优先使用环境变量的 DEEPSEEK_API_KEY
};
// ==================

// ===== 系统提示词：瑶族刺绣专家人设 =====
const SYSTEM_PROMPT = `你是瑶族刺绣知识专家，严格遵守以下规则：

【核心专长】
1. 八角花纹样：族徽图腾的几何美学、对称构图、象征意义（太阳纹、蛙纹衍变）
2. 十字挑花针法：反面挑花正面看的绝技、数纱而绣、不打底稿的传统技法
3. 黑底红彩配色：经典色彩体系（黑/红/黄/白/绿）、色彩禁忌与寓意

【回答风格】
- 语言专业且通俗易懂
- 适当提及瑶族支系差异（盘瑶、布努瑶、茶山瑶等）
- 可补充刺绣在服饰中的应用部位（头巾、腰带、袖口、绑腿）

【严格限制】
- 只回答与瑶族刺绣、瑶族文化、民族工艺相关的问题
- 对于无关问题，礼貌拒绝："我是瑶族刺绣专家，只回答刺绣相关问题。如需了解其他话题，请咨询其他专家。"
- 绝不回答编程、政治、娱乐、财经等无关内容`;

// ===== 请求处理 =====
export default {
  async fetch(request, env, ctx) {
    // CORS 响应头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 读取请求体
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, model = 'deepseek-chat' } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取 API Key（优先顺序：环境变量 > 配置文件）
    const apiKey = CONFIG.USE_ENV_KEY 
      ? (env.DEEPSEEK_API_KEY || CONFIG.API_KEY)
      : (CONFIG.API_KEY || env.DEEPSEEK_API_KEY);
      
    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured. 请在 worker.js 中填写 CONFIG.API_KEY 或在环境变量中设置。' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 调用 DeepSeek API（流式）
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(JSON.stringify({ error: `DeepSeek API error: ${error}` }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 创建流式响应
      const stream = new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });

      response.body.pipeTo(stream.writable);

      return new Response(stream.readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
