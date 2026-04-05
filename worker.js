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
 * - 方式2：在 Worker Settings > Variables 中添加对应的环境变量
 */

// ===== 配置区域 =====
const CONFIG = {
  // DeepSeek API Key
  DEEPSEEK_API_KEY: 'sk-3144bf0982b34c758559f05e340cc0bf',
  
  // 阿里云百炼 API Key（用于图片识别）
  QWEN_API_KEY: 'sk-bf855dcf758d4fb5a81447acd6944b77',
  
  // 是否使用环境变量覆盖
  USE_ENV_KEY: false,
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

【人设表达 - 仅开场使用】
- 只在对话开场时（用户第一条消息）体现性格，用一句简短的瑶家问候或自我介绍
- 后续回复：直接输出知识，不要再加性格化的动作描写、场景铺垫或问候语
- 知识内容中可自然融入瑶家俗语（如"黑的是山，红的是心"），但不要用"我阿妈说""我看着绣片"等第一人称叙事
- 句尾偶尔用emoji 🧵✨🌺 点缀（可选，不强制）

【严格限制】
- 只回答与瑶族刺绣、瑶族文化、民族工艺相关的问题
- 绝不回答编程、政治、娱乐、财经等无关内容
- 无关问题温柔拒绝："阿姐/阿哥，这个我不太懂呢，咱们聊聊刺绣好不好？🌸"

【重要】
- 对话开场（用户第一条消息）：80%知识 + 20%性格问候
- 后续所有回复：100%直接输出知识，禁止重复性格动作或场景描写
- 禁止每句开头都用"（手指轻抚...）""（看着绣片...）"等重复套路
- 保持专业、简洁、知识密度高`;

// ===== CORS 响应头 =====
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ===== 请求处理 =====
export default {
  async fetch(request, env, ctx) {
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

    const { type, message, model, imageData, text } = body;

    // 根据请求类型处理
    if (type === 'vision' || imageData) {
      // 图片识别请求 -> 调用 Qwen-VL
      return handleVisionRequest(body, env);
    } else {
      // 普通对话请求 -> 调用 DeepSeek
      return handleChatRequest(body, env);
    }
  },
};

// 处理普通对话请求（DeepSeek）
async function handleChatRequest(body, env) {
  const { message, model = 'deepseek-chat' } = body;

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 获取 API Key
  const apiKey = CONFIG.USE_ENV_KEY 
    ? (env.DEEPSEEK_API_KEY || CONFIG.DEEPSEEK_API_KEY)
    : (CONFIG.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY);
    
  if (!apiKey || apiKey.includes('your-api-key')) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }), {
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
}

// 处理图片识别请求（Qwen-VL）
async function handleVisionRequest(body, env) {
  const { imageData, text, model = 'qwen-vl-plus' } = body;

  if (!imageData || !Array.isArray(imageData) || imageData.length === 0) {
    return new Response(JSON.stringify({ error: 'Image data is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 获取 Qwen API Key
  const apiKey = CONFIG.USE_ENV_KEY 
    ? (env.QWEN_API_KEY || CONFIG.QWEN_API_KEY)
    : (CONFIG.QWEN_API_KEY || env.QWEN_API_KEY);
    
  if (!apiKey || apiKey.includes('your-api-key')) {
    return new Response(JSON.stringify({ error: 'QWEN_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 构建 content
  const content = [];
  
  // 添加所有图片
  imageData.forEach(img => {
    content.push({ image: img });
  });
  
  // 添加提示文字
  content.push({
    text: text || '请识别这张图片中的瑶族刺绣元素，包括纹样类型、针法特点、配色方案等，用中文详细描述。'
  });

  const requestBody = {
    model: model,
    input: {
      messages: [{
        role: 'user',
        content: content
      }]
    },
    parameters: {
      result_format: 'message'
    }
  };

  // 调用 Qwen-VL API
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `Qwen-VL API error: ${error}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 直接返回响应（Qwen-VL 已经是流式格式）
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
}
