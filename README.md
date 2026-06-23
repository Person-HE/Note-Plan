# Note-Plan

多功能笔记计划应用 - 集成AI助手、任务管理、知识管理等功能

## 项目简介

Note-Plan 是一款现代化的多功能笔记与计划管理应用，采用 React + TypeScript 技术栈，支持多平台运行（Web、Desktop、Android、iOS）。

### 核心特性

- **AI智能助手** - 集成AI能力，提供智能辅助
- **富文本编辑** - 基于Tiptap的专业编辑器，支持表格、任务列表、高亮等多种格式
- **任务管理** - 完善的待办事项管理功能
- **知识管理** - 知识库功能，高效组织和管理知识
- **灵感便签** - 快速记录灵感和想法
- **数据统计** - 详细的使用统计和分析
- **多端同步** - 数据跨设备同步
- **安全防护** - 敏感信息加密保护
- **虚拟宠物** - 内置养成小游戏

### 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **状态管理**: Zustand
- **数据库**: Dexie (IndexedDB)
- **富文本编辑器**: Tiptap
- **移动端封装**: Capacitor
- **桌面端**: Electron
- **样式**: Tailwind CSS
- **图标**: Lucide React

## 项目结构

```
Note-Plan/
├── src/                    # 源代码
│   ├── core/               # 核心模块
│   │   ├── database.ts     # 数据库管理
│   │   ├── event-bus.ts    # 事件总线
│   │   ├── storage.ts      # 存储管理
│   │   └── module-registry.ts  # 模块注册
│   ├── modules/            # 功能模块
│   │   ├── ai/             # AI助手
│   │   ├── attachment/     # 附件管理
│   │   ├── collaboration/  # 协作功能
│   │   ├── inspiration-sticky/  # 灵感便签
│   │   ├── note/           # 笔记管理
│   │   ├── notification/   # 通知系统
│   │   ├── pet/            # 虚拟宠物
│   │   ├── security/       # 安全加密
│   │   ├── settings/       # 设置
│   │   ├── statistics/     # 数据统计
│   │   ├── sync/           # 数据同步
│   │   ├── task/           # 任务管理
│   │   └── view/           # 视图管理
│   ├── shared/             # 共享组件和工具
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── Icons.tsx       # 图标组件
│   │   └── utils.ts        # 工具函数
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 入口文件
├── electron/               # Electron桌面端配置
├── android/                # Android原生配置
├── ios/                    # iOS原生配置
├── resources/              # 资源文件（视频、截图等）
├── package.json            # 项目配置
└── vite.config.ts          # Vite配置
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

启动Web开发服务器：

```bash
npm run dev
```

### 构建

构建Web版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

### 移动端构建

同步Capacitor配置并打开Android Studio：

```bash
npm run cap:open:android
```

同步Capacitor配置并打开Xcode：

```bash
npm run cap:open:ios
```

### 桌面端构建

构建Electron桌面应用（Windows）：

```bash
npm run electron:build:win
```

构建Electron桌面应用（macOS）：

```bash
npm run electron:build:mac
```

构建Electron桌面应用（Linux）：

```bash
npm run electron:build:linux
```

## 类型检查

```bash
npm run typecheck
```

## 代码规范

本项目使用以下工具和配置：

- **TypeScript** - 类型检查
- **Vite** - 构建工具
- **Tailwind CSS** - 原子化CSS框架
- **PostCSS** - CSS后处理器

## 发布说明

### Windows安装包

- 位置：`release/Note-Plan Setup 1.0.0.exe`
- 格式：NSIS安装包
- 支持：Windows 10/11

### Android安装包

- 位置：`release/android/Note-Plan-1.0.0.apk`
- 格式：APK
- 支持：Android 8.0+

## 资源文件

### 演示视频

- `resources/便签灵感功能.mp4` - 灵感便签功能演示
- `resources/待办功能.mp4` - 任务管理功能演示
- `resources/数据统计功能.mp4` - 数据统计功能演示
- `resources/知识库.mp4` - 知识库功能演示

### 应用截图

截图文件位于 `resources/` 目录下，展示各个功能界面的实际效果。

## 架构文档

- `项目实现架构.txt` - 项目整体架构说明
- `分析.txt` - 技术分析文档

## 许可证

MIT License

## 联系方式

- Gitee: https://gitee.com/hhx-git
- 邮箱: hhx@gitee.com
