import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const errors = [];
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const pages = walk(docs).filter(file => /\.mdx?$/.test(file));
const pageSet = new Set(pages);
const resolves = target => [target, `${target}.md`, `${target}.mdx`, path.join(target, 'index.md'), path.join(target, 'index.mdx')].some(file => existsSync(file) && statSync(file).isFile());
const checkLink = (file, href, lang) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return;
  const link = decodeURIComponent(href.split(/[?#]/)[0]);
  if (!link) return;
  let target;
  if (link.startsWith('/')) {
    const local = link.replace(/^\/en(?=\/)/, '');
    target = /\.(?:svg|png|webp|jpg)$/.test(local) ? path.join(docs, 'public', local) : path.join(docs, link.startsWith('/en/') ? 'en' : lang, local.replace(/\.html$/, ''));
  } else target = path.resolve(path.dirname(file), link.replace(/\.html$/, ''));
  if (!resolves(target)) errors.push(`${path.relative(root, file)}: missing link ${href}`);
};

for (const file of pages) {
  const text = readFileSync(file, 'utf8');
  const lang = path.relative(docs, file).split(path.sep)[0];
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter || !/^title:\s*\S.+$/m.test(frontmatter[1]) || !/^description:\s*\S.+$/m.test(frontmatter[1])) errors.push(`${path.relative(root, file)}: title/description required`);
  if (/rspress-icon|guide\/use-mdx|一个很酷的网站|My Site/.test(text)) errors.push(`${file}: scaffold content remains`);
  const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) checkLink(file, match[1], lang);
}

for (const file of walk(docs).filter(file => /_(?:nav|meta)\.json$/.test(file))) {
  const lang = path.relative(docs, file).split(path.sep)[0];
  const entries = JSON.parse(readFileSync(file, 'utf8'));
  for (const entry of entries) {
    if (entry.type === 'divider' || entry.type === 'section-header') continue;
    if (entry.link) checkLink(file, entry.link, lang);
    if (path.basename(file) === '_meta.json') {
      const name = typeof entry === 'string' ? entry : entry.name;
      if (name && !resolves(path.join(path.dirname(file), name)) && !existsSync(path.join(path.dirname(file), name))) errors.push(`${file}: missing navigation item ${name}`);
    }
  }
}

const relativePages = lang => new Set(pages.filter(file => file.startsWith(path.join(docs, lang) + path.sep)).map(file => path.relative(path.join(docs, lang), file)));
const zh = relativePages('zh'), en = relativePages('en');
for (const file of new Set([...zh, ...en])) if (!zh.has(file) || !en.has(file)) errors.push(`locale parity: missing translation for ${file}`);
if (!pageSet.has(path.join(docs, 'zh', 'index.mdx')) || !pageSet.has(path.join(docs, 'en', 'index.mdx'))) errors.push('Both locale homepages are required');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ passed: true, pages: pages.length, locales: ['zh', 'en'], links: 'local Markdown and navigation', assets: 'public images' }));
