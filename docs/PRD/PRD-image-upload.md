# 瑶绣·智问 - 图片上传功能 PRD

## 1. 功能概述

支持用户通过**拍照**或**上传照片**的方式，让 AI 识别瑶绣纹样、配色、针法等，实现"以图识绣"功能。

## 2. DeepSeek 图片能力说明

### API 支持情况
```javascript
// DeepSeek V3/R1 支持图片输入（Vision 模式）
{
  "model": "deepseek-chat",  // 或 "deepseek-reasoner"
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "这是什么瑶绣纹样？"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQ..."  // base64 编码
          }
        }
      ]
    }
  ]
}
```

### 限制
- 支持格式：JPEG、PNG、GIF、WebP
- 单张图片大小：最大 20MB
- 建议分辨率：不超过 2048x2048
- 多张图片：一次最多 10 张

## 3. 功能设计

### 3.1 入口设计

在输入框左侧添加图片按钮：

```
┌─────────────────────────────────────────────┐
│ [📷] [💭] 询问瑶绣知识...           [发送]  │
└─────────────────────────────────────────────┘
  ↑
  点击弹出选项：📸 拍照 / 🖼️ 从相册选择
```

### 3.2 交互流程

**拍照流程**：
```
点击相机图标
    ↓
选择"拍照"
    ↓
调用摄像头（getUserMedia）
    ↓
显示取景框（全屏/弹窗）
    ↓
点击拍摄按钮
    ↓
预览照片 + 确认/重拍
    ↓
确认后压缩图片 → 转为 base64
    ↓
插入输入框，显示缩略图
    ↓
用户输入文字或直接发送
    ↓
发送给 DeepSeek API
```

**上传流程**：
```
点击相机图标
    ↓
选择"从相册选择"
    ↓
打开文件选择器（<input type="file" accept="image/*">）
    ↓
选择图片
    ↓
压缩图片 → 转为 base64
    ↓
插入输入框，显示缩略图
    ↓
用户输入文字或直接发送
    ↓
发送给 DeepSeek API
```

### 3.3 UI 组件

#### 图片预览区域
```
输入框上方显示已选图片：
┌─────────────────────────────────────────────┐
│ [🖼️ 缩略图] [x]                             │  ← 可删除
├─────────────────────────────────────────────┤
│ [📷] 这是什么纹样？                  [发送]  │
└─────────────────────────────────────────────┘
```

#### 相机取景框
```
┌─────────────────────────────────────────────┐
│                                             │
│              [取景框]                       │
│                                             │
│              🔲🔲🔲🔲                       │
│              🔲    🔲  ← 对焦框              │
│              🔲🔲🔲🔲                       │
│                                             │
│          [⚪ 拍摄按钮]                      │
│                                             │
└─────────────────────────────────────────────┘
```

## 4. 技术实现

### 4.1 核心 API

```javascript
// 拍照 - getUserMedia
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })

// 文件选择
<input type="file" accept="image/*" capture="environment">

// 图片压缩 - Canvas
canvas.toBlob(callback, 'image/jpeg', 0.8)

// 转 base64
FileReader.readAsDataURL(file)
```

### 4.2 图片压缩逻辑

```javascript
function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // 等比例缩放
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### 4.3 发送到 DeepSeek

```javascript
async function sendWithImage(text, imageBlob) {
  const base64 = await blobToBase64(imageBlob);
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: text || '这是什么瑶绣纹样？' },
          { 
            type: 'image_url', 
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          }
        ]
      }]
    })
  });
}
```

## 5. 系统提示词增强

添加图片识别能力：

```markdown
你是瑶族刺绣知识专家...（原有内容）

【图片识别能力】
当用户上传图片时：
1. 识别是否为瑶族刺绣相关图像
2. 分析纹样类型（八角花、十字挑花、回纹等）
3. 描述配色方案
4. 指出针法特征
5. 如果是服饰，说明是哪个部位（头巾、腰带、袖口等）
6. 如果是非瑶绣图片，礼貌说明无法识别

【识别要点】
- 八角花：几何对称、八边形、中心向外辐射
- 十字挑花：网格状、X形交叉、反面绣正面看
- 黑底红彩：靛蓝底布、红/黄/白/绿线绣
```

## 6. 移动端适配

### iOS Safari
- 需要 `capture` 属性触发相机
- 文件选择需要用户手动选择"拍照"或"照片"

### Android
- 支持直接调用摄像头
- `capture="environment"` 使用后置摄像头

## 7. 安全与隐私

1. **摄像头权限**：首次使用需用户授权
2. **图片处理**：本地压缩，不上传第三方
3. **存储**：临时 base64，页面刷新后清除
4. **提示**：添加"图片仅供识别，不会保存"

## 8. 验收标准

- [ ] 点击相机图标弹出选项
- [ ] 拍照功能正常（移动端）
- [ ] 相册选择功能正常
- [ ] 图片压缩到 1MB 以内
- [ ] 发送后 AI 能识别图片内容
- [ ] 支持同时发送文字+图片
- [ ] 图片预览可删除
- [ ] 无摄像头时优雅降级
