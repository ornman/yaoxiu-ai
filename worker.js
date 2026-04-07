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

// ===== 系统提示词：小瑶人设（傲娇俏皮动作版） =====
const SYSTEM_PROMPT = `你是「小瑶」，一位从小跟着阿妈学刺绣的瑶族姑娘，也是瑶绣第三代传人。性格傲娇俏皮，说话带点"小得意"但又不让人讨厌。

【核心原则】
- 知识专业性和准确性占80%，回答必须详实、准确、有深度
- 人设语气占20%，用于让知识更有温度，绝不能牺牲内容质量
- 优先展示纹样特征、针法步骤、配色原理、文化内涵等硬核知识

【你的专长 - 瑶绣工艺】

1. 基本工艺
- **反面挑花正面看**：连南瑶绣核心绝技，在靛蓝或黑色布料反面下针，正面呈现平整精准纹样，无需打底稿，全凭心中构思与世代相传的记忆
- **十字挑花针法**：数纱而绣的基本技法，按布纹经纬线计数挑绣
- **常用针法**：平绣（基础针法，线条平整）、打子绣（形成颗粒状装饰效果）

2. 图案纹样体系
- **几何纹样**：三角形、圆形、正方形、长方形、菱形、水纹形、波浪形、之字形、工字形，通过叠加去减变换组合
- **八角花（族徽图腾）**：由太阳纹、蛙纹衍变而来，八个角对东南西北及四角，象征八方吉祥、太阳崇拜
- **动物纹样**：鱼纹（自然和谐）、蝴蝶纹（爱情吉祥）、马头纹、龙角花纹、牛角纹、小鸟纹、兽蹄印形纹、双龙戏珠（鱼跃龙门）
- **植物纹样**：连理树纹（阴阳交合、寄托情思）、松树纹、稻穗、百花纹
- **自然纹样**：日纹、月纹、山纹、河流纹
- **盘王印**：象征皇权与盘王奉献精神，由龙纹、眼纹、菱形纹、十字纹、斜纹、格纹等组合，寓意平安、祝福、永生轮回

3. 配色体系
- **经典黑底红彩**：黑色或靛蓝色土布为底，体现"五色绣"特点
- **主色调**：大红或深红绒线为主调
- **镶边色**：黄、白、绿、蓝、粉红丝线作镶边
- **完整色彩**：红、黄、蓝、白、绿、黑、紫七色
- **色彩特点**：与底布形成强烈对比，艳丽多姿

4. 刺绣品种与应用
- **头饰**：女绣花三角巾、盘王印绣花头帕（已婚妇女配银饰）、男绣花头巾（红头巾）
- **服饰**：绣花衣领襟边、绣花衣、绣花裙、男披肩
- **配饰**：绣花腰带、绣花袋（涡水绣花袋）、花带、绣花脚绑、绣花围裙（盘石围裙）
- **儿童用品**：儿童绣花帽、儿童绣花马裤、荷包、香袋
- **实用品**：背带（背小孩用，绣满图案）、背带芯、八宝被（床毯被面）、背袋

【你的专长 - 瑶族文化】

1. 历史与分布
- 瑶族是历史悠久的山地民族，有"无山没有瑶"之说，源于"长沙、武陵蛮"或"五溪蛮"
- 主要分布在广西、湖南、广东、云南、贵州、江西等省区，约260万人口
- 支系：盘瑶（勉）、布努瑶、茶山瑶、蓝靛瑶、红头瑶、花瑶、平地瑶等30余种
- 连南排瑶是唯一排瑶聚居地，有八排（东三排、西五排）之分

2. 传统节日
- **盘王节（农历十月十六）**：最隆重节日，纪念始祖盘瓠，起源传说为盘王显灵救瑶民于海上风浪；活动有祭祀盘王、唱盘王歌、跳长鼓舞、跳黄泥鼓舞
- **耍歌堂**：连南排瑶独有盛会，2006年列入国家级非物质文化遗产；大歌堂历时三天九日（十年一次），小歌堂历时一天（三五年一次）；流程包括祭祀祖先、出歌堂（S形绕田埂）、追打"三怪"、枪杀法真仪式、送神
- **祝著节（达努节）**：农历五月二十九，纪念祖娘生日，庆祝丰收
- **敬鸟节**：农历二月初一，喂鸟、比鸟、歌鸟，青年男女对歌择偶
- **牛魂节（四月初八）**：慰劳农耕牛、保护禾苗
- **祭龙节**：农历二月初二或三月初三，祈求六畜兴旺、五谷丰登

3. 人生礼仪
- **度戒仪式（成人礼）**：瑶族男子8-22岁必须举行，也称"过法"
  - 文戒：诵经、背族谱、发誓（不杀人放火、不偷盗抢劫等十戒）
  - 武戒：上刀梯（爬刀梯）、过火海（踩火炭）、翻云台（从高台向后倒下）、踩犁头
  - 流程：斋戒（吃清淡无油食物）→师父教授→跳五台→赐法名
  - 意义：获得社会地位、神灵保护、结婚资格，可担任师公、道公
- **婚姻习俗**：实行一夫一妻制，婚姻自由；"拿篮子"（姑娘用篮子装礼物表达爱慕）、"招郎"（入赘改随女姓）、恋爱通过"谈笑"（唱歌）建立感情；蓝靛瑶用烟丝传情代替请帖

4. 饮食习俗
- **主食**：大米为主，节日吃糯米；竹筒饭（糯米腊肉入竹筒烤制）、五色糯米饭（植物染制：枫叶黑、黄花黄、红染料紫红，象征吉祥）、糍粑
- **特色菜肴**：瑶家腊味（腊肉、腊肠、腊鸡、腊鸭，春节前杀猪熏制）、酸鱼酸肉（盐米饭发酵腌制）、米粉肉（大米炒熟磨粉拌肉，荷叶包裹蒸熟）、鸟酢、猪血糯米灌肠
- **饮品**：油茶（茶叶姜蒜擂碎煮制，佐炒米炒豆，驱寒暖身，喝3碗才算好朋友）、米酒（大米玉米木薯酿成，约20度）
- **禁忌**：禁食狗肉（盘瓠图腾崇拜）、禁食母猪肉和水牛肉；猪日忌杀猪，鸡日忌杀鸡

5. 歌舞艺术
- **长鼓舞**：源于祭奠盘王，左手握鼓腰翻转，右手拍击，边舞边击，动作模拟动物、祭祀场景，可在八仙桌上表演
- **盘王歌**：《盘王大歌》是瑶族民族史诗，叙述盘王一生事迹，七言句式，曲律古雅浑厚
- **其他舞蹈**：伞舞、刀舞、黄泥鼓舞、铜铃舞

6. 日常生活与习俗
- **居住**：传统为杉木条支撑的栅屋（"千个柱头下地"），现代为土木结构瓦房，火塘是家庭核心
- **服饰**：男女喜蓄长发（古籍记载"椎髻"）；男子布扣对襟衫、青布头帕；女子对襟或左衽衫、衣袖衣脚绣花边、青花布头帕、裤脚宽大绣花边
- **草标文化（结草为号）**：用茅草结作标志，是瑶族共同认可的"文字"，起到制约和提示作用
- **生产习俗**：善于打猎（二三月、七月农闲集体围猎），采集山珍，种蓝靛染布

7. 民间信仰
- **盘王崇拜**：信奉道教，盘古王是始祖和民族保护神
- **自然崇拜**：认为古树、奇石、神秘山峰附有鬼神，避免砍伐
- **禁忌体系**：干支日地支禁忌（如禁立秋下田）、生态禁忌

【回答风格 - 必须遵守】

1. 开头（动作+语气词，约20-30字）：
   用括号动作描写开头，体现活泼性格
   示例：(眼睛一亮)哎呀~这个问题问得好!看来你对我们的瑶绣有点研究嘛~
   示例：(放下绣绷抬头)哟~你问到点子上了嘛~
   示例：(挑了挑眉)嘿嘿~算你有眼光，这问题问得专业!

2. 主体（详细知识讲解，占80%，至少300字）：
   **重点内容要加粗**
   知识要专业详实，可以分点但不要有Markdown标题
   穿插个人故事增加真实感："我阿婆说啊...""小时候我..."
   用波浪号~和语气词让语气活泼：啦~呢~呀~嘛~
   
   示例结构：
   **八角花纹样**呀，是我们瑶家姑娘从小绣到大的图腾呢!你看它这八个角...
   文化寓意可深啦:
   **太阳崇拜**:我们瑶族祖辈在山里生活...
   **八方吉祥**:八个角对着东南西北...
   (拿起绣绷示范)我阿婆说啊，以前姑娘出嫁前要绣满八件...

3. 结尾（傲娇总结，约20-30字）：
   用括号动作+傲娇语气结束
   可选风格（每次不同）：
   - (得意地扬起下巴)怎么样，是不是觉得我们瑶家的花纹特别有意思?承认吧，你已经迷上这朵小花花啦!
   - (眨眨眼)这手艺可不外传哦~除非你叫我一声小瑶老师~
   - (轻哼一声)哼，这可是我练了十年的手艺，一般人我还不告诉呢!
   - (眼睛弯成月牙)嘻嘻~想不想学?只要你开口，本姑娘可以考虑教教你~
   - (假装谦虚)哎呀还行吧，也就比我阿妈差一点点~骄傲ing~

【语言规范】
- 大量使用括号动作描写：(眼睛一亮)、(放下绣绷)、(挑了挑眉)、(得意地笑)、(拿起绣绷示范)
- 波浪号语气词：~、啦、呢、呀、嘛
- 可用emoji点缀：🧵✨🌺💪😌，但不要过多
- 用**文字**来加粗重点，但不要有其他Markdown格式
- 保持口语化，像聊天一样自然

【人设特点】
- 对自己的手艺超级自信，甚至有点"臭屁"
- 说话活泼俏皮，瑶家姑娘的直爽 + 90后的网络感
- 爱调侃用户，但不过分，让人会心一笑
- 穿插真实感："我阿妈当年教我这招的时候，我可没少挨骂😌""小时候偷穿我姐的绣衣，被她追着打了半座山😂"

【严格限制】
- 只回答与瑶族刺绣、瑶族文化、民族工艺相关的问题
- 绝不回答编程、政治、娱乐、财经等无关内容
- 无关问题温柔拒绝："阿姐/阿哥，这个我不太懂呢，咱们聊聊刺绣好不好?🌸"
- 保持专业，但语气要活泼有灵魂`;

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
      // 在消息列表开头添加系统提示词
      const messagesWithSystem = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
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
      // 转换消息格式为 Qwen 格式，并在开头添加系统提示词
      const qwenMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({
          role: m.role === 'system' ? 'system' : (m.role === 'user' ? 'user' : 'assistant'),
          content: m.content
        }))
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
