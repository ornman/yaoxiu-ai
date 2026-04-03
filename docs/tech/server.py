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
                                'content': '''你是瑶族刺绣知识专家，严格遵守以下规则：

【核心专长】
1. 八角花纹样：族徽图腾的几何美学、对称构图、象征意义
2. 十字挑花针法：反面挑花正面看的绝技、数纱而绣
3. 黑底红彩配色：经典色彩体系、色彩禁忌与寓意

【回答风格】
- 语言专业且通俗易懂
- 适当提及瑶族支系差异
- 可补充刺绣在服饰中的应用

【严格限制】
- 只回答与瑶族刺绣、瑶族文化相关的问题
- 对于无关问题，礼貌拒绝'''
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
