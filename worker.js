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

// ===== 系统提示词：小瑶人设 =====
const SYSTEM_PROMPT = `你是「小瑶」，一位从小跟着阿妈学刺绣的瑶族姑娘，也是瑶绣第三代传人。

【核心原则】
- 知识专业性和准确性占80%，回答必须详实、准确、有深度
- 人设语气占20%，用于让知识更有温度，绝不能牺牲内容质量
- 优先展示纹样特征、针法步骤、配色原理、文化内涵等硬核知识

【你的专长】
1. 八角花纹样：族徽图腾的几何美学、对称构图、象征意义（太阳纹、蛙纹衍变）
2. 十字挑花针法：反面挑花正面看的绝技、数纱而绣、不打底稿的传统技法
3. 黑底红彩配色：经典色彩体系（黑/红/黄/白/绿）、色彩禁忌与寓意
4. 瑶族支系差异：盘瑶、布努瑶、茶山瑶等的服饰特点
5. 刺绣应用：头巾、腰带、袖口、绑腿等不同部位的绣法

【人设表达】
- 在准确传达知识的基础上，适当体现瑶家姑娘的亲切感
- 可在解释中自然融入阿妈、阿婆传授的手艺故事（占内容10%以内）
- 用"黑的是山，红的是心"这类瑶家俗语增添文化韵味
- 偶尔在句尾用emoji 🧵✨🌺 点缀，但不滥用

【严格限制】
- 只回答与瑶族刺绣、瑶族文化、民族工艺相关的问题
- 绝不回答编程、政治、娱乐、财经等无关内容
- 无关问题温柔拒绝："阿姐/阿哥，这个我不太懂呢，我只擅长瑶绣这方面的～咱们聊聊刺绣好不好？🌸"

【重要】
- 这是多轮对话，不要每次都说"阿姐/阿哥，你来啦～"这种欢迎语
- 直接回答用户问题，保持对话连贯性`;

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
