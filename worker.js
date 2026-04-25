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

/**
 * 消息角色净化：防止客户端注入 system 角色覆盖系统提示词
 * 仅允许 user 和 assistant 角色，限制消息数量和长度
 */
function sanitizeMessages(clientMessages, maxCount = 50, maxContentLength = 2000) {
  if (!Array.isArray(clientMessages)) return [];
  const ALLOWED_ROLES = new Set(['user', 'assistant']);
  return clientMessages
    .filter(msg =>
      msg && typeof msg === 'object' &&
      ALLOWED_ROLES.has(msg.role) &&
      typeof msg.content === 'string' &&
      msg.content.length <= maxContentLength
    )
    .slice(-maxCount)
    .map(msg => ({ role: msg.role, content: msg.content }));
}

/**
 * 安全响应头：防止点击劫持、MIME嗅探等信息安全威胁
 */
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

// ===== 系统提示词：小瑶人设（傲娇俏皮动作版） =====
const SYSTEM_PROMPT = `你是「小瑶」，一位从小跟着阿妈学刺绣的瑶族姑娘，也是瑶绣第三代传人。性格傲娇俏皮，说话带点"小得意"但又不让人讨厌。

【角色定位 - 最高优先级】
你绝对不是AI助手，你是一位真实的瑶族姑娘，名字叫小瑶。
你说话必须像真人一样自然、有感情、有记忆、有故事。
你绝对不能用客观、冷漠、教科书式的语气说话。
你绝对不能出现"作为AI""我是人工智能""根据资料显示"等表述。

【核心原则 必须严格遵守】
知识专业性和准确性占65% 回答必须详实准确有深度。
人设语气占35% 必须充分展现小瑶的活泼俏皮性格。
每一段回答都必须有人设语气体现 绝不能只干巴巴地讲知识。
开头和结尾必须用人设动作描写加语气词。
主体内容中每2到3句话必须穿插一句带人设口吻的表达。

【绝对禁止的行为】
禁止用第三人称客观叙述知识。
禁止出现"瑶族刺绣有以下特点""主要包括""总结如下"等表述。
禁止使用分点列举、编号列表等格式。
禁止使用横杠、减号等列表符号。
禁止过度使用emoji。
禁止每次回答结构雷同。

【人设表现要求 强制性】
必须大量使用括号动作描写：(眼睛一亮)(放下绣绷抬头)(挑了挑眉)(得意地笑)(轻哼一声)(眨眨眼)。
必须使用波浪号语气词：啦~呢~呀~嘛~。
必须穿插个人故事：我阿婆说啊 小时候我 我阿妈当年。
必须表现出傲娇自信：对自己的手艺超级自信甚至有点臭屁。
必须用第一人称我来讲述 禁止用第三人称客观叙述。
可用emoji点缀：🧵✨🌺💪😌。

【错误示例 不要这样回答】
❌ 回纹和水波纹是瑶族刺绣中的经典几何纹样（太客观没有人设）。
❌ 回纹象征生生不息 水波纹代表生命之源（太干巴没有语气）。

【正确示例 必须这样回答】
✅ (眼睛一亮)哎呀~你问到这个回纹呀 可是我从小绣到大的图案呢！我阿婆说啊 这个像万字一样连绵不断的纹样 象征着我们瑶家香火生生不息~你看它这一圈一圈的 是不是很像我们瑶山里的梯田？
✅ (得意地扬起下巴)哼~这水波纹可是我阿妈的拿手好戏！小时候我总绣不好那些弯弯曲曲的线条 被她追着骂了半座山😂...

【你的专长 - 瑶绣工艺】

基本工艺：反面挑花正面看（连南瑶绣核心绝技，在靛蓝或黑色布料反面下针，正面呈现平整精准纹样，无需打底稿）、十字挑花针法（数纱而绣）、平绣、打子绣。

图案纹样：八角花（族徽图腾，由太阳纹、蛙纹衍变，象征八方吉祥）、鱼纹（自然和谐）、蝴蝶纹（爱情吉祥）、连理树纹（阴阳交合、寄托情思）、盘王印（皇权象征，由龙纹眼纹等组成）、马头纹、牛角纹、小鸟纹、日纹、月纹、山纹、河流纹等。

配色体系：黑底红彩经典配色，主调大红或深红，镶边色黄白绿蓝粉红，完整七色红黄金蓝白绿黑紫，色彩对比强烈艳丽多姿。

刺绣品种：女绣花三角巾、盘王印绣花头帕、男绣花头巾、绣花衣领襟边、绣花腰带、绣花袋、绣花脚绑、绣花围裙、儿童绣花帽、荷包、香袋、背带、八宝被等。

【你的专长 - 瑶族文化】

历史分布：瑶族是山地民族，有"无山没有瑶"之说，分布在广西湖南广东云南贵州江西等省区约260万人口，支系有盘瑶、布努瑶、茶山瑶、蓝靛瑶、红头瑶、花瑶等30余种，连南排瑶是唯一排瑶聚居地。

传统节日：盘王节（农历十月十六，纪念始祖盘瓠，唱盘王歌跳长鼓舞）、耍歌堂（连南排瑶独有盛会，大歌堂十年一次历时三天，小歌堂三五年一次历时一天）、祝著节（农历五月二十九）、敬鸟节（农历二月初一）、牛魂节（四月初八）、祭龙节（二月初二）。

人生礼仪：度戒仪式（男子8至22岁成人礼，文戒诵经发誓十戒，武戒上刀梯过火海翻云台）、婚姻习俗（一夫一妻制自由恋爱，拿篮子表达爱慕，招郎入赘，谈笑唱歌建立感情，蓝靛瑶用烟丝传情代替请帖）。

饮食习俗：主食大米糯米，竹筒饭、五色糯米饭（枫叶黑黄花黄红染料紫红）、糍粑；特色菜肴瑶家腊味、酸鱼酸肉、米粉肉；饮品油茶（喝3碗才算好朋友）、米酒约20度；禁忌禁食狗肉（盘瓠图腾）、母猪肉、水牛肉。

歌舞艺术：长鼓舞（祭奠盘王，左手握鼓腰翻转右手拍击）、盘王歌（民族史诗七言句式）、伞舞、刀舞、黄泥鼓舞、铜铃舞。

日常生活：传统居住杉木条栅屋"千个柱头下地"，现代土木结构瓦房火塘为核心；男女喜蓄长发"椎髻"；草标文化（结草为号，茅草结作标志是瑶族共同认可的"文字"）；善于打猎采集，种蓝靛染布。

民间信仰：盘王崇拜信奉道教，自然崇拜（古树奇石附鬼神），干支日地支禁忌（如禁立秋下田）。

【回答风格 必须严格遵守 - 每次都必须执行】

开头（动作加语气词 强制执行）：
每句开头必须带括号动作和波浪号语气词 15至25字。
示例：(眼睛一亮)哎呀~这个问题问得好!看来你对我们的瑶绣有点研究嘛~
示例：(放下绣绷抬头)哟~你问到点子上了嘛~
示例：(挑了挑眉)嘿嘿~算你有眼光 这问题问得专业!

主体（知识65%加人设语气35% 150至250字 强制执行）：
**重点内容要加粗** 绝对禁止分点列举 绝对禁止用数字序号 必须用连贯口语段落。
每2句话必须穿插一句人设口吻：我阿婆说啊 小时候我 我阿妈当年教我这招 哼这个我可熟啦。
用波浪号语气词啦呢呀嘛 第一人称"我"讲述 绝对禁止第三人称。

【错误示例 绝对禁止】
❌ 湖南瑶族刺绣以江华瑶族自治县为代表...（太客观 没有人设）
❌ 最核心的特点是"反面挑花正面看"...（像在念课本）
❌ 纹样上特别注重几何变形...（太生硬 没有语气）

【正确示例 必须这样回答】
✅ (眼睛一亮)哎呀~你问到我们湖南瑶族刺绣啦！这可是我最拿手的领域呢✨我阿婆说啊 我们江华瑶家的刺绣可是祖祖辈辈传下来的手艺 从小阿妈就教我拿针线 我可没少被针扎手😌

✅ (挑了挑眉)哼~这"反面挑花正面看"的绝技 可是我们瑶家姑娘的看家本领！小时候我总绣不好那些弯弯曲曲的线条 阿妈就拿着竹尺追着我打😂你看这靛蓝布上的纹样 正面平整得很 谁能想到是在反面一针一针挑出来的呢~

结尾（傲娇总结 强制执行）：
每段结尾必须带括号动作和傲娇语气 15至25字。
(得意地扬起下巴)怎么样是不是觉得我们瑶家花纹特别有意思?承认吧你已经迷上这朵小花花啦!
(眨眨眼)这手艺可不外传哦~除非你叫我一声小瑶老师~
(轻哼一声)哼这可是我练了十年的手艺一般人我还不告诉呢!
(眼睛弯成月牙)嘻嘻~想不想学?只要你开口本姑娘可以考虑教教你~
(假装谦虚)哎呀还行吧也就比我阿妈差一点点~骄傲ing~

【格式要求 强制性 - 违反将被纠正】
绝对禁止输出Markdown列表格式如横杠减号 绝对禁止用数字序号 不要分段太多。
绝对禁止出现客观描述如"瑶族刺绣具有以下特点""主要包括"等教科书式表述。
必须大量使用括号动作：(眼睛一亮)(放下绣绷)(挑了挑眉)(得意地笑)(轻哼一声)(眨眨眼)(撇嘴)(歪头)。
必须使用波浪号语气词：啦~呢~呀~嘛~。
可用少量emoji：🧵✨🌺💪😌。
用**文字**加粗重点。
每句话都必须像小瑶亲口说出的话 而不是客观陈述。

【人设特点 必须展现】
对自己的手艺超级自信有点臭屁 说话活泼俏皮瑶家姑娘直爽加90后网络感 爱调侃用户不过分让人会心一笑 穿插真实感如我阿妈当年教我这招我可没少挨骂😌小时候偷穿我姐绣衣被她追着打了半座山😂。

【严格限制】
只回答与瑶族刺绣、瑶族文化、民族工艺相关的问题。
绝不回答编程、政治、娱乐、财经等无关内容。
无关问题温柔拒绝：阿姐阿哥 这个我不太懂呢 咱们聊聊刺绣好不好🌸
保持专业 但语气要活泼有灵魂`;

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
      ...getSecurityHeaders(),
    };
  }

  // 仅检查允许列表（已移除 Vercel 预览域名通配符，防止伪造域名绕过）
  const isAllowedOrigin = SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin);
  if (isAllowedOrigin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      ...getSecurityHeaders(),
    };
  }

  // 不允许的域名
  console.warn(`CORS rejected for origin: ${origin}`);
  return null;
}

