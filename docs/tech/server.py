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

PORT = 8080
DEEPSEEK_API_KEY = "sk-3144bf0982b34c758559f05e340cc0bf"  # 修改为你的 Key

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
- 直接回答用户问题，保持对话连贯性
- 禁止用"手指轻抚绣片""看着这些纹路"等诗意动作描写作为开头
- 第一句必须直接输出知识内容，不要铺垫'''
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
