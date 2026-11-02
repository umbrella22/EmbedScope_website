import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'doc_build');
const base = process.env.RSPRESS_BASE || '/EmbedScope_website/';
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('RSPRESS_BASE must start and end with /');
if (!existsSync(output)) throw new Error('Run npm run build first');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const pages = walk(output).filter(file => file.endsWith('.html'));
const errors = [], assets = new Set();
let links = 0;
for (const file of pages) {
  const text = readFileSync(file, 'utf8');
  if (path.basename(file) !== '404.html' && !/<meta[^>]+name="description"[^>]+content="[^\"]+"/.test(text)) errors.push(`${file}: description is missing`);
  const current = new URL(base + path.relative(output, file).split(path.sep).join('/'), 'https://local.invalid');
  for (const match of text.matchAll(/\b(?:href|src)="([^\"]+)"/g)) {
    const raw = match[1].replaceAll('&amp;', '&');
    if (/^(?:https?:|mailto:|data:|javascript:|tel:|#|\/\/)/.test(raw)) continue;
    const url = new URL(raw, current);
    if (!url.pathname.startsWith(base)) { errors.push(`${file}: URL escapes base: ${raw}`); continue; }
    let target = path.join(output, decodeURIComponent(url.pathname.slice(base.length)));
    if (existsSync(target) && statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!existsSync(target) && existsSync(`${target}.html`)) target += '.html';
    if (!existsSync(target) || !statSync(target).isFile()) { errors.push(`${path.relative(output, file)}: missing output ${raw}`); continue; }
    links++;
    if (!target.endsWith('.html')) assets.add(path.relative(output, target));
  }
}
for (const required of ['index.html', 'en/index.html', 'guide/start/introduction.html', 'en/guide/start/introduction.html', 'guide/start/quick-start.html', 'en/guide/start/quick-start.html', 'integration/dango.html', 'en/integration/dango.html', 'guide/dango.html', 'en/guide/dango.html', 'reference/cli.html', 'reference/sdk.html', 'logo.svg', 'favicon.svg', 'images/reference-capture.png', 'images/inspector-dango.jpg']) if (!existsSync(path.join(output, required))) errors.push(`missing built artifact ${required}`);
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exit(1); }
console.log(JSON.stringify({ passed: true, base, htmlPages: pages.length, localReferences: links, assets: assets.size }));
