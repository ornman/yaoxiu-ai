# 小瑶刺绣 AI 项目配置

## 🎯 项目概述

- **项目名称**: 小瑶刺绣 AI 问答系统
- **技术栈**: HTML + JavaScript + Cloudflare Worker
- **部署平台**: 
  - 前端: Vercel (自动部署)
  - 后端: Cloudflare Workers
- **当前版本**: v2.0.0

---

## 📋 开发规范

### Git 规范 (强制)

#### 1. 提交信息必须用中文
```bash
# ✅ 正确示例
git commit -m "feat: 添加盲盒系统功能"
git commit -m "fix: 修复登录按钮无法点击的问题"
git commit -m "docs: 更新部署文档"

# ❌ 错误示例
git commit -m "add blind box feature"
git commit -m "fix login bug"
```

#### 2. 提交类型前缀
| 类型 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修复 bug |
| `docs:` | 文档更新 |
| `style:` | 样式调整（不影响功能） |
| `refactor:` | 代码重构 |
| `chore:` | 杂项/配置变更 |
| `config:` | 配置修改 |
| `test:` | 测试相关 |

#### 3. 常用 Git 指令
```powershell
# 查看状态
git status

# 查看分支
git branch -a

# 切换分支
git checkout 分支名

# 创建并切换到新分支
git checkout -b 新分支名

# 添加文件
git add 文件名
git add -A  # 添加所有

# 提交（必须用中文）
git commit -m "类型: 中文描述"

# 推送到远程
git push origin 分支名
git push -f origin 分支名  # 强制推送（慎用）

# 拉取更新
git pull origin 分支名

# 查看提交历史
git log --oneline -10

# 查看所有分支的提交图
git log --all --oneline --graph --decorate -20

# 查看标签
git tag -l

# 创建标签
git tag -a v1.0.0 -m "版本 1.0.0 发布"

# 删除标签
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 回滚到指定版本
git reset --hard 提交哈希
git push -f origin master

# 暂存当前更改
git stash

# 恢复暂存
git stash pop
```

---

## 🚀 部署流程

### 1. Cloudflare Worker 部署

#### 方式一：使用 Wrangler 命令行
```powershell
# 设置环境变量（已保存到 .env 文件）
$env:CLOUDFLARE_API_TOKEN="cfut_EgZRwdtXs1zxVvfUixPShNtTvOrOrIQwU44H68OVc9ef079c"

# 部署 Worker
wrangler deploy

# 查看部署状态
wrangler tail
```

#### 方式二：使用部署脚本
```powershell
# 仅部署 Worker
powershell -ExecutionPolicy Bypass -File deploy.ps1 -Worker

# 部署全部（Worker + GitHub）
powershell -ExecutionPolicy Bypass -File deploy.ps1 -All
```

### 2. Vercel 前端部署
```powershell
# 推送代码到 GitHub，Vercel 会自动部署
git add -A
git commit -m "deploy: 上线新版本"
git push origin master
```

### 3. 完整上线流程
```powershell
# 步骤 1: 确认当前分支和版本
git branch
git log --oneline -3

# 步骤 2: 提交代码
git add -A
git commit -m "deploy: 上线 v2.0.0 版本"

# 步骤 3: 推送 GitHub（触发 Vercel 自动部署）
git push origin master

# 步骤 4: 部署 Cloudflare Worker
$env:CLOUDFLARE_API_TOKEN="cfut_EgZRwdtXs1zxVvfUixPShNtTvOrOrIQwU44H68OVc9ef079c"
wrangler deploy

# 步骤 5: 验证部署
# 前端: https://yaoxiu-ai.vercel.app
# API: https://yaoembroidery-api.kdy233.workers.dev
```

---

## 📝 PowerShell 常用指令

### 文件操作
```powershell
# 查看当前目录
Get-Location
pwd

# 列出文件
ls
Get-ChildItem

# 切换目录
cd 目录名

# 创建目录
mkdir 目录名

# 查看文件内容
cat 文件名.txt
Get-Content 文件名.txt

# 写入文件
Set-Content 文件名.txt "内容"
Add-Content 文件名.txt "追加内容"

# 删除文件
Remove-Item 文件名

# 复制文件
Copy-Item 源文件 目标文件

# 移动文件
Move-Item 源文件 目标路径
```

### 环境变量
```powershell
# 设置临时环境变量（仅当前窗口有效）
$env:变量名="值"

# 查看环境变量
$env:变量名

# 示例
$env:CLOUDFLARE_API_TOKEN="你的token"
```

### 执行脚本
```powershell
# 执行 PowerShell 脚本
powershell -ExecutionPolicy Bypass -File 脚本名.ps1

# 示例
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

---

## 🌿 分支管理

### 当前分支
| 分支 | 用途 | 当前版本 |
|------|------|---------|
| `master` | 主分支，生产环境 | v2.0.0 |
| `v2.0.0new` | v2.0.0 稳定版 | v2.0.0 |
| `origin/v2.0.0-dev` | 远程开发分支 | v2.1.0 |

### 切换版本指令
```powershell
# 切换到 v2.0.0 稳定版
git checkout v2.0.0new
git checkout -b master
git push -f origin master

# 切换到 v2.1.0 开发版
git checkout remotes/origin/v2.0.0-dev -b temp
git checkout master
git reset --hard temp
git push -f origin master
```

---

## 🔧 项目配置

### 重要文件
| 文件 | 用途 |
|------|------|
| `index.html` | 前端主页面 |
| `worker.js` | Cloudflare Worker 后端 |
| `wrangler.toml` | Wrangler 配置文件 |
| `deploy.ps1` | 部署脚本 |
| `.env` | 环境变量（API Token） |
| `AGENTS.md` | 本文件（项目配置） |

### API 地址
- **生产环境**: https://yaoembroidery-api.kdy233.workers.dev
- **自定义域名**: https://api.yaoxiumax.top
- **前端地址**: https://yaoxiu-ai.vercel.app

---

## ⚠️ 注意事项

1. **Git 提交必须用中文**
2. **不要提交敏感信息**（.env 已添加到 .gitignore）
3. **强制推送需谨慎**（会覆盖远程历史）
4. **部署前确认当前分支**

---

## 📞 常用快捷指令

```powershell
# 快速部署 Worker
$env:CLOUDFLARE_API_TOKEN="cfut_EgZRwdtXs1zxVvfUixPShNtTvOrOrIQwU44H68OVc9ef079c"; wrangler deploy

# 快速提交并推送
git add -A; git commit -m "update: 更新内容"; git push origin master

# 查看所有分支状态
git branch -a; git log --all --oneline --graph --decorate -10
```

---

*最后更新: 2026-04-06*
*版本: v2.0.0*
