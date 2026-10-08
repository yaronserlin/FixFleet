// <spec-dir>/_build/build.mjs  (installed by the update-functional-doc skill)
//
// Renders the spec Markdown in the parent folder into a single-page viewer, <spec-dir>/index.html.
//
//   node <spec-dir>/_build/build.mjs            build once
//   node <spec-dir>/_build/build.mjs --watch    rebuild on every save of a chapter, the template or the config
//   node <spec-dir>/_build/build.mjs --check    exit 1 if index.html is stale or has broken links (CI)
//
// Chapters: README.md first (as "Overview"), then every file named like `01-...md` / `04a-...md`,
// sorted by name. Labels come from each file's first `# Heading` (a leading "01 — " is dropped).
// Branding (product name, logo, chips, font, theme key) comes from spec.config.json next to this file.
// Requires Node >= 18 and the `marked` package (installed in this folder: `npm install`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.resolve(BUILD_DIR, '..');
const OUT_FILE = path.join(SPEC_DIR, 'index.html');
const TEMPLATE_FILE = path.join(BUILD_DIR, 'template.html');
const CONFIG_FILE = path.join(BUILD_DIR, 'spec.config.json');

/** Walks up from the spec folder to the repository root (the folder holding .git). */
function findRepoRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}
const REPO_ROOT = findRepoRoot(SPEC_DIR);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// GitHub-style heading slug, so `file.md#anchor` links written for GitHub resolve here too.
const slug = (t) => t.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const align = (a) => (a ? ` style="text-align:${a}"` : '');
const unescapeXml = (s) => s
  .replace(/&#xa;/gi, '\n').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function loadConfig() {
  const defaults = {
    productName: path.basename(REPO_ROOT),
    subtitle: 'System Specification',
    pageTitle: null,
    logo: null,                 // path relative to the repo root (svg/png), or null for a letter badge
    chips: [],                  // [{ "label": "v1.2.3", "title": "Documented version" }, ...]
    fontStylesheet: null,       // e.g. a Google Fonts css2 URL; null = system fonts
    themeStorageKey: 'spec-viewer-theme',
    findingsHeading: 'Audit Observations', // h2 text whose first table gets status styling
    chapters: null,             // optional explicit [{ "file": "README.md", "label": "Overview" }, ...]
  };
  if (!fs.existsSync(CONFIG_FILE)) return defaults;
  return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
}

function discoverChapters(config) {
  if (Array.isArray(config.chapters) && config.chapters.length) {
    return config.chapters.map((c, i) => ({ file: c.file, label: c.label || null, index: i }));
  }
  const numbered = fs.readdirSync(SPEC_DIR).filter(f => /^\d{2}[a-z]?-.+\.md$/i.test(f)).sort();
  const files = (fs.existsSync(path.join(SPEC_DIR, 'README.md')) ? ['README.md'] : []).concat(numbered);
  return files.map((file, index) => ({ file, label: null, index }));
}

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

function renderChapter(ch, chapterIdByFile) {
  const raw = fs.readFileSync(path.join(SPEC_DIR, ch.file), 'utf8');
  // Drop a breadcrumb/nav line such as "[← Index](README.md) · ..." — the sidebar replaces it.
  const md = raw.replace(/^\[[^\]]*(?:Index|Contents|Back)[^\]]*\]\([^)]*\).*\n/im, '');
  const id = chapterIdByFile[ch.file];
  const toc = [];
  let h1Text = null;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        if (depth === 1) {
          h1Text = h1Text || html.replace(/<[^>]+>/g, '');
          return `<h1 id="${id}">${html}</h1>`;
        }
        const hid = slug(text);
        if (depth === 2) toc.push({ id: hid, html: html.replace(/<[^>]+>/g, '') });
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
        if (/^(https?:|mailto:)/.test(href)) return `<a href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>`;
        const [p, anchor] = href.split('#');
        if (!p) return `<a href="#${anchor}">${inner}</a>`;
        const target = path.basename(p);
        if (chapterIdByFile[target]) return `<a href="#${anchor || chapterIdByFile[target]}">${inner}</a>`;
        // Repository source links can't be opened from a static page; show them as code-style text.
        return `<span class="srclink" title="${esc(href)}">${inner}</span>`;
      },
    },
  });
  const html = marked.parse(md);
  // labelHtml is already HTML-escaped: h1Text comes from rendered (escaped) heading HTML.
  const labelHtml = ch.label
    ? esc(ch.label)
    : (ch.file === 'README.md' ? 'Overview' : (h1Text || esc(ch.file)).replace(/^\s*\d{2}[a-z]?\s*[—–-]\s*/i, '').trim());
  return { id, labelHtml, toc, section: `<section class="chapter" id="sec-${id}" data-chapter="${id}">${html}</section>` };
}

