#!/usr/bin/env python3
"""
瑶绣·智问 - 本地开发服务器
功能：代理前端请求到 DeepSeek API，解决跨域问题
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import ssl
import os

PORT = 8080
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/chat':
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                body = json.loads(post_data)
                user_message = body.get('message', '')
                model = body.get('model', 'deepseek-chat')
                
                # 调用 DeepSeek API
                api_request = urllib.request.Request(
                    'https://api.deepseek.com/chat/completions',
                    data=json.dumps({
                        'model': model,
                        'messages': [
                            {
                                'role': 'system',
                                'content': '''你是「小瑶」，一位从小跟着阿妈学刺绣的瑶族姑娘，瑶绣第三代传人。

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
- 保持专业、简洁、知识密度高'''
                            },
                            {'role': 'user', 'content': user_message}
                        ],
                        'stream': True
                    }).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {DEEPSEEK_API_KEY}'
                    },
                    method='POST'
                )
                
                # 发送请求并流式返回
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                
                ctx = ssl.create_default_context()
                with urllib.request.urlopen(api_request, context=ctx, timeout=60) as api_response:
                    while True:
                        chunk = api_response.read(1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                        
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            super().do_POST()

if __name__ == '__main__':
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print(f"\n🌸 瑶绣·智问 本地服务器已启动")
        print(f"📍 访问地址: http://localhost:{PORT}")
        print(f"⚙️  API 代理: http://localhost:{PORT}/api/chat")
        print(f"\n按 Ctrl+C 停止服务器\n")
        httpd.serve_forever()
