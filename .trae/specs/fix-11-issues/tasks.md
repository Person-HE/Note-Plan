# Tasks

- [x] Task 1: 修复今日待办页面 — 仅显示当天到期任务和重要任务
  - [x] SubTask 1.1: 修改 TodayView，移除 TaskList 组件，仅显示 todayTasks 和 importantTasks
  - [x] SubTask 1.2: 确保 QuickAddTask 创建的任务默认截止日期为今天

- [x] Task 2: 实现灵感采集真实采集功能
  - [x] SubTask 2.1: 在 electron/main.cjs 中添加 IPC 处理器 `content:fetch`，接收 URL，通过 net/https 请求获取页面 HTML
  - [x] SubTask 2.2: 在 electron/main.cjs 中实现抖音页面解析（提取标题、描述、作者）
  - [x] SubTask 2.3: 在 electron/main.cjs 中实现微信公众号文章解析（提取标题、正文、作者）
  - [x] SubTask 2.4: 在 preload.cjs 中添加 fetchContent 方法
  - [x] SubTask 2.5: 在 platform.ts 中添加 fetchContent 函数
  - [x] SubTask 2.6: 在灵感便签组件中添加 URL 输入框和采集按钮，调用 fetchContent 获取内容
  - [x] SubTask 2.7: 采集成功后自动将内容写入用户配置的目标知识库

- [x] Task 3: 修复关系图谱显示
  - [x] SubTask 3.1: 修复 Canvas 渲染中 CSS 变量无法使用的问题（改为实际颜色值）
  - [x] SubTask 3.2: 确保 canvas 尺寸正确设置，内容不被裁剪

- [x] Task 4: 修复页面滚动问题
  - [x] SubTask 4.1: 修复数据统计页面滚动 — 移除 StatisticsPanel 的 p-4 和 paper-texture 外层样式，确保父容器 overflow-y-auto 生效
  - [x] SubTask 4.2: 修复设置页面滚动 — 确认 overflow-y-auto 在父容器上生效
  - [x] SubTask 4.3: 修复关系图谱页面滚动 — GraphView 添加 overflow-y-auto

- [x] Task 5: 修复悬浮窗无法打开
  - [x] SubTask 5.1: 在 Header 或导航栏中添加悬浮窗切换按钮
  - [x] SubTask 5.2: 修复设置面板中悬浮窗开关逻辑，点击启用后立即调用 showFloatingWindow()

- [x] Task 6: 丰富文档编辑器工具栏
  - [x] SubTask 6.1: 安装 @tiptap/extension-table, @tiptap/extension-image, @tiptap/extension-text-align, @tiptap/extension-superscript, @tiptap/extension-subscript, @tiptap/extension-link, @tiptap/extension-text-style, @tiptap/extension-color
  - [x] SubTask 6.2: 在 RichTextEditor 中注册新扩展
  - [x] SubTask 6.3: 添加工具栏按钮：表格、图片、文字颜色、对齐、缩进、上标下标、链接

- [x] Task 7: 修改桌宠交互为长按拖动
  - [x] SubTask 7.1: 添加长按检测逻辑（300ms 定时器），仅在长按后才允许拖动
  - [x] SubTask 7.2: 移除 onMouseEnter/onMouseLeave 触发的移动逻辑

- [x] Task 8: 移除归档功能改为完成
  - [x] SubTask 8.1: 将 InspirationCard 中的归档按钮改为完成按钮
  - [x] SubTask 8.2: 将 archiveInspiration 方法改为 completeInspiration，status 从 'archived' 改为 'completed'

- [x] Task 9: 统一灵感便签数据结构
  - [x] SubTask 9.1: 移除 InspirationStickyNote 的 itemType 字段
  - [x] SubTask 9.2: 移除 TAB_OPTIONS 中的灵感/便签切换，统一为单一列表
  - [x] SubTask 9.3: 便签创建时使用灵感数据结构（source='manual'，title=内容前50字符）
  - [x] SubTask 9.4: 移除 StickyNoteCard 组件，统一使用 InspirationCard
  - [x] SubTask 9.5: 更新 store 中的 addStickyNote 方法为 addNote（统一入口）

- [x] Task 10: 确保 Windows 版本构建更新
  - [x] SubTask 10.1: 运行 npm run build 确认构建成功
  - [x] SubTask 10.2: 检查 electron 构建配置，确保 preload.cjs 和 main.cjs 被正确打包

# Task Dependencies
- [Task 2] 依赖 [Task 9]（采集功能需要使用统一后的数据结构）
- [Task 9] 应先完成，其他任务可并行
- [Task 6] 独立，可并行
- [Task 7] 独立，可并行
- [Task 3, 4, 5] 独立，可并行
