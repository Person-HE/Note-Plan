# Note-Plan

> 本地优先的笔记 / 待办 / 灵感桌面应用：Web + Electron + Capacitor 多端同一套代码。

数据默认存在浏览器 **IndexedDB（Dexie）**，不依赖账号与云后端；可选 Electron 打包为 Windows 桌面应用。

**在线演示**：Cloudflare Pages（构建产物为静态 SPA）

---

## 功能

| 模块 | 能力 |
|------|------|
| 笔记 | TipTap 富文本、表格、任务列表、高亮、链接、图片 |
| 任务 | 待办清单、优先级、截止提醒 |
| 统计 | 使用与完成度概览 |
| 灵感便签 | 快速捕捉想法 |
| 桌宠 | 轻量陪伴交互 |
| 通知 | 本地提醒 |
| 设置 | 主题 / 偏好 |
| AI | 可配置服务（需自备 API Key） |
| 同步 | 本地数据导出/导入能力 |

## 技术栈

- React 18 + TypeScript + Vite 5 + Tailwind
- 状态：Zustand；持久化：Dexie / IndexedDB
- PWA：`vite-plugin-pwa`（可安装到桌面）
- 多端：Capacitor（Android / iOS / Electron）
- 桌面：`electron-builder`（NSIS）

## 快速开始

```bash
# Node 18+
npm ci
npm run dev          # 开发服务器
npm run typecheck    # tsc --noEmit
npm run build        # tsc -b && vite build → dist/
npm run preview

# Electron
npm run electron:dev
npm run electron:build:win

# Capacitor
npm run build:web
npx cap sync android   # 需本地 Android SDK
```

## 目录

```
src/
├── core/           # database (Dexie) / storage / platform
├── modules/
│   ├── note/       # 富文本笔记
│   ├── task/       # 待办
│   ├── statistics/ # 统计
│   ├── inspiration-sticky/
│   ├── pet/        # 桌宠
│   ├── notification/
│   ├── ai/
│   ├── settings/
│   ├── sync/
│   └── view/
├── shared/
└── App.tsx
electron/           # 主进程 / preload / 图标
scripts/            # 图标生成、截图
```

## 量化数据（可复现）

采集环境：**Windows 11 · Node.js v24.12.0 · npm 11.6.2**  
采集日期：**2026-09-17**  
复现命令：

```bash
npm ci
npm run typecheck
npm run build
Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum
```

| 指标 | 数值 |
|------|------|
| TypeScript typecheck | **0 error** |
| `vite build`（含 tsc -b）总耗时 | **48.6 s**（vite 本体 18.2 s） |
| 转换模块数 | 2472 |
| `dist/` 文件数 | 34 |
| `dist/` 总体积 | **3.18 MB** |
| 最大 JS | TipTap vendor **515.2 KB**（gzip 164.0 KB） |
| 主业务 JS | `index` **291.2 KB**（gzip 84.9 KB） |
| PWA precache | 36 条目 · 约 3.15 MiB |

## 部署到 Cloudflare Pages

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name=note-plan --branch=main
```

| 项 | 值 |
|----|----|
| Build command | `npm run build` |
| Output directory | `dist` |
| SPA fallback | `/* /index.html 200` |

## 数据与隐私

- 默认**纯本地**：笔记与任务写入 IndexedDB，不上传服务器。
- Electron 用户数据目录（Windows 下常见 `Data/`）**不进版本库**。
- 导出/备份请使用应用内功能或手动备份浏览器存储。

## License

见仓库 `LICENSE`。
