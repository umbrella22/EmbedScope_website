import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../doc_build');
const base = process.env.RSPRESS_BASE || '/EmbedScope_website/';
const routes = {
  'guide/quick-start': 'guide/start/quick-start',
  'guide/cli': 'reference/cli',
  'guide/inspector': 'guide/basic/inspector',
  'guide/rust-integration': 'integration/rust',
  'guide/c-integration': 'integration/c',
  'guide/lvgl': 'integration/lvgl',
  'guide/dango': 'integration/dango',
  'guide/skills': 'guide/advanced/skills',
  'guide/troubleshooting': 'guide/advanced/troubleshooting',
  'reference/architecture': 'development/architecture',
  'reference/validation': 'development/testing',
};

for (const locale of ['', 'en/']) {
  for (const [before, after] of Object.entries(routes)) {
    const target = `${base}${locale}${after}.html`;
    const file = path.join(output, locale, `${before}.html`);
    const title = locale ? 'Page moved' : '页面已迁移';
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `<!doctype html><html lang="${locale ? 'en' : 'zh-CN'}"><head><meta charset="utf-8"><title>${title} - EmbedScope</title><meta name="description" content="${title}"><meta name="robots" content="noindex"><link rel="canonical" href="${target}"><meta http-equiv="refresh" content="0;url=${target}"></head><body><a href="${target}">${title}</a><script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script></body></html>`);
  }
}
console.log(JSON.stringify({ legacyRedirects: Object.keys(routes).length * 2, base }));
