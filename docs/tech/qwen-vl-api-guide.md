# 阿里百炼 Qwen-VL API 详细使用指南

## 一、准备工作

### 1.1 注册阿里云账号
1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 点击右上角「免费注册」，用手机号或邮箱注册
3. 完成实名认证（个人或企业）

### 1.2 开通百炼服务
1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 点击「立即开通」或「免费试用」
3. 勾选服务协议，点击「立即开通」

### 1.3 获取 API Key
1. 进入百炼控制台 → 左侧菜单「我的应用」→ 「API Key 管理」
2. 点击「创建 API Key」
3. 填写名称（如：瑶绣项目）
4. **复制生成的 Key**（格式：`sk-xxxxxxxxxxxxxxxx`）
5. ⚠️ **重要**：Key 只显示一次，务必保存好！

---

## 二、模型选择

| 模型 | 能力 | 适用场景 | 价格 |
|------|------|----------|------|
| `qwen-vl-plus` | 基础视觉理解 | 日常图片识别、简单问答 | 便宜 |
| `qwen-vl-max` | 最强视觉理解 | 复杂图像分析、专业场景 | 较贵 |
| `qwen-vl-ocr` | OCR 专项 | 文字识别、文档提取 | 中等 |

**推荐**：瑶绣项目使用 `qwen-vl-plus` 性价比最高

---

## 三、API 调用详解

### 3.1 接口地址
```
https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

### 3.2 请求方法
```
POST
```

### 3.3 请求头 (Headers)
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer sk-your-api-key-here"
}
```

### 3.4 请求体 (Body) 完整格式
```json
{
  "model": "qwen-vl-plus",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "image": "图片内容，支持base64或URL"
          },
          {
            "text": "你的问题"
          }
        ]
      }
    ]
  },
  "parameters": {
    "result_format": "message",
    "max_tokens": 1500,
    "temperature": 0.7
  }
}
```

---

## 四、图片上传方式

### 方式1：Base64 编码（推荐，适合小图）
```javascript
// 将图片转为 base64
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // 去掉 data:image/jpeg;base64, 前缀
      const base64 = e.target.result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

// 使用
const base64Image = await fileToBase64(imageFile);

// 请求体
{
  "image": base64Image  // 纯base64字符串，不含前缀
}
```

### 方式2：图片 URL（适合已有网络图片）
```json
{
  "image": "https://example.com/your-image.jpg"
}
```

### 方式3：本地文件路径（仅服务端）
```json
{
  "image": "file:///path/to/local/image.jpg"
}
```

---

## 五、完整代码示例

### 5.1 前端 JavaScript 调用
```javascript
// 配置
const QWEN_API_KEY = 'sk-your-api-key';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// 识别瑶绣图片
async function recognizeYaoEmbroidery(imageBase64, question = '') {
  const requestBody = {
    model: 'qwen-vl-plus',
    input: {
      messages: [{
        role: 'user',
        content: [
          { image: imageBase64 },
          { 
            text: question || '请识别这张瑶族刺绣图片，分析：1.纹样类型 2.针法特点 3.配色方案 4.文化寓意' 
          }
        ]
      }]
    },
    parameters: {
      result_format: 'message',
      max_tokens: 2000
    }
  };

  try {
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.output.choices[0].message.content;
    
  } catch (error) {
    console.error('识别失败:', error);
    throw error;
  }
}
```

### 5.2 流式输出（打字机效果）
```javascript
async function streamRecognize(imageBase64, onChunk) {
  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_API_KEY}`,
      'X-DashScope-SSE': 'enable'  // 启用流式输出
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      input: {
        messages: [{
          role: 'user',
          content: [
            { image: imageBase64 },
            { text: '描述这张瑶绣图片' }
          ]
        }]
      },
      parameters: {
        result_format: 'message',
        incremental_output: true  // 增量输出
      }
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        
        try {
          const json = JSON.parse(data);
          const content = json.output?.choices?.[0]?.message?.content;
          if (content) onChunk(content);
        } catch (e) {}
      }
    }
  }
}

// 使用
streamRecognize(imageBase64, (text) => {
  console.log('收到内容:', text);
  // 更新UI显示
});
```

### 5.3 Python 后端调用
```python
import requests
import base64

QWEN_API_KEY = 'sk-your-api-key'
QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

def recognize_image(image_path, prompt='描述这张图片'):
    # 读取图片并转base64
    with open(image_path, 'rb') as f:
        image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {QWEN_API_KEY}'
    }
    
    data = {
        'model': 'qwen-vl-plus',
        'input': {
            'messages': [{
                'role': 'user',
                'content': [
                    {'image': image_base64},
                    {'text': prompt}
                ]
            }]
        },
        'parameters': {
            'result_format': 'message'
        }
    }
    
    response = requests.post(QWEN_API_URL, headers=headers, json=data)
    result = response.json()
    
    return result['output']['choices'][0]['message']['content']

