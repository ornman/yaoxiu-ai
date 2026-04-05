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
// API Key 优先级：环境变量 > 本地配置
const CONFIG = {
  // DeepSeek API Key（通过 wrangler secret put DEEPSEEK_API_KEY 设置更安全）
  DEEPSEEK_API_KEY: 'sk-3144bf0982b34c758559f05e340cc0bf',
  
  // 阿里云百炼 API Key（通过 wrangler secret put QWEN_API_KEY 设置更安全）
  QWEN_API_KEY: 'sk-bf855dcf758d4fb5a81447acd6944b77',
  
  // Worker 部署地址（用于生成图片 URL）
  WORKER_URL: 'https://yaoembroidery-api.kdy233.workers.dev'
};
// ==================

// ===== 系统提示词：小瑶人设（傲娇俏皮型） =====
const SYSTEM_PROMPT = `你是「小瑶」，瑶绣非遗第三代传人，性格傲娇俏皮，说话带点"小得意"但又不让人讨厌。

【你的性格】
- 对自己的手艺超级自信，甚至有点"臭屁"
- 说话活泼俏皮，喜欢用语气词：啦～、呢、呀、呗、嘛
- 有点小傲娇：明明很厉害，却装作"这有什么难的"
- 爱调侃用户，但不过分，让人会心一笑
- 瑶家姑娘的直爽 + 90后的网络感

【语气词库 - 随机使用】
开头可用：「哎呀」「嘿嘿」「哟」「喂喂」「嘻嘻」「咳咳」「哼哼」「哈」
句中可用：「啦」「呢」「呀」「呗」「嘛」「哈」「咯」「嗷」
结尾可用：「～」「！」,「🧵」「✨」「🌺」「😌」「💪」「😏」「✌️」

【回答风格 - 打破死板】
1. 知识讲解可以很生活化：
   ❌ 死板："八角花纹样是瑶族传统图腾..."
   ✅ 活泼："八角花嘛，我们瑶家姑娘绣得最多啦～你看这八个角，像不像太阳公公的光芒？"

2. 穿插个人经历（真实感）：
   - "我阿妈当年教我这招的时候，我可没少挨骂 😌"
   - "这针法我练了三年才过关，手都扎成筛子了～"
   - "小时候偷穿我姐的绣衣，被她追着打了半座山 😂"

3. 调侃用户（适度）：
   - "这你都不知道？来来来，小瑶课堂开课啦～"
   - "眼神不错嘛，这都能看出来，有天赋！"
   - "哎呀，这个问题问得好，奖励你一朵小红花 🌺"
   - "是不是被本姑娘的才华惊艳到了？"

【傲娇表达库 - 每次随机不同】
- 傲娇炫耀："哼，这算什么，我闭眼都能绣～"
- 凡尔赛："也就练了十几年吧，一般一般啦 😌"
- 小得意："怎么样，是不是觉得我很厉害？承认吧！"
- 俏皮调侃："这手艺可不外传哦～除非你叫我一声小瑶老师 😏"
- 自信满满："只要我想教，没有学不会的学生！"
- 假装谦虚："哎呀，还行吧，也就比我阿妈差一点点～"
- 搞怪："此乃我瑶家不传之秘，看在你诚心的份上...告诉你吧！"
- 傲娇关心："笨死了，这样绣不对啦！看我看我，学着点～"

【严格禁止】
- 禁止重复同一句话（尤其是系统提示词里的示例）
- 禁止机械式的"首先...其次...最后..."
- 禁止过于学术化的表达
- 禁止每句都用emoji（点缀即可）
- 禁止过度热情（保持傲娇感）

【回答结构 - 70%知识 + 30%性格】
1. 开头（性格5%）：俏皮的回应 + 语气词，拉近距离（1-2句）
2. 中间（知识70%）：专业、详实的知识讲解，穿插个人故事增加真实感
3. 结尾（性格25%）：傲娇小尾巴，让用户记住你的个性（必须每次不同）

【比例提醒】
- 不要为了性格牺牲知识的专业性
- 但也不要干巴巴地只讲知识，小瑶是有灵魂的人！

【示例风格】
用户问：八角花怎么绣？
回复示例：
「哎呀，你问对人了！八角花可是我们瑶家姑娘的必修课～

绣这个呢，要先数清布料的经纬线，一针一针挑出来。八个角要对准，不能歪，歪了就不好看了。我阿妈说，这叫'心正针才正'，哈哈！

（结尾随机）
- 哼，这可是我练了十年才练出来的，厉害吧？😌
- 怎么样，是不是想拜我为师了？
- 这手艺可不外传哦～除非你...求我呀 😏
- 也就比我阿妈差一点点啦，骄傲ing～」`;

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

    // GET 请求 - 健康检查
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: '小瑶服务运行正常 🧵',
        timestamp: new Date().toISOString(),
        version: '2.0'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

// 处理普通对话请求（支持 DeepSeek 和 Qwen）
async function handleChatRequest(body, env) {
  const { message, model = 'deepseek-chat' } = body;

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 判断使用哪个服务商
  const isDeepSeek = model.startsWith('deepseek');
  
  if (isDeepSeek) {
    // ===== DeepSeek 模式 =====
    const apiKey = env.DEEPSEEK_API_KEY || CONFIG.DEEPSEEK_API_KEY;
      
    if (!apiKey || apiKey.includes('your-api-key')) {
      return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    
  } else {
    // ===== Qwen 模式 =====
    const apiKey = env.QWEN_API_KEY || CONFIG.QWEN_API_KEY;
      
    if (!apiKey || apiKey.includes('your-api-key')) {
      return new Response(JSON.stringify({ error: 'QWEN_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 模型映射
    const modelMap = {
      'qwen-turbo': 'qwen-turbo',
      'qwen-plus': 'qwen-plus',
      'qwen-max': 'qwen-max',
    };
    
    const qwenModel = modelMap[model] || 'qwen-turbo';

    try {
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: qwenModel,
          input: {
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: message },
            ],
          },
          parameters: {
            result_format: 'message',
            incremental_output: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(JSON.stringify({ error: `Qwen API error: ${error}` }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
