# 小瑶刺绣AI - 一键部署脚本 (PowerShell)
# 注意：此脚本使用 PowerShell 语法，不使用 && 连接符

param(
    [switch]$Worker,
    [switch]$Frontend,
    [switch]$All
)

$PROJECT_DIR = "E:\桌面\瑶web aichat"
$WORKER_NAME = "yaoembroidery-api"
$GITHUB_REPO = "https://github.com/kdy233/yaoxiu-ai.git"

# 加载 .env 文件中的环境变量
$envFile = Join-Path $PROJECT_DIR ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]*)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "已加载环境变量: $name" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "警告: 未找到 .env 文件" -ForegroundColor Yellow
}

Write-Host "🧵 小瑶刺绣AI 部署脚本" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# 如果没有指定参数，默认部署全部
if (-not $Worker -and -not $Frontend -and -not $All) {
    $All = $true
}

# 部署 Worker
if ($Worker -or $All) {
    Write-Host "`n[1/3] 正在部署 Worker 到 Cloudflare..." -ForegroundColor Yellow
    
    Set-Location $PROJECT_DIR
    
    # 检查 wrangler 是否安装
    try {
        $wranglerVersion = wrangler --version
        Write-Host "✓ Wrangler 已安装: $wranglerVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Wrangler 未安装，请先安装: npm install -g wrangler" -ForegroundColor Red
        exit 1
    }
    
    # 检查 API Token
    if (-not $env:CLOUDFLARE_API_TOKEN) {
        Write-Host "⚠ 未设置 CLOUDFLARE_API_TOKEN 环境变量" -ForegroundColor Yellow
        Write-Host "请设置: $env:CLOUDFLARE_API_TOKEN='你的token'" -ForegroundColor Yellow
        exit 1
    }
    
    # 部署 Worker
    Write-Host "正在部署 Worker: $WORKER_NAME..." -ForegroundColor Yellow
    wrangler deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Worker 部署成功!" -ForegroundColor Green
    } else {
        Write-Host "✗ Worker 部署失败" -ForegroundColor Red
        exit 1
    }
}

# 提交代码到 GitHub
if ($Frontend -or $All) {
    Write-Host "`n[2/3] 正在提交代码到 GitHub..." -ForegroundColor Yellow
    
    Set-Location $PROJECT_DIR
    
    # 检查 git 状态
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "发现未提交的更改，正在提交..." -ForegroundColor Yellow
        
        # 添加所有更改
        git add -A
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ git add 失败" -ForegroundColor Red
            exit 1
        }
        
        # 提交
        $commitMessage = "v2.1.0: 消息编辑功能 + 绣谱系统 + 调试工具"
        git commit -m $commitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ git commit 失败" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✓ 代码已提交" -ForegroundColor Green
    } else {
        Write-Host "✓ 没有需要提交的更改" -ForegroundColor Green
    }
    
    # 推送到 GitHub
    Write-Host "正在推送到 GitHub..." -ForegroundColor Yellow
    git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 代码已推送到 GitHub" -ForegroundColor Green
        Write-Host "✓ Vercel 将自动部署前端" -ForegroundColor Green
    } else {
        Write-Host "✗ git push 失败" -ForegroundColor Red
        exit 1
    }
}

# 显示部署信息
Write-Host "`n[3/3] 部署状态" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "前端地址: https://yaoxiu-ai.vercel.app" -ForegroundColor White
Write-Host "Worker地址: https://yaoembroidery-api.kdy233.workers.dev" -ForegroundColor White
Write-Host "自定义域名: https://api.yaoxiumax.top" -ForegroundColor White
Write-Host "`n调试工具开启方法:" -ForegroundColor Yellow
Write-Host "  1. 打开设置面板" -ForegroundColor Gray
Write-Host "  2. 2秒内连续点击设置按钮5次" -ForegroundColor Gray
Write-Host "  3. 或按 Ctrl+Shift+D" -ForegroundColor Gray
Write-Host "`n✅ 部署完成!" -ForegroundColor Green

Set-Location $PROJECT_DIR