function logoMarkup(config) {
  if (config.logo) {
    const file = path.resolve(REPO_ROOT, config.logo);
    if (fs.existsSync(file)) {
      const ext = path.extname(file).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const uri = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
      return { img: `<img src="${uri}" alt="">`, favicon: `<link rel="icon" href="${uri}">` };
    }
    console.warn(`Logo not found: ${config.logo} (falling back to a letter badge)`);
  }
  const letter = esc((config.productName || '?').trim().charAt(0).toUpperCase());
  return { img: `<span class="logo-badge" aria-hidden="true">${letter}</span>`, favicon: '' };
}

/** Renders the page; returns { html, broken, chapters } without writing anything. */
function render() {
  const config = loadConfig();
  const chapters = discoverChapters(config);
  if (!chapters.length) throw new Error(`No chapters found in ${SPEC_DIR} (expected README.md and/or NN-name.md files)`);

  const chapterIdByFile = {};
  chapters.forEach((c) => {
    chapterIdByFile[c.file] = c.file === 'README.md' ? 'overview' : `ch-${slug(c.file.replace(/\.md$/i, ''))}`;
  });
  const rendered = chapters.map(c => renderChapter(c, chapterIdByFile));

  let n = 0;
  const navHtml = rendered.map((c) => {
    const num = c.id === 'overview' ? '··' : String(++n).padStart(2, '0');
    return `
  <li class="nav-ch" data-ch="${c.id}">
    <a class="nav-ch-link" href="#${c.id}"><span class="nav-num">${num}</span><span>${c.labelHtml}</span></a>
    <ul class="nav-sub">${c.toc.map(t => `<li><a href="#${t.id}" data-target="${t.id}">${t.html}</a></li>`).join('')}</ul>
  </li>`;
  }).join('');

  const logo = logoMarkup(config);
  const chips = (config.chips || []).map(c => `<span class="chip"${c.title ? ` title="${esc(c.title)}"` : ''}>${esc(c.label)}</span>`).join('');
  const fontLink = config.fontStylesheet
    ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${esc(config.fontStylesheet)}">`
    : '';
  const specPath = path.relative(REPO_ROOT, SPEC_DIR).split(path.sep).join('/') || '.';

  const html = fs.readFileSync(TEMPLATE_FILE, 'utf8')
    .replaceAll('<!--PAGE_TITLE-->', esc(config.pageTitle || `${config.productName} ${config.subtitle}`))
    .replaceAll('<!--PRODUCT-->', esc(config.productName))
    .replaceAll('<!--SUBTITLE-->', esc(config.subtitle))
    .replaceAll('<!--FAVICON-->', logo.favicon)
    .replaceAll('<!--LOGO-->', logo.img)
    .replaceAll('<!--CHIPS-->', chips)
    .replaceAll('<!--FONT_LINK-->', fontLink)
    .replaceAll('<!--THEME_KEY-->', esc(config.themeStorageKey))
    .replaceAll('<!--FINDINGS_HEADING-->', esc(config.findingsHeading || ''))
    .replaceAll('<!--SPEC_PATH-->', esc(specPath))
    .replace('<!--NAV-->', navHtml)
    .replace('<!--CONTENT-->', rendered.map(c => c.section).join('\n'));

  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
  const broken = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]).filter(a => !ids.has(a)))];
  return { html, broken, chapters: rendered.length };
}

function runBuild({ check = false } = {}) {
  try {
    const { html, broken, chapters } = render();
    const previous = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
    const stale = previous !== html;
    const brokenNote = broken.length ? ` (broken links: #${broken.join(', #')})` : '';
    if (check) {
      console.log(`${stale ? 'STALE' : 'OK'}: index.html, ${chapters} chapters${brokenNote}`);
      return !stale && broken.length === 0;
    }
    // Only touch the file when the output changed (keeps watchers and git quiet).
    if (stale) fs.writeFileSync(OUT_FILE, html);
    console.log(`${stale ? 'Built' : 'Up to date:'} ${path.relative(REPO_ROOT, OUT_FILE)}, ${chapters} chapters, ${Math.round(Buffer.byteLength(html) / 1024)} KB${brokenNote}`);
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
  fs.watch(SPEC_DIR, (_e, file) => { if (file && file.endsWith('.md')) schedule(file); });
  fs.watch(BUILD_DIR, (_e, file) => { if (file === 'template.html' || file === 'spec.config.json') schedule(file); });
  console.log(`Watching ${path.relative(REPO_ROOT, SPEC_DIR)}/*.md for changes (Ctrl+C to stop)`);
} else {
  process.exitCode = runBuild({ check: process.argv.includes('--check') }) ? 0 : 1;
}
