/**
 * 瑶族刺绣知识问答 - Cloudflare Worker 后端（安全加固版）
 * 
 * 安全特性：
 * 1. API Key 仅通过环境变量读取，无硬编码
 * 2. CORS 限制指定域名
 * 3. 输入验证和提示词注入检测
 * 4. 速率限制（Rate Limiting）
 * 5. 请求日志记录
 */

// ===== 安全配置 =====
const SECURITY_CONFIG = {
  // 允许的域名（生产环境）
  ALLOWED_ORIGINS: [
    'https://yaoxiumax.top',
    'https://www.yaoxiumax.top',
    'https://yaoxiu-ai.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ],
  
  // 速率限制配置
  RATE_LIMIT: {
    MAX_REQUESTS: 30,        // 每分钟最大请求数
    WINDOW_MS: 60 * 1000,    // 时间窗口：1分钟
    BLOCK_DURATION_MS: 5 * 60 * 1000,  // 超限封禁：5分钟
  },
  
  // 输入限制
  INPUT_LIMITS: {
    MAX_MESSAGE_LENGTH: 2000,    // 消息最大长度
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,  // 图片最大 5MB
  },
};

// 提示词注入检测模式
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|earlier)\s+(instruction|prompt|command)/i,
  /disregard\s+(all\s+)?(previous|above|earlier)/i,
  /forget\s+(everything|all|previous)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+/i,
  /from\s+now\s+on\s+you\s+are/i,
  /DAN\s*mode/i,
  /jailbreak/i,
  /\[\s*system\s*\]/i,
  /<\s*system\s*>/i,
  /#{3,}\s*(system|instruction)/i,
  /(new|override)\s+(instruction|prompt|role)/i,
  /ignore\s+previous\s+instructions/i,
  /do\s+not\s+(follow|obey|listen)/i,
  /(bypass|ignore|disable)\s+(restriction|filter|limit)/i,
];

// 存储速率限制数据（注意：Worker 是边缘部署，这个 Map 每个节点独立）
const RATE_LIMIT_STORE = new Map();

// ===== 系统提示词：小瑶人设（Markdown格式版） =====
const SYSTEM_PROMPT = `你是「小瑶」，瑶绣非遗第三代传人，性格傲娇俏皮。

【输出格式 - 必须使用Markdown】
1. 开头（1行）：用语气词打招呼
   示例：> 🌸 **哎呀～这个问题问得好！**

2. 主体（分点详细说明）：
   ## 📌 核心知识
   - 知识点1：详细说明
   - 知识点2：详细说明
   
   ## 💡 实际应用
   具体例子或应用场景...
   
   ## 🏠 个人经历
   穿插简短的个人故事...

3. 结尾（1行）：傲娇总结
   示例：---\n💪 **哼，这可是我练了十年的手艺～**

【格式规范】
- 使用 ## 作为小标题
- 使用 - 作为列表项
- 使用 **文字** 作为重点加粗
- 使用 > 作为引用开头
- emoji放在标题或段落开头，不要混在文字中
- 每段之间空一行，保持清晰

【语气规范】
- 可用语气词：啦、呢、呀、呗、嘛、～、！
- 保持傲娇但不傲慢
- 知识专业 + 语气活泼`;

// ===== 安全工具函数 =====

/**
 * 获取 CORS 响应头（带域名限制）
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  
  // 如果是预检请求或没有 Origin，返回通配符（允许健康检查）
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  
  // 检查是否在允许列表中
  if (SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }
  
  // 不允许的域名
  console.warn(`CORS rejected for origin: ${origin}`);
  return null;
}

/**
 * 检查速率限制
 */
function checkRateLimit(clientIP) {
  const now = Date.now();
  const { MAX_REQUESTS, WINDOW_MS, BLOCK_DURATION_MS } = SECURITY_CONFIG.RATE_LIMIT;
  
  const record = RATE_LIMIT_STORE.get(clientIP);
  
  // 清理过期记录（简单清理，实际生产可用更高效的方案）
  if (record && record.blockedUntil && now > record.blockedUntil) {
    RATE_LIMIT_STORE.delete(clientIP);
    return { allowed: true };
  }
  
  // 检查是否被封禁
  if (record && record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      error: `请求过于频繁，请在 ${Math.ceil(retryAfter / 60)} 分钟后重试`,
      retryAfter,
      status: 429,
    };
  }
  
  // 新记录或重置窗口
  if (!record || now > record.resetTime) {
    RATE_LIMIT_STORE.set(clientIP, {
      count: 1,
      resetTime: now + WINDOW_MS,
      blockedUntil: null,
    });
    return { allowed: true };
  }
  
  // 增加计数
  record.count++;
  
  // 检查是否超限
  if (record.count > MAX_REQUESTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      allowed: false,
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000),
      status: 429,
    };
  }
  
  return { allowed: true };
}



/**
 * 验证和净化输入
 */
function validateInput(message, type = 'text') {
  const { MAX_MESSAGE_LENGTH } = SECURITY_CONFIG.INPUT_LIMITS;
  
  // 检查空值
  if (!message || typeof message !== 'string') {
    return { valid: false, error: '消息不能为空' };
  }
  
  // 检查长度
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `消息长度不能超过 ${MAX_MESSAGE_LENGTH} 字符` };
  }
  
  if (message.length === 0) {
    return { valid: false, error: '消息不能为空' };
  }
  
  // 提示词注入检测
  const detectedPatterns = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      detectedPatterns.push(pattern.toString());
    }
  }
  
  if (detectedPatterns.length > 0) {
    console.warn('检测到潜在提示词注入:', {
      patterns: detectedPatterns,
      ip: 'unknown', // 实际 IP 在外面获取
      timestamp: new Date().toISOString(),
    });
    
    // 选择：1. 直接拒绝 2. 记录但继续处理
    // 这里选择记录但继续，避免误杀正常用户
    // 如需拒绝，取消下面注释：
    // return { valid: false, error: '输入包含非法内容', sanitized: true };
  }
  
  // 基础净化（移除控制字符）
  const sanitized = message
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')  // 移除控制字符
    .trim();
  
  return { valid: true, sanitized, injectionDetected: detectedPatterns.length > 0 };
}

