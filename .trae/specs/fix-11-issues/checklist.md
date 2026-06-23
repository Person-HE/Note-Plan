# Checklist

## 今日待办页面
- [x] TodayView 仅显示当天到期任务和重要任务
- [x] QuickAddTask 创建的任务默认截止日期为今天

## 灵感采集真实采集
- [x] electron/main.cjs 中实现了 content:fetch IPC 处理器
- [ ] 抖音视频链接可以触发真实采集（后端 parseDouyin 已实现，但 QuickCapture 组件缺少 URL 输入框和采集按钮，fetchContent 未被任何 UI 调用）
- [ ] 微信公众号链接可以触发真实采集（后端 parseWechat 已实现，但同上，缺少 UI 入口）
- [x] 采集内容自动写入用户指定的知识库
- [ ] 采集失败时显示错误提示（后端返回 { success: false, error } 但无 UI 展示错误信息）

## 关系图谱修复
- [x] Canvas 渲染使用实际颜色值而非 CSS 变量
- [x] 图谱内容正常显示，不被裁剪

## 页面滚动修复
- [x] 数据统计页面可以正常滚动
- [x] 设置页面可以正常滚动
- [x] 关系图谱页面可以正常滚动

## 悬浮窗修复
- [x] 导航栏或 Header 中有悬浮窗切换按钮
- [x] 设置面板悬浮窗开关点击后立即显示悬浮窗

## 编辑器工具栏丰富
- [x] 新增表格工具
- [x] 新增图片插入工具
- [x] 新增文字颜色工具
- [x] 新增文字对齐工具
- [ ] 新增缩进/反缩进工具（工具栏中无缩进/反缩进按钮）
- [x] 新增上标/下标工具
- [x] 新增链接插入工具

## 桌宠交互修改
- [x] 鼠标长按超过 300ms 后才允许拖动
- [x] 鼠标悬停不再触发移动

## 归档改为完成
- [x] 灵感条目操作按钮从「归档」改为「完成」
- [x] status 值从 'archived' 改为 'completed'

## 统一数据结构
- [ ] InspirationStickyNote 不再有 itemType 字段（types.ts 仍有 itemType: InspirationStickyItemType，addInspiration 设为 'inspiration'，addStickyNote 设为 'sticky'）
- [x] 所有条目统一使用灵感数据结构
- [x] 便签创建时 source='manual'，title=内容前50字符
- [x] 不再有灵感/便签 Tab 切换

## Windows 构建
- [x] npm run build 成功
- [x] preload.cjs 和 main.cjs 被正确打包