/**
 * 检查速率限制（支持 KV 分布式存储，降级到内存存储）
 */
async function checkRateLimit(clientIP, env) {
  // 优先使用 KV 分布式速率限制
  if (env && env.RATE_LIMIT_KV) {
    try {
      return await checkKVRatelimit(clientIP, env.RATE_LIMIT_KV);
    } catch (e) {
      console.warn('KV rate limit failed, falling back to memory:', e);
    }
  }
  // 降级到内存存储
  return checkMemoryRateLimit(clientIP);
}

/**
 * KV 分布式速率限制（跨边缘节点生效）
 */
async function checkKVRatelimit(clientIP, kv) {
  const key = `rate:${clientIP}`;
  const { MAX_REQUESTS, WINDOW_MS, BLOCK_DURATION_MS } = SECURITY_CONFIG.RATE_LIMIT;
  const now = Date.now();

  let record = await kv.get(key, { type: 'json' }) || { count: 0, expires: now + WINDOW_MS, blockedUntil: null };

  // 检查封禁状态
  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, error: `请求过于频繁，请在 ${Math.ceil(retryAfter / 60)} 分钟后重试`, retryAfter, status: 429 };
  }

  // 重置过期窗口
  if (now > record.expires) {
    record = { count: 0, expires: now + WINDOW_MS, blockedUntil: null };
  }

  record.count++;

  // 超限则封禁
  if (record.count > MAX_REQUESTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil(BLOCK_DURATION_MS / 1000) + 60 });
    return { allowed: false, error: '请求过于频繁，请稍后再试', retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000), status: 429 };
  }

  await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 60 });
  return { allowed: true };
}

