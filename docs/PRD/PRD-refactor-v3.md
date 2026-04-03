# 瑶绣·智问 v3.0 重构需求文档

## 1. 深度思考板块重构

### 参考 DeepSeek 官方设计
```
┌─────────────────────────────────────────┐
│ 🤔 已思考 3 秒                [展开 ▼]   │  ← 可点击展开/收起
├─────────────────────────────────────────┤
│ 嗯...我需要分析这个八角花纹样的结构。     │  ← 思考过程内容
│ 首先，八角花是瑶族最具代表性的纹样...     │
│ 从几何角度来看，它由中心向外辐射...       │
├─────────────────────────────────────────┤
│ 正式回答内容...                          │  ← 虚线分隔
│                                          │
│ 八角花纹样象征太阳和生命...               │
└─────────────────────────────────────────┘
```

### 交互要求
- 思考过程默认收起，显示"🤔 思考中..."或"🤔 已思考 X 秒"
- 点击可展开/收起，带旋转箭头动画
- 思考过程背景色与正式回答区分（浅黄/灰色）
- 思考完成后的正式回答带虚线分隔
- 支持实时流式显示思考内容

---

## 2. 图片识别板块重构（DeepSeek Vision）

### 识别流程
```
用户上传图片
    ↓
显示原图预览
    ↓
调用 DeepSeek Vision API 分析：
    - 纹样类型识别
    - 配色分析
    - 针法判断
    - 部位定位
    - 文字识别（如有）
    ↓
显示结构化结果卡片：
┌─────────────────────────────────────┐
│ [图片预览]                          │
├─────────────────────────────────────┤
│ 📋 识别结果                         │
│ • 纹样类型：八角花纹样（置信度 95%）│
│ • 配色方案：黑底红彩                │
│ • 针法：十字挑花                    │
│ • 部位：头巾                        │
│ • 识别文字："福"、"寿"（如有）      │
├─────────────────────────────────────┤
│ 💬 您想进一步了解什么？              │
│ [纹样寓意] [针法步骤] [配色原理]    │
└─────────────────────────────────────┘
```

### DeepSeek Vision API 调用
```javascript
{
  "model": "deepseek-chat",
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "请分析这张瑶绣图片，输出JSON格式：{pattern_type, confidence, color_scheme, technique, position, description, ocr_text[]}"
      },
      {
        "type": "image_url",
        "image_url": {"url": "data:image/jpeg;base64,xxx"}
      }
    ]
  }]
}
```

### 系统提示词
```
你是瑶族刺绣图像识别专家。请分析用户上传的图片：

1. 识别是否为瑶族刺绣
2. 判断纹样类型：八角花、十字挑花、回纹、水波纹、云纹等
3. 分析配色：黑底红彩、蓝靛底、其他
4. 识别针法：十字挑花、平绣、锁边、缠绣等
5. 判断部位：头巾、腰带、袖口、裤脚、背篓带、围裙等
6. 如有文字，识别文字内容

输出严格JSON格式：
{
  "is_embroidery": true/false,
  "pattern_type": "纹样名称",
  "confidence": 0.95,
  "color_scheme": "配色描述",
  "technique": "针法",
  "position": "服饰部位",
  "description": "详细描述",
  "ocr_text": ["识别到的文字"]
}
```

---

## 3. 知识图谱完全重构

### 保持的动画效果
1. **悬停**：节点放大 1.15 倍，金色描边发光
2. **点击**：
   - 缩小蓄力（0.85 倍）
   - 白色波纹扩散（3 层）
   - 其他节点向四周退避
   - 连线淡化消失
   - 节点沿贝塞尔曲线飞向右下角
   - 飞行中圆形→椭圆→气泡变形
   - 到达后弹跳效果
3. **拖拽**：鼠标拖动平移图谱
4. **缩放**：滚轮以鼠标为中心缩放

### 新架构（Class 封装）
```javascript
class KnowledgeGraph {
  constructor(containerId, data)
  
  // 渲染
  render()
  renderNodes()
  renderLines()
  
  // 交互
  bindEvents()
  onMouseDown(e)
  onMouseMove(e)
  onMouseUp(e)
  onWheel(e)
  
  // 动画
  animateHover(node)
  animateClick(node)
  animateFlyToChat(node, targetX, targetY)
  scatterOtherNodes(clickedNode)
  fadeLines()
  createRipple(x, y)
  
  // 变换
  pan(deltaX, deltaY)
  zoom(centerX, centerY, scaleFactor)
  reset()
  
  // 节点点击处理
  onNodeClick(node, e)
}
```

### 性能优化
- requestAnimationFrame 动画循环
- will-change 属性启用 GPU 加速
- 事件委托减少监听器数量
- 防抖节流优化高频事件

---

## 4. 实现优先级

1. **深度思考板块** - 影响现有功能体验
2. **图片识别增强** - 新功能增值
3. **知识图谱重构** - 代码质量优化
