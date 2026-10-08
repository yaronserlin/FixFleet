// docs/system-spec/_build/build.mjs
//
// Renders docs/system-spec/*.md into the single-page viewer docs/system-spec/index.html.
//
//   npm run docs:build    build once
//   npm run docs:watch    rebuild on every save of a chapter or of the template
//
// The .githooks/pre-commit hook also runs it whenever a spec file is staged, so the
// committed index.html never lags behind the Markdown.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.resolve(BUILD_DIR, '..');
const OUT_FILE = path.join(SPEC_DIR, 'index.html');
const LOGO_FILE = path.resolve(SPEC_DIR, '../../frontend/public/favicon.svg');
const TEMPLATE_FILE = path.join(BUILD_DIR, 'template.html');

// Order and labels of the chapters in the sidebar.
const CHAPTERS = [
  ['README.md', 'overview', 'Overview'],
  ['01-architecture-and-layers.md', 'ch01', 'Architecture & Layers'],
  ['02-database-and-schemas.md', 'ch02', 'Database & Schemas'],
  ['03-dependencies-and-config.md', 'ch03', 'Dependencies & Config'],
  ['04-file-inventory.md', 'ch04', 'File Inventory'],
  ['05-api-and-workflows.md', 'ch05', 'API & Workflows'],
];
const chapterIdByFile = Object.fromEntries(CHAPTERS.map(([f, id]) => [f, id]));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// GitHub-style heading slug, so `file.md#anchor` links written for GitHub resolve here too.
const slug = (t) => t.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const align = (a) => (a ? ` style="text-align:${a}"` : '');
const unescapeXml = (s) => s
  .replace(/&#xa;/gi, '\n').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** draw.io blocks converted from Mermaid keep the original source in `mermaidData`. */
function mermaidFromDrawio(xml) {
  const m = xml.match(/mermaidData="([^"]*)"/);
  if (!m) return null;
  try { return JSON.parse(unescapeXml(m[1])).data || null; } catch { return null; }
}

/** In sequence diagrams `;` ends a statement, so a `;` inside message text would truncate it. */
function safeMermaid(src) {
  if (!/^\s*sequenceDiagram/.test(src)) return src;
  return src.split('\n').map(l => (/(->>|-->>|-\)|--\)|^\s*Note )/.test(l) ? l.replace(/;/g, ',') : l)).join('\n');
}

const diagramHtml = (src) => `<div class="diagram"><pre class="diagram-src">${esc(safeMermaid(src))}</pre></div>`;

function renderChapter([file, id], idx) {
  // Drop the per-file breadcrumb line; the sidebar replaces it.
  const md = fs.readFileSync(path.join(SPEC_DIR, file), 'utf8').replace(/^\[← Index\].*\n/m, '');
  const toc = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        const hid = slug(text);
        if (depth === 2) toc.push({ id: hid, html: html.replace(/<[^>]+>/g, '') });
        if (depth === 1) return `<h1 id="${id}">${html}</h1>`;
        return `<h${depth} id="${hid}">${html}<a class="anchor" href="#${hid}" aria-label="Link to this section">#</a></h${depth}>`;
      },
      code({ text, lang }) {
        if (lang === 'mermaid') return diagramHtml(text);
        if (lang === 'drawio') {
          const src = mermaidFromDrawio(text);
          if (src) return diagramHtml(src);
          return '<div class="codewrap"><p class="diagram-note">draw.io diagram: open the Markdown file in draw.io to view it.</p></div>';
        }
        return `<div class="codewrap"><pre><code>${esc(text)}</code></pre></div>`;
      },
      table(token) {
        const head = token.header.map((c, i) => `<th${align(token.align[i])}>${this.parser.parseInline(c.tokens)}</th>`).join('');
        const rows = token.rows.map(r => `<tr>${r.map((c, i) => `<td${align(token.align[i])}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
        return `<div class="tbl"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
      },
      link({ href, tokens }) {
        const inner = this.parser.parseInline(tokens);
        if (/^https?:/.test(href)) return `<a href="${href}" target="_blank" rel="noopener">${inner}</a>`;
        const [p, anchor] = href.split('#');
        if (!p) return `<a href="#${anchor}">${inner}</a>`;
        if (chapterIdByFile[p]) return `<a href="#${anchor || chapterIdByFile[p]}">${inner}</a>`;
        // Repo source links can't be opened from the page; show them as code-style text.
        return `<span class="srclink" title="${esc(href)}">${inner}</span>`;
      },
    },
  });
  const html = marked.parse(md);
  return {
    section: `<section class="chapter" id="sec-${id}" data-chapter="${id}">${html}</section>`,
    num: idx === 0 ? '··' : String(idx).padStart(2, '0'),
    toc,
  };
}

/** Builds index.html; returns whether it changed, its size, and any broken in-page links. */
function build() {
  const chapters = CHAPTERS.map((c, i) => ({ ...renderChapter(c, i), id: c[1], label: c[2] }));
  const navHtml = chapters.map(c => `
  <li class="nav-ch" data-ch="${c.id}">
    <a class="nav-ch-link" href="#${c.id}"><span class="nav-num">${c.num}</span><span>${esc(c.label)}</span></a>
    <ul class="nav-sub">${c.toc.map(t => `<li><a href="#${t.id}" data-target="${t.id}">${t.html}</a></li>`).join('')}</ul>
  </li>`).join('');

  const logoUri = `data:image/svg+xml;base64,${fs.readFileSync(LOGO_FILE).toString('base64')}`;
  const html = fs.readFileSync(TEMPLATE_FILE, 'utf8')
    .replaceAll('<!--LOGO-->', logoUri)
    .replace('<!--NAV-->', navHtml)
    .replace('<!--CONTENT-->', chapters.map(c => c.section).join('\n'));

  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
  const broken = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]).filter(a => !ids.has(a)))];

  // Only touch the file when the output changed (keeps watchers and git quiet).
  const previous = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
  if (previous !== html) fs.writeFileSync(OUT_FILE, html);
  return { changed: previous !== html, bytes: Buffer.byteLength(html), broken };
}

function runBuild() {
  try {
    const { changed, bytes, broken } = build();
    const note = broken.length ? ` (warning: broken links to #${broken.join(', #')})` : '';
    console.log(`${changed ? 'Built' : 'Up to date:'} docs/system-spec/index.html, ${Math.round(bytes / 1024)} KB${note}`);
    return true;
  } catch (err) {
    console.error(`Spec build failed: ${err.message}`);
    return false;
  }
}

if (process.argv.includes('--watch')) {
  runBuild();
  let timer = null;
  const schedule = (file) => {
    clearTimeout(timer);
    timer = setTimeout(() => { console.log(`Changed: ${file}`); runBuild(); }, 150);
  };
  fs.watch(SPEC_DIR, (_event, file) => { if (file && file.endsWith('.md')) schedule(file); });
  fs.watch(BUILD_DIR, (_event, file) => { if (file === 'template.html') schedule(file); });
  console.log('Watching docs/system-spec/*.md for changes (Ctrl+C to stop)');
} else {
  process.exitCode = runBuild() ? 0 : 1;
}
