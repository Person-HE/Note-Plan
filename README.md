# Note-Plan

**A local-first notes, tasks and inspiration app. One codebase, four targets: web, desktop, Android, iOS.**

[![Live demo](https://img.shields.io/badge/Live%20demo-note--plan--bwm.pages.dev-2f7cf6?style=flat-square)](https://note-plan-bwm.pages.dev)
![Offline](https://img.shields.io/badge/PWA-offline-brightgreen?style=flat-square)
![Storage](https://img.shields.io/badge/storage-IndexedDB-informational?style=flat-square)
![Sync](https://img.shields.io/badge/sync-WebDAV_(your_server)-yellowgreen?style=flat-square)

Tasks, notes and inspiration cards with a TipTap rich-text editor, tagging, statistics and a companion pet. Your entries live in IndexedDB on your device. Sync is WebDAV against a server you own. The AI assistant talks to an endpoint you configure. There is no account and no backend of ours.

**→ [note-plan-bwm.pages.dev](https://note-plan-bwm.pages.dev)**

## See it

Recordings are attached to [release `demos-2026-09`](https://github.com/Person-HE/Note-Plan/releases/tag/demos-2026-09) rather than committed to the repo, so cloning stays cheap:

| Walkthrough | Length |
| --- | ---: |
| [Full product tour](https://github.com/Person-HE/Note-Plan/releases/download/demos-2026-09/walkthrough-full.mp4) | 39.9 MB |
| [Tasks](https://github.com/Person-HE/Note-Plan/releases/download/demos-2026-09/tasks.mp4) | 37.8 MB |
| [Notes & inspiration](https://github.com/Person-HE/Note-Plan/releases/download/demos-2026-09/notes-inspiration.mp4) | 30.1 MB |
| [Statistics](https://github.com/Person-HE/Note-Plan/releases/download/demos-2026-09/statistics.mp4) | 12.3 MB |
| [Knowledge base](https://github.com/Person-HE/Note-Plan/releases/download/demos-2026-09/knowledge-base.mp4) | 8.1 MB |

## What it does

- **Today / tasks** — due-oriented task list with importance buckets (today · important · all) and completion state.
- **Notes** — TipTap rich text with images, lists and headings, plus inspiration and knowledge collections.
- **Statistics** — local aggregation of what you wrote and finished, computed on device.
- **Pet** — an ambient companion that reacts to your activity.
- **AI assistant** — optional; point it at any OpenAI-compatible base URL and key in settings.
- **WebDAV sync** — bring your own server (Nextcloud, Jianguoyun, any WebDAV endpoint) and keep devices in step without our infrastructure.
- **Installable** — service worker + manifest; the web build runs offline after first load.
- **Same code everywhere** — Electron for desktop, Capacitor for Android and iOS.

## Measured, not claimed

`npm run metrics` runs a clean build, walks the output, and records the machine the
numbers came from into `docs/metrics.json`.

| Metric | Value |
| --- | --- |
| Clean build (`tsc -b && vite build`) | 13.4 s |
| Build output | 35 files · 3.18 MB raw · 2.18 MB gzip |
| Largest chunk | `vendor-tiptap` — 504 KB raw |
| Source | 93 files · 20,177 lines (17,700 code) |
| Server required | none |
| AI/WebDAV | optional, user-configured |

Live behaviour, cold cache, real browser, deployed site:

| Metric | Value |
| --- | --- |
| TTFB | 1.32 s |
| `load` event | 2.79 s |
| First-page transfer | ~387 KB |

## Running it

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # web bundle → dist/
npm run typecheck
npm run lint          # --max-warnings 0
npm run metrics       # docs/metrics.json + docs/metrics.md
```

Desktop and mobile:

```bash
npm run electron:dev          # build + Electron shell
npm run electron:build:win    # Windows installer
npm run build:android         # vite build → cap sync → Android Studio
npm run build:ios             # vite build → cap sync → Xcode
```

## Deploying

```bash
npx wrangler pages deploy dist --project-name note-plan
```

`vite.config.ts` sets `base: './'` so the bundle is subpath-safe, but the PWA
manifest and service worker use `start_url: '/'` and `scope: '/'`. Install prompts
therefore only behave on a domain root, such as a Pages deployment — not under a
subdirectory.

## Layout

```
src/
  modules/       notes · tasks · ai · sync · stats (each: components + store + services)
  shared/        platform detection, IndexedDB/Dexie layer, utilities
electron/        desktop main process
public/          icons, manifest, _redirects
scripts/         icon generation, metrics collector
```

## Honest gaps

- **No automated tests.** `typecheck` and a zero-warning `lint` gate are the only mechanical safety net.
- The editor chunk dominates the bundle: `vendor-tiptap` alone is 504 KB of the 3.18 MB output, and there is no route-level splitting behind it.
- Roughly 2.3 MB of the deployed output is PNG/ICO icon variants.
- UI is Chinese-first; there is no i18n layer.
- The Git history carries large binaries and the object store is ~123 MB, so cloning is slower than the source warrants.

## 中文说明

Note-Plan 是一款**本地优先**的笔记 / 待办 / 灵感应用：TipTap 富文本、任务与优先级、统计、桌面宠物，数据存放于设备 IndexedDB。同步使用你自己的 WebDAV 服务，AI 助手使用你自己配置的兼容端点——本项目不存在任何官方后端或账号体系。

- 在线使用：<https://note-plan-bwm.pages.dev>（PWA，可安装、首访后可离线）
- 一套代码四端运行：Web / Electron 桌面 / Capacitor Android / iOS
- 全部指标可复现：`npm run metrics` → `docs/metrics.json`，含采集环境（Windows 11、Node 24.12.0、Ryzen 7 7735H）
- 已知不足：无自动化测试；编辑器分包体积大；界面仅中文

## License

Apache License 2.0 — see `LICENSE`.