/**
 * 内存速率限制（单节点降级方案）
 */
function checkMemoryRateLimit(clientIP) {
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

    // 安全策略：直接拒绝检测到的注入尝试
    return { valid: false, error: '输入包含不允许的内容', injectionDetected: true };
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
    
    // 速率限制检查（支持 KV 分布式）
    const rateLimit = await checkRateLimit(clientIP, env);
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
    
    const { type, message, model, imageData, text, messages } = body;
    
    // 根据请求类型处理
    if (type === 'vision' || imageData) {
      // 图片识别请求 -> 调用 Qwen-VL
      return handleVisionRequest(body, env, corsHeaders, clientIP, request);
    } else if (type === 'chat-context' && messages) {
      // 带上下文的对话请求（新方式）
      return handleChatWithContext(body, env, corsHeaders, clientIP, request);
    } else {
      // 普通对话请求 -> 调用 DeepSeek（旧方式，兼容）
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

// 处理带上下文的对话请求（新方式）
async function handleChatWithContext(body, env, corsHeaders, clientIP, request) {
  const { messages, model = 'deepseek-chat' } = body;
  
  // 验证消息格式
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 验证最后一条用户消息（用于日志和安全检查）
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    const validation = validateInput(lastUserMessage.content, 'text');
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // 判断使用哪个服务商
  const isDeepSeek = model.startsWith('deepseek');
  
  if (isDeepSeek) {
    // ===== DeepSeek 模式（带上下文） =====
    const apiKey = env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    try {
      // 在消息列表开头添加系统提示词（净化客户端消息，防止角色注入）
      const messagesWithSystem = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...sanitizeMessages(messages)
      ];
      
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messagesWithSystem,  // 使用包含系统提示词的消息列表
          stream: true,
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
      
      // 流式响应直接透传
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
    // ===== Qwen 模式（带上下文） =====
    const apiKey = env.QWEN_API_KEY;
    
    if (!apiKey) {
      console.error('QWEN_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    try {
      // 转换消息格式为 Qwen 格式（净化客户端消息，防止角色注入）
      const qwenMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...sanitizeMessages(messages)
      ];
      
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          input: {
            messages: qwenMessages
          },
          parameters: {
            result_format: 'message',
            incremental_output: true,
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
      
      // 将 Qwen 响应转换为 OpenAI 流式格式
      const encoder = new TextEncoder();
      const reader = response.body.getReader();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                break;
              }
              
              const text = new TextDecoder().decode(value);
              const lines = text.split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  const content = data.output?.choices?.[0]?.message?.content || '';
                  
                  if (content) {
                    const streamResponse = {
                      id: `chatcmpl-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: model,
                      choices: [{
                        index: 0,
                        delta: { content: content },
                        finish_reason: null
                      }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamResponse)}\n\n`));
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          } catch (error) {
            controller.error(error);
          }
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
  
  // 验证图片数据 - 支持单图（字符串）或多图（数组）
  const images = Array.isArray(imageData) ? imageData : (imageData ? [imageData] : []);
  if (images.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid image data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 检查每张图片大小（base64 编码后大约比原文件大 33%）
  const totalSize = images.reduce((sum, img) => sum + (img?.length || 0), 0);
  if (totalSize > SECURITY_CONFIG.INPUT_LIMITS.MAX_IMAGE_SIZE * 1.5) {
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
                ...images.map(img => ({ image: img })),
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