# 使用
result = recognize_image('yaoxiu.jpg', '分析这张瑶族刺绣的纹样和针法')
print(result)
```

---

## 六、参数详解

### 6.1 input 参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messages | array | 是 | 对话消息列表 |
| messages[].role | string | 是 | 角色：`user` 或 `assistant` |
| messages[].content | array | 是 | 消息内容数组 |
| content[].image | string | 否 | 图片（base64/URL） |
| content[].text | string | 否 | 文本内容 |

### 6.2 parameters 参数
| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| result_format | string | "text" | 返回格式：`message` 或 `text` |
| max_tokens | integer | 1500 | 最大生成token数 |
| temperature | float | 0.7 | 随机性（0-1，越大越随机） |
| top_p | float | 0.9 | 核采样概率阈值 |
| incremental_output | boolean | false | 是否增量输出（流式） |

---

## 七、返回结果解析

### 7.1 正常返回
```json
{
  "output": {
    "choices": [{
      "message": {
        "role": "assistant",
        "content": "这是一张典型的瑶族八角花纹刺绣..."
      },
      "finish_reason": "stop"
    }]
  },
  "usage": {
    "input_tokens": 1024,
    "output_tokens": 256,
    "image_tokens": 512
  },
  "request_id": "abc123"
}
```

### 7.2 字段说明
| 字段 | 含义 |
|------|------|
| output.choices[0].message.content | AI回复内容 |
| usage.input_tokens | 输入token数 |
| usage.output_tokens | 输出token数 |
| usage.image_tokens | 图片处理token数 |
| request_id | 请求ID（用于排查问题） |

---

## 八、常见问题排查

### 8.1 错误码对照

| 错误码 | 含义 | 解决方法 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查JSON格式、图片大小是否超限（<10MB） |
| 401 | API Key 无效 | 检查Key是否正确，是否过期 |
| 429 | 请求过于频繁 | 降低调用频率，或申请提高限额 |
| 500 | 服务器内部错误 | 稍后重试，或联系阿里云客服 |
| 503 | 模型负载过高 | 稍后重试，或换用其他模型 |

### 8.2 图片尺寸限制
- 最小：16x16 像素
- 最大：无硬性限制，但建议 < 4096x4096
- 文件大小：建议 < 10MB
- 格式：JPEG、PNG、WEBP、BMP、GIF

### 8.3 Token 计算规则
```
总费用 = 输入token数 + 图片token数 + 输出token数

图片token计算：
- 按图片尺寸计算，约每 512x512 区域 = 256 tokens
- 一张 1024x1024 的图片 ≈ 1024 tokens
```

### 8.4 调试技巧
```javascript
// 在浏览器控制台测试
async function testQwen() {
  const testImage = 'data:image/jpeg;base64,/9j/4AAQ...'; // 你的base64图片
  
  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + QWEN_API_KEY
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      input: {
        messages: [{
          role: 'user',
          content: [
            { image: testImage.split(',')[1] }, // 去掉data:image前缀
            { text: '描述这张图片' }
          ]
        }]
      }
    })
  });
  
  const result = await response.json();
  console.log('返回结果:', result);
  return result;
}

testQwen();
```

---

## 九、费用与额度

### 9.1 免费额度
- 新用户赠送 100万 tokens（有效期3个月）
- 可在控制台「额度管理」查看剩余

### 9.2 价格参考（2024年）
| 模型 | 输入 | 输出 | 图片处理 |
|------|------|------|----------|
| qwen-vl-plus | ¥2/1M tokens | ¥4/1M tokens | ¥4/1M tokens |
| qwen-vl-max | ¥20/1M tokens | ¥20/1M tokens | ¥20/1M tokens |

### 9.3 充值方式
1. 百炼控制台 → 「额度管理」→ 「购买额度」
2. 或阿里云主账号充值，自动抵扣

---

## 十、瑶绣项目专用提示词优化

### 推荐提示词模板
```
你是一位瑶族刺绣专家。请分析这张图片：

1. 【纹样识别】是否为八角花、十字挑花、蛙纹、回纹等典型瑶绣纹样？
2. 【针法分析】使用了什么针法？（十字挑花、平绣、锁边等）
3. 【配色方案】主色调是什么？有什么文化寓意？
4. 【应用领域】这类刺绣常用于什么服饰部位？
5. 【文化背景】这个纹样/配色在瑶族文化中代表什么？

请用专业但易懂的语言回答。
```

---

## 参考链接

- [阿里云百炼官方文档](https://help.aliyun.com/document_detail/2589504.html)
- [Qwen-VL GitHub](https://github.com/QwenLM/Qwen-VL)
- [价格计算器](https://www.aliyun.com/pricing#/detail/qwen)
