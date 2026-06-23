# Tasks

- [x] Task 1: 合并灵感采集与便签记录为统一模块
  - [x] SubTask 1.1: 创建统一的 `InspirationStickyNote` 数据类型，兼容原有 Inspiration 和 StickyNote 字段
  - [x] SubTask 1.2: 创建新的 `src/modules/inspiration-sticky/` 模块目录，包含 types.ts、store.ts、components.tsx、index.ts
  - [x] SubTask 1.3: 实现 store.ts，合并原有 inspiration 和 sticky 的状态管理与数据库操作，增加 itemType 字段区分灵感/便签
  - [x] SubTask 1.4: 实现 components.tsx，包含统一的灵感便签列表视图，支持按类型筛选、创建灵感、创建便签、编辑、删除等操作
  - [x] SubTask 1.5: 更新 database.ts，新增 inspirationStickyNotes 表，保留旧表用于数据迁移
  - [x] SubTask 1.6: 实现数据迁移逻辑，将原有 stickyNotes 和 inspirations 数据自动迁移至新表
  - [x] SubTask 1.7: 更新 view/types.ts 中的 SidebarTab 类型，将 'sticky' | 'inspiration' 替换为 'inspirationSticky'
  - [x] SubTask 1.8: 更新 view/components.tsx 中 Sidebar 和 Header 的导航项配置
  - [x] SubTask 1.9: 更新 App.tsx 中的模块引用和初始化逻辑
  - [x] SubTask 1.10: 删除旧的 `src/modules/inspiration/` 和 `src/modules/sticky/` 目录

- [x] Task 2: 实现数据存储路径配置
  - [x] SubTask 2.1: 在 electron/main.cjs 中添加 IPC 处理器：获取当前数据路径、选择新路径、迁移数据
  - [x] SubTask 2.2: 修改 Dexie 数据库初始化逻辑，支持通过 Electron IPC 获取自定义路径，在 Electron 环境下使用自定义路径打开数据库
  - [x] SubTask 2.3: 在 settings/types.ts 中新增 `dataStoragePath` 和 `closeToTray` 设置项
  - [x] SubTask 2.4: 在 settings/store.ts 中新增数据路径相关操作方法
  - [x] SubTask 2.5: 在 settings/components.tsx 中新增「数据存储」设置区域，显示当前路径、选择路径按钮、迁移按钮
  - [x] SubTask 2.6: 在 shared/platform.ts 中新增 Electron 平台检测和 IPC 通信封装

- [x] Task 3: 实现桌面端悬浮窗
  - [x] SubTask 3.1: 在 electron/main.cjs 中创建悬浮窗 BrowserWindow，配置为置顶、无边框、半透明、可拖拽
  - [x] SubTask 3.2: 创建悬浮窗专用 HTML 入口和 React 组件 `src/components/FloatingWindow.tsx`
  - [x] SubTask 3.3: 实现悬浮窗收缩态：半透明圆形图标 + 待办数角标，可拖拽定位
  - [x] SubTask 3.4: 实现悬浮窗展开态：快速操作面板，包含新建待办、记录灵感、新建便签三个入口
  - [x] SubTask 3.5: 实现悬浮窗中的精简表单：快速新建待办（标题+优先级+截止日期）、快速记录灵感（内容+来源）、快速新建便签（内容+颜色）
  - [x] SubTask 3.6: 实现悬浮窗与主窗口的 IPC 通信，悬浮窗操作结果同步到主窗口数据
  - [x] SubTask 3.7: 实现全局快捷键注册（默认 Ctrl+Alt+N），唤出/收起悬浮窗
  - [x] SubTask 3.8: 实现主窗口关闭时最小化到系统托盘，悬浮窗保持常驻
  - [x] SubTask 3.9: 在设置面板中新增悬浮窗开关和快捷键配置项

- [x] Task 4: 实现系统级通知提醒
  - [x] SubTask 4.1: 在 electron/main.cjs 中集成 Electron Notification API，实现系统通知发送
  - [x] SubTask 4.2: 添加 IPC 处理器：发送通知、请求通知权限、获取权限状态
  - [x] SubTask 4.3: 修改 notification/store.ts，在 Electron 环境下通过 IPC 发送系统通知而非仅应用内弹窗
  - [x] SubTask 4.4: 实现通知点击回调，激活主窗口并定位到对应任务
  - [x] SubTask 4.5: 实现持续强提醒的定时重发逻辑（每 5 分钟重发一次直到确认）
  - [x] SubTask 4.6: 修改 notification/components.tsx，在 Electron 环境下隐藏应用内弹窗（由系统通知替代），非 Electron 环境保留原有弹窗
  - [x] SubTask 4.7: 在设置面板中新增通知权限状态显示和请求权限按钮

# Task Dependencies
- [Task 2] 依赖 [Task 1]（数据迁移逻辑需要在新模块结构完成后才能正确实现路径切换时的数据迁移）
- [Task 3] 依赖 [Task 1]（悬浮窗的快速操作需要使用合并后的灵感便签模块）
- [Task 4] 独立，可与 Task 2、Task 3 并行开发
- [Task 1] 无前置依赖，应首先完成
