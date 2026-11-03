import { defineConfig } from '@rspress/core';

const base = process.env.RSPRESS_BASE || '/EmbedScope_website/';

export default defineConfig({
  root: 'docs',
  outDir: 'doc_build',
  base,
  builderConfig: {
    performance: { buildCache: { cacheDigest: [base] } },
  },
  title: 'EmbedScope',
  description: 'Rust tools for embedded diagnostics: logs, metrics, UI inspection, display capture and input.',
  lang: 'zh',
  icon: '/favicon.svg',
  logo: { light: '/logo.svg', dark: '/logo-dark.svg' },
  logoText: 'EmbedScope',
  locales: [
    {
      lang: 'zh', label: '简体中文', title: 'EmbedScope 文档',
      description: '用 Rust 构建的嵌入式诊断工具：日志、指标、UI 检查、显示捕获与输入控制。',
    },
    {
      lang: 'en', label: 'English', title: 'EmbedScope documentation',
      description: 'Rust tools for embedded diagnostics: logs, metrics, UI inspection, display capture and input.',
    },
  ],
  route: { localeRedirect: 'never' },
  search: { mode: 'local', codeBlocks: true },
  themeConfig: {
    search: true,
    darkMode: 'auto',
    socialLinks: [{ icon: 'github', mode: 'link', content: 'https://github.com/umbrella22/EmbedScope' }],
    footer: { message: 'MIT licensed. Built with Rust and Rspress.' },
  },
});
