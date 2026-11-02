# EmbedScope 文档站

EmbedScope 的中英文使用、协议和平台接入文档，基于 Rspress 2。产品源码位于 [umbrella22/EmbedScope](https://github.com/umbrella22/EmbedScope)，本站独立维护，可生成静态站点。

文档按指南、设备接入、API 参考与开发四个入口组织。每种语言包含 20 篇正文和首页，路径与侧栏保持对应。首页展示使用 `escope` 捕获的软件参考设备画面，Inspector 指南展示团子 OS 的实际设置页。

在线文档：<https://umbrella22.github.io/EmbedScope_website/>。

## 本地使用

需要 Node.js `^20.19.0 || >=22.12.0` 与 npm。依赖已锁定。

```sh
npm ci
npm run dev
```

按终端提示打开 `/EmbedScope_website/`。默认中文，English 位于 `/EmbedScope_website/en/`。本地搜索包含正文与代码；导航栏可切换明暗主题。

```sh
npm run typecheck
npm run check-docs
npm run build
npm run check-build
npm run preview
```

`check-docs` 校验每页 title/description、中英路径对应、站内 Markdown 链接、导航和图片。`check-build` 检查生产 HTML 的本地链接、资源、部署 base 和关键产物。生成目录是 `doc_build/`，不提交到 Git。

## 部署路径

默认 base 为 `/EmbedScope_website/`。在域名根目录使用时：

```sh
RSPRESS_BASE=/ npm run build
RSPRESS_BASE=/ npm run check-build
```

自定义路径必须以 `/` 开始和结束。构建缓存包含 base，可在两个路径之间重建。将生成的 `doc_build/` 发布到静态站点托管服务。

GitHub Pages 使用 `.github/workflows/docs.yml`：推送 main 或手动触发后，Ubuntu runner 使用 Node.js 24 和锁定依赖执行类型、内容、构建与产物检查，再上传静态产物并部署。Pull request 只执行构建检查。Pages 的发布来源设置为 GitHub Actions，默认站点地址为 <https://umbrella22.github.io/EmbedScope_website/>。

## 内容维护

- `docs/zh/` 与 `docs/en/` 保持同名页；每页写 title 和 description。
- `_nav.json` 管理顶部导航，`_meta.json` 管理侧栏顺序。
- `guide/start/` 提供介绍、快速开始和功能导航；`guide/basic/` 按调试任务组织，`guide/advanced/` 提供 skills 与故障排查。
- `integration/` 按 Rust、C/C++、LVGL 与团子 OS 组织接入步骤；`reference/` 集中记录 CLI、主机 SDK 和协议；`development/` 记录架构与构建测试。
- 两种语言的 `_nav.json` 使用 `/guide/...` 等逻辑路径，由 Rspress 自动加语言前缀；自定义首页组件自行添加 `/en`，再调用 `withBase`。
- `components/DocsHome.tsx` 是双语首页，资源用 `withBase`，站内按钮连接当前语言。
- `theme/index.tsx` 从 `@rspress/core/theme-original` 导出，样式写在 `theme/styles.css`。
- `theme/components/SwitchAppearance.tsx` 将默认主题开关替换为有名称的原生 button，保留 Rspress 的主题状态与持久化，支持键盘操作。
- `docs/public/images/reference-capture.png` 来源于产品独立进程 CLI E2E。更新画面时同步首页的计数、帧号和来源说明。
- `docs/public/images/inspector-dango.jpg` 来源于 Inspector 连接实际团子 OS 设备的截图，裁剪移除了本机保存路径和日志区域。
- `scripts/legacy-routes.mjs` 在 `postbuild` 为旧版 11 条路径生成两语言静态跳转，保留查询参数与锚点；旧正文不参与搜索和侧栏。
- 使用说明按任务组织，优先提供前提、操作步骤、预期结果与排错入口。开发计划、执行记录和测试回执保存在产品仓库中。
- 运行命令、能力和 API 与产品源码保持一致；涉及兼容性和测量结果时注明运行环境。

MIT licensed. Dependencies retain their own licenses.
