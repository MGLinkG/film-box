# MovieFinder (CineGrabber)

> 🎬 一款基于 Electron + React 构建的桌面端在线影视资源检索与下载工具。

## ✨ 核心功能

- **全网影视检索**：聚合特定站点的海量影视资源，支持多维度（分类、地区、年份、类型等）无缝筛选与检索。
- **原生 M3U8 无损下载**：内置智能的 M3U8 视频流解析器，能够穿透网页在线播放器，自动获取 HLS/M3U8 播放列表。
- **AES-128 自动解密**：支持在线视频加密分片的实时内存解密，将成百上千个视频碎片无损合并下载为标准的 `.mp4` 格式。
- **一键下载全集**：支持一键将整部剧集加入下载队列，多任务并发下载。
- **下载管理中心**：可视化的下载进度管理，支持下载分组、暂停、继续、取消等操作，自动清除残留文件。
- **我的收藏**：支持一键收藏喜爱的影视资源，持久化保存，精美卡片式展示。
- **纯净体验**：基于 `Electron-Vite`，界面采用 `Tailwind CSS` 与 `Framer Motion`，极简无广、沉浸式追剧体验。

## 🚀 技术栈

- **桌面端框架**：[Electron](https://www.electronjs.org/)
- **前端框架**：[React](https://reactjs.org/) (TypeScript)
- **构建工具**：[Electron-Vite](https://electron-vite.org/)
- **UI 样式**：[Tailwind CSS](https://tailwindcss.com/)
- **爬虫/解析**：`axios`, `cheerio`, `m3u8-parser`

## 🛠️ 安装与运行

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/movie-finder.git
cd movie-finder
```

### 2. 安装依赖

```bash
npm install
```

### 3. 本地开发调试

```bash
npm run dev
```

### 4. 构建打包

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 🪟 Windows 一键配置 + 打包（推荐）

在 Windows 上拉取代码后（无需提前安装 Node），直接：

- 双击运行 [setup-win.cmd](scripts/setup-win.cmd)
- 或在 PowerShell 中执行：

```powershell
npm run setup:win
```

脚本会自动安装/升级到 Node.js LTS（优先用 winget；若没有 winget 会自动下载官方 MSI 安装包），并设置 Electron 镜像加速后完成 Windows 安装包构建。

## ⚠️ 免责声明 (Disclaimer)

**本项目及相关代码仅供个人学习、技术研究与编程练习使用。**

1. **资源版权**：本项目本身不存储、不发布、不提供任何视频资源，所有数据均来自互联网公开网页的实时抓取。视频版权归原权利人所有。
2. **禁止商业与非法用途**：严禁将本项目用于任何商业牟利、非法传播、侵权盗版或其他违反当地法律法规的活动。
3. **免责条款**：使用者下载、运行或二次开发本项目即表示您已同意：**因使用本项目所产生的一切直接或间接的法律责任、版权纠纷及其他后果，均由使用者本人独立承担，项目原作者不承担任何责任。**
4. 若本项目在无意中侵犯了您的合法权益，请提交 Issue，我们将在核实后尽快删除相关功能代码。

## 📄 开源协议 (License)

本项目基于 [MIT License](LICENSE) 协议开源。

您可以在遵守上述免责声明的前提下，自由地使用、修改和分发本项目的源代码。但请注意，开源协议并不意味着授予您利用本项目从事任何违法、侵权或商业牟利活动的权利。

---
*Created for personal learning and open-source sharing.*
