# Note-Plan 11 项问题修复与优化 Spec

## Why
用户反馈了 11 项问题，涵盖今日待办页面逻辑、灵感采集真实采集能力、关系图谱显示、知识库多实例、页面滚动、悬浮窗可访问性、编辑器工具丰富度、桌宠交互、归档语义、Windows 构建更新、灵感便签数据结构统一。需要逐一修复和优化。

## What Changes
- 修改今日待办页面，仅显示当天到期任务和标记为重要的任务
- 实现灵感采集真实采集功能（抖音视频链接、微信公众号链接），采集后自动写入用户指定的知识库
- 修复关系图谱 Canvas 渲染问题，确保内容正常显示
- 知识库已支持多个，确认功能正常
- 修复数据统计页面、设置页面、关系图谱页面无法滚动的问题
- 修复悬浮窗无法打开的问题，提供明确的打开方式
- 丰富文档编辑器工具栏，增加表格、图片、颜色、对齐、缩进等工具
- 修改桌宠交互：鼠标长按才能拖动，不再鼠标放上去就触发移动
- 移除灵感采集的「归档」功能，改为「完成」状态
- 确保 Windows 版本正确构建和更新
- 统一灵感便签数据结构，所有条目都使用灵感采集的数据结构，不再区分灵感和便签

## Impact
- Affected code:
  - `src/App.tsx` — TodayView 逻辑修改
  - `src/modules/inspiration-sticky/` — 真实采集、数据结构统一、移除归档
  - `src/modules/note/` — 知识库接收采集内容
  - `src/modules/view/FloatingWindow.tsx` — 悬浮窗修复
  - `src/modules/pet/components.tsx` — 桌宠交互修改
  - `src/modules/note/components.tsx` — 关系图谱修复、编辑器工具栏丰富
  - `src/modules/statistics/components.tsx` — 滚动修复
  - `src/modules/settings/components.tsx` — 滚动修复
  - `electron/main.cjs` — 悬浮窗修复

---

## ADDED Requirements

### Requirement: 灵感采集真实采集
系统 SHALL 支持通过输入抖音视频链接或微信公众号链接，真实采集内容并保存。

#### Scenario: 输入抖音视频链接采集
- **WHEN** 用户在灵感采集区域输入抖音视频链接（如 https://v.douyin.com/xxx）
- **THEN** 系统通过 Electron 主进程发起 HTTP 请求获取页面内容
- **AND** 提取视频标题、描述、作者等信息
- **AND** 将采集结果保存为灵感条目，source 标记为 'douyin'

#### Scenario: 输入微信公众号链接采集
- **WHEN** 用户输入微信公众号文章链接
- **THEN** 系统获取文章标题、正文、作者等信息
- **AND** 将采集结果保存为灵感条目，source 标记为 'wechat'
- **AND** 同时将正文内容写入用户指定的知识库文档

#### Scenario: 采集失败
- **WHEN** 链接无法访问或解析失败
- **THEN** 系统显示错误提示，不创建条目

### Requirement: 采集内容自动写入知识库
系统 SHALL 在灵感采集成功后，将内容自动写入用户可配置的专属知识库。

#### Scenario: 采集后自动写入
- **WHEN** 灵感采集成功且用户已配置目标知识库
- **THEN** 系统自动在目标知识库的「灵感采集」文件夹下创建新文档，写入采集的完整内容

#### Scenario: 未配置目标知识库
- **WHEN** 灵感采集成功但用户未配置目标知识库
- **THEN** 系统仅保存为灵感条目，不创建知识库文档

---

## MODIFIED Requirements

### Requirement: 今日待办页面
今日待办页面 SHALL 仅显示当天到期的全部待办和标记为重要的任务，不再显示全部任务列表。

### Requirement: 灵感便签统一数据结构
灵感便签模块 SHALL 使用统一的数据结构，所有条目（无论来源）都采用灵感采集的数据结构（包含 title、content、source、categoryId、status 等字段），不再区分 itemType。

### Requirement: 桌宠拖动交互
桌宠 SHALL 仅在鼠标长按（超过 300ms）后才允许拖动移动，鼠标悬停不再触发移动。

### Requirement: 归档改为完成
灵感条目的「归档」操作 SHALL 改为「完成」操作，status 值从 'archived' 改为 'completed'。

### Requirement: 文档编辑器工具栏
文档编辑器工具栏 SHALL 增加以下工具：表格、图片插入、文字颜色、文字对齐（左/中/右/两端）、缩进/反缩进、上标/下标、链接插入。

### Requirement: 悬浮窗可访问性
悬浮窗 SHALL 提供明确的打开方式：在应用内导航栏提供悬浮窗按钮，且设置面板中的悬浮窗开关点击后立即显示悬浮窗。

### Requirement: 页面滚动
数据统计页面、设置页面、关系图谱页面 SHALL 支持正常滚动浏览全部内容。

---

## REMOVED Requirements

### Requirement: 灵感便签的 itemType 区分
**Reason**: 所有条目统一使用灵感数据结构，不再区分灵感/便签类型
**Migration**: 移除 itemType 字段，便签创建时 source 为 'manual'，title 默认为内容前 50 字符
