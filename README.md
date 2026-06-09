# 💰 今日工资实时计算器

打工人专属的移动端 PWA 应用 —— 每秒刷新，实时看到今天赚了多少钱。

## ✨ 功能

- ⏰ **实时时钟** —— 每秒刷新当前时间
- 📊 **工作进度条** —— 直观显示今日打工进度
- 💵 **实时工资** —— 按秒计算，看着钱一点点涨
- 🏁 **下班倒计时** —— 精确到秒，期待下班一刻
- 🌙 **智能状态** —— 未上班 / 打工中 / 已完成 三种状态
- 💾 **本地存储** —— 设置保存在浏览器 localStorage
- 📱 **PWA 支持** —— 可添加到手机桌面，像原生 App 一样使用
- 🎨 **治愈系设计** —— 淡粉 + 淡蓝配色，打工人专属暖心风格
- 🌓 **暗色模式** —— 自动适配系统深色模式
- 📡 **离线可用** —— Service Worker 缓存，没网也能打开

## 🚀 本地预览

在项目目录下启动一个本地服务器即可（因为 PWA 的 Service Worker 需要 HTTPS 或 localhost）：

### 方法一：Python（推荐，最简单）

```bash
cd salary-calculator
python3 -m http.server 8080
```

然后在浏览器打开 `http://localhost:8080`

### 方法二：Node.js

```bash
cd salary-calculator
npx serve .
```

### 方法三：直接用浏览器打开

双击 `index.html` 也可以打开（但 PWA 功能受限，Service Worker 无法注册）。

## 🖼️ 生成 PWA 图标

在部署前需要生成 PWA 图标：

1. 用浏览器打开 `generate-icons.html`
2. 点击「一键生成并下载所有图标」按钮
3. 将下载的 `icon-192.png` 和 `icon-512.png` 放到项目根目录

## 📦 部署到 Vercel

### 方法一：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录下运行
cd salary-calculator
vercel

# 按提示操作即可，Vercel 会自动识别为静态站点
```

### 方法二：Vercel 网页端

1. 将项目推送到 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com) 登录
3. 点击「New Project」→ 导入 GitHub 仓库
4. 框架预设选择「Other」或留空（纯静态站点）
5. 直接点击「Deploy」

### 方法三：Vercel 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## 📦 部署到 Netlify

### 方法一：Netlify CLI

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 在项目目录下运行
cd salary-calculator
netlify deploy --prod --dir=.
```

### 方法二：Netlify 网页端

1. 将项目推送到 GitHub 仓库
2. 打开 [netlify.com](https://netlify.com) 登录
3. 点击「Add new site」→「Import an existing project」
4. 选择 GitHub 仓库
5. 发布目录留空或填 `.`
6. 点击「Deploy site」

### 方法三：Netlify 拖拽部署

1. 打开 [app.netlify.com/drop](https://app.netlify.com/drop)
2. 将整个 `salary-calculator` 文件夹拖入页面
3. 自动完成部署

## 📱 iPhone 添加到主屏幕

部署完成后（获得一个 HTTPS 网址），按以下步骤操作：

1. 用 **Safari** 浏览器打开你的网址
2. 点击底部工具栏中间的 **分享按钮** （⬆ 图标）
3. 向下滑动找到 **「添加到主屏幕」** （Add to Home Screen）
4. 确认应用名称（可修改），点击右上角 **「添加」**
5. 回到桌面，即可看到图标，点击打开就像原生 App

> ⚠️ 必须用 Safari 打开才能添加，微信/Chrome 等不支持此功能。
> ⚠️ 网址必须是 HTTPS（Vercel / Netlify 自动提供）。

## 🛠️ 技术栈

- 纯 HTML + CSS + JavaScript，零依赖
- PWA：Manifest + Service Worker
- localStorage 持久化设置
- CSS 动画 + 渐变 + 毛玻璃效果

## 📁 项目结构

```
salary-calculator/
├── index.html              # 主页面
├── style.css               # 样式（含暗色模式）
├── script.js               # 核心逻辑
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker（离线缓存）
├── generate-icons.html     # 图标生成工具
├── icon-192.png            # PWA 图标 192×192
├── icon-512.png            # PWA 图标 512×512
└── README.md               # 本文件
```