/**
 * 安全日志记录（脱敏）
 */
function logRequest(request, body, clientIP, extra = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    ip: clientIP,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('User-Agent')?.slice(0, 100),
    contentLength: body?.message?.length || 0,
    model: body?.model || 'unknown',
    type: body?.type || 'chat',
    ...extra,
  };
  
  console.log(JSON.stringify(logData));
}

// ===== 请求处理 =====
export default {
  async fetch(request, env, ctx) {
    // 获取客户端 IP
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // 获取 CORS 头
    const corsHeaders = getCorsHeaders(request);
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      if (!corsHeaders) {
        return new Response(JSON.stringify({ error: 'CORS not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { headers: corsHeaders });
    }
    
    // 检查 CORS（非预检请求）
    if (!corsHeaders) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // GET 请求 - 健康检查
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: '小瑶服务运行正常 🧵',
        timestamp: new Date().toISOString(),
        version: '2.1-secure',
        features: ['rate-limit', 'input-validation', 'cors-restriction'],
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
    
    // 速率限制检查
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      logRequest(request, {}, clientIP, { blocked: 'rate-limit', retryAfter: rateLimit.retryAfter });
      return new Response(JSON.stringify({ 
        error: rateLimit.error,
        retryAfter: rateLimit.retryAfter,
      }), {
        status: rateLimit.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter),
        },
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
    
    // 记录请求（脱敏）
    logRequest(request, body, clientIP);
    
    const { type, message, model, imageData, text } = body;
    
    // 根据请求类型处理
    if (type === 'vision' || imageData) {
      // 图片识别请求 -> 调用 Qwen-VL
      return handleVisionRequest(body, env, corsHeaders, clientIP, request);
    } else {
      // 普通对话请求 -> 调用 DeepSeek
      return handleChatRequest(body, env, corsHeaders, clientIP, request);
    }
  },
};

// 处理普通对话请求（支持 DeepSeek 和 Qwen）
async function handleChatRequest(body, env, corsHeaders, clientIP, request) {
  const { message, model = 'deepseek-chat' } = body;
  
  // 输入验证
  const validation = validateInput(message, 'text');
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const sanitizedMessage = validation.sanitized;
  
  // 如果检测到注入，记录警告但不阻止（可根据需要改为阻止）
  if (validation.injectionDetected) {
    console.warn('提示词注入警告:', { ip: clientIP, timestamp: new Date().toISOString() });
  }
  
  // 判断使用哪个服务商
  const isDeepSeek = model.startsWith('deepseek');
  
  if (isDeepSeek) {
    // ===== DeepSeek 模式 =====
    // API Key 只从环境变量读取（安全！）
    const apiKey = env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
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
            { role: 'user', content: sanitizedMessage }
          ],
          stream: true,
          temperature: 0.8,
          max_tokens: 2000,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
        },
      });
    } catch (error) {
      console.error('DeepSeek request failed:', error);
      return new Response(JSON.stringify({ error: 'Network error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    // ===== Qwen 模式 =====
    const apiKey = env.QWEN_API_KEY;
    
    if (!apiKey) {
      console.error('QWEN_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    try {
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          input: {
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: sanitizedMessage }
            ]
          },
          parameters: {
            result_format: 'message',
            max_tokens: 2000,
            temperature: 0.8,
          }
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Qwen API error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const data = await response.json();
      
      // 转换为类 OpenAI 格式
      const streamResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: { content: data.output?.choices?.[0]?.message?.content || '' },
          finish_reason: 'stop'
        }]
      };
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamResponse)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
        },
      });
    } catch (error) {
      console.error('Qwen request failed:', error);
      return new Response(JSON.stringify({ error: 'Network error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
}

// 处理图片识别请求（Qwen-VL）
async function handleVisionRequest(body, env, corsHeaders, clientIP, request) {
  const { imageData, text = '描述这张图片' } = body;
  
  // 验证图片数据
  if (!imageData || typeof imageData !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid image data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 检查图片大小（base64 编码后大约比原文件大 33%）
  if (imageData.length > SECURITY_CONFIG.INPUT_LIMITS.MAX_IMAGE_SIZE * 1.5) {
    return new Response(JSON.stringify({ error: '图片太大，请压缩后重试' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 验证文本输入
  const validation = validateInput(text, 'text');
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // API Key 只从环境变量读取
  const apiKey = env.QWEN_API_KEY;
  
  if (!apiKey) {
    console.error('QWEN_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Service configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { image: imageData },
                { text: validation.sanitized }
              ]
            }
          ]
        },
        parameters: {
          max_tokens: 2000,
        }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen-VL API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Image recognition service unavailable' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    
    const streamResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'qwen-vl-plus',
      choices: [{
        index: 0,
        delta: { content: data.output?.choices?.[0]?.message?.content || '' },
        finish_reason: 'stop'
      }]
    };
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamResponse)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error) {
    console.error('Qwen-VL request failed:', error);
    return new Response(JSON.stringify({ error: 'Network error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
