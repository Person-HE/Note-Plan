# Checklist

## 灵感便签合并
- [x] 新的 `inspiration-sticky` 模块包含 types.ts、store.ts、components.tsx、index.ts 四个文件
- [x] `InspirationStickyNote` 类型包含 itemType 字段区分灵感/便签，兼容原有字段
- [x] store.ts 实现了完整的 CRUD 操作，支持按类型筛选
- [x] components.tsx 包含统一列表视图，支持灵感/便签类型切换筛选
- [x] database.ts 新增 inspirationStickyNotes 表定义
- [x] 数据迁移逻辑能将原有 stickyNotes 和 inspirations 数据正确迁移至新表
- [x] SidebarTab 类型已更新，'sticky' | 'inspiration' 替换为 'inspirationSticky'
- [x] 侧边栏和 Header 导航项已更新为「灵感便签」
- [x] App.tsx 中不再引用旧的 inspiration 和 sticky 模块
- [x] 旧的 `src/modules/inspiration/` 和 `src/modules/sticky/` 目录已删除

## 数据存储路径配置
- [x] electron/main.cjs 中实现了获取当前路径、选择新路径、迁移数据的 IPC 处理器
- [ ] Dexie 数据库初始化支持自定义路径（Electron 环境）— **未通过**：database.ts 仍使用 `super('NotePlanDB')` 无自定义路径参数；`data:migrate` 处理器已改为复制 `IndexedDB` 目录（非 `note-plan.db`），但 Dexie/IndexedDB 在 Electron 中始终存储在 Chromium userData 目录，无法通过参数指定路径，迁移后需重启应用并修改 `--user-data-dir` 启动参数才能真正生效
- [x] settings/types.ts 新增 dataStoragePath 和 closeToTray 设置项
- [x] settings/store.ts 新增数据路径相关操作方法
- [x] 设置面板显示当前数据存储路径，支持选择新路径
- [x] 选择无效路径时显示错误提示，保留原路径不变
- [x] shared/platform.ts 新增 Electron 平台检测和 IPC 通信封装

## 桌面端悬浮窗
- [x] electron/main.cjs 创建了悬浮窗 BrowserWindow，配置为置顶、无边框、半透明
- [x] 悬浮窗收缩态显示半透明圆形图标和待办数角标
- [x] 悬浮窗展开态提供新建待办、记录灵感、新建便签三个快速入口
- [x] 快速新建待办表单包含标题、优先级、截止日期字段
- [x] 快速记录灵感表单包含内容、来源字段
- [x] 快速新建便签表单包含内容、颜色字段
- [x] 悬浮窗操作结果通过 IPC 同步到主窗口数据 — FloatingWindow.tsx 操作后调用 notifyDataChanged()，main.cjs 转发 data:changed 事件，App.tsx 通过 onDataChanged 监听器刷新对应 store
- [x] 全局快捷键（Ctrl+Alt+N）可唤出/收起悬浮窗
- [x] 主窗口关闭时最小化到系统托盘，悬浮窗保持常驻
- [x] 设置面板包含悬浮窗开关和快捷键配置项

## 系统级通知提醒
- [x] electron/main.cjs 集成了 Electron Notification API
- [x] 实现了发送通知、请求权限、获取权限状态的 IPC 处理器
- [x] notification/store.ts 在 Electron 环境下通过 IPC 发送系统通知
- [x] 通知点击后激活主窗口并定位到对应任务 — main.cjs 通知点击后发送 notification:clicked 事件（含 taskId），App.tsx 通过 onNotificationClicked 监听器设置 selectedTaskId 并切换到 today tab
- [x] 持续强提醒每 5 分钟重发一次系统通知直到用户确认
- [x] Electron 环境下隐藏应用内弹窗，非 Electron 环境保留原有弹窗
- [x] 设置面板显示通知权限状态和请求权限按钮
- [x] 勿扰模式下非紧急任务不发送系统通知 — allowUrgent=false 时阻止所有通知，allowUrgent=true 时仅放行 urgent/high 优先级任务（store.ts triggerReminder 和 checkDueReminders 均有优先级过滤）

## 整体验证
- [x] 应用能正常启动，无 TypeScript 编译错误
- [ ] 所有原有功能（待办管理、知识库、日历、统计等）正常工作 — 需运行时验证
