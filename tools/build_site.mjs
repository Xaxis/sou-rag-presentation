/* Assemble the deployable site into dist/.
 *
 *   node tools/build_site.mjs
 *
 * Everything is derived from slides/index.html, so the landing page, the
 * standalone playgrounds and the transcript can never drift from the deck.
 * No dependencies — Vercel runs this with plain node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------ parse deck */
function parseDeck() {
  const html = read('slides', 'index.html');
  const out = [];
  const re = /<section\b([^>]*)>([\s\S]*?)<\/section>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const raw = m[2];
    const ai = raw.indexOf('<aside class="notes">');
    const body = ai === -1 ? raw : raw.slice(0, ai);
    const notes = ai === -1 ? ''
      : raw.slice(ai + '<aside class="notes">'.length, raw.lastIndexOf('</aside>')).trim();

    const h = body.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/);
    const eb = body.match(/<span class="eyebrow">([\s\S]*?)<\/span>/);
    const cues = [...body.matchAll(/<span class="cmd">([\s\S]*?)<\/span>/g)].map((c) => c[1]);
    const widget = (body.match(/id="(ix-[a-z]+)"/) || [])[1] || null;

    out.push({
      core: /data-track="core"/.test(attrs),
      titleHtml: h ? h[1].trim() : '',
      title: strip(h ? h[1] : '(untitled)'),
      eyebrow: strip(eb ? eb[1] : ''),
      cues: cues.map(strip),
      widget,
      body,
      notes,
    });
  }
  return out;
}
const strip = (f) =>
  f.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')
   .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
   .replace(/&gt;/g, '>').replace(/&#183;/g, '·').replace(/\s+/g, ' ').trim();

/* -------------------------------------------------------------- shell */
const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=JetBrains+Mono:wght@400;500;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">';
const FAVICON =
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 ' +
  'viewBox=%270 0 16 16%27%3E%3Ctext y=%2713%27 font-size=%2713%27%3E%F0%9F%94%8D%3C/text%3E%3C/svg%3E">';

function nav(active) {
  const item = (href, label, cls = '') =>
    `<a class="link ${cls}${active === href ? ' on' : ''}" href="${href}">${label}</a>`;
  return `<nav class="nav"><div class="wrap">
  <a class="brand" href="/">ragverse<span>.diy</span></a>
  ${item('/read/', 'The lesson')}
  ${item('/play/', 'Playgrounds')}
  ${item('/deck/', 'Deck', 'hide-s')}
  ${item('/present/', 'Present', 'hide-s')}
  <a class="link hide-s" href="https://github.com/Xaxis/sou-rag-presentation">Source</a>
  <button class="theme-btn" type="button" aria-label="Toggle theme"></button>
</div></nav>`;
}

const SITE = 'https://ragverse.diy';

function page({ title, desc, active, body, extraCss = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${active}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${active}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/og.png">
<meta name="theme-color" content="#f6f6f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1216" media="(prefers-color-scheme: dark)">
${FAVICON}
${FONTS}
<script>(function(){try{var m=localStorage.getItem("ragverse.theme");
if(m)document.documentElement.setAttribute("data-theme",m);}catch(e){}})();</script>
<link rel="stylesheet" href="/deck/tokens.css">
<link rel="stylesheet" href="/deck/theme.css">
<link rel="stylesheet" href="/site.css">
${extraCss}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${nav(active)}
<main id="main">
${body}
</main>
<footer><div class="wrap row">
  <span>Built as a work-along lesson. Every claim executed, not asserted.</span>
  <span class="sp"><a href="/deck/">Lesson</a> &middot; <a href="/play/">Playgrounds</a>
  &middot; <a href="/script/">Transcript</a>
  &middot; <a href="https://github.com/Xaxis/sou-rag-presentation">Source</a></span>
</div></footer>
<script src="/theme.js"></script>
</body>
</html>`;
}

/* --------------------------------------------------------- playgrounds */
const PLAY_META = {
  'ix-scale':    { id: 'scale',    n: '01' },
  'ix-embed':    { id: 'embed',    n: '02' },
  'ix-chunk':    { id: 'chunk',    n: '03' },
  'ix-retr':     { id: 'retr',     n: '04' },
  'ix-mismatch': { id: 'mismatch', n: '05' },
};

function buildPlay(slides) {
  const items = slides
    .filter((s) => s.widget && PLAY_META[s.widget])
    .map((s) => {
      const meta = PLAY_META[s.widget];
      // drop the eyebrow and the heading; we re-render those ourselves
      let body = s.body
        .replace(/<span class="eyebrow">[\s\S]*?<\/span>\s*/, '')
        .replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>\s*/, '');
      const title = s.title.replace(/^Try it:\s*/i, '');
      return `<article class="pg-item" id="${meta.id}">
  <span class="pg-num">Playground ${meta.n}</span>
  <h2>${title.charAt(0).toUpperCase()}${title.slice(1)}</h2>
  ${body.trim()}
</article>`;
    })
    .join('\n');

  const body = `<div class="wrap pg">
  <span class="eyebrow"><b>Interactive</b> &middot; no API key, no install</span>
  <h1>Take it apart.</h1>
  <p style="max-width:56ch;color:var(--ink-soft);font-size:1.1rem">
  The five playgrounds from the lesson, on one page. Everything runs in your browser.
  Playgrounds 02 and 05 use <strong>real precomputed OpenAI vectors</strong>; the rest is
  exact browser code.</p>
  ${items}
  <p style="margin-top:2.4em"><a class="btn primary" href="/deck/">Now take the lesson &rarr;</a></p>
</div>`;

  return page({
    title: 'RAG playgrounds — chunking, embeddings, retrieval',
    desc: 'Five interactive RAG playgrounds: corpus scale, embedding neighbourhoods, chunking, retrieval scoring, and the silent embedding-model mismatch.',
    active: '/play/',
    body,
    extraCss: '<script defer src="/deck/data.js"></script>\n' +
              '<script defer src="/deck/interactive.js"></script>',
  });
}

/* ------------------------------------------------------------- reading */
/* The deck is a 1280x780 canvas; scaled into a phone it gives 15px headings.
   This renders the same slides as a flowing document - real headings, real
   type, the widgets inline, and the narration woven in where it belongs. */
function buildRead(all, edit) {
  const short = edit === 'short';
  const slides = short ? all.filter((s) => s.core) : all;
  const base = short ? '/read/short/' : '/read/';
  const other = short
    ? '<a href="/read/">Switch to the full lesson &rarr;</a>'
    : '<a href="/read/short/">Prefer the short version? &rarr;</a>';
  const stage = /^\[[A-Z0-9][^\]]*\]$/;
  const parts = [];
  const chapters = [];

  slides.forEach((s, i) => {
    const isDivider = /divider/.test(s.body) || s.body.indexOf('class="rule"') !== -1;

    // strip the pieces we re-render ourselves
    let body = s.body
      .replace(/<span class="eyebrow">[\s\S]*?<\/span>\s*/, '')
      .replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>\s*/, '')
      .replace(/<div class="rule"><\/div>\s*/, '')
      .trim();

    const notes = s.notes.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => {
        const line = p.replace(/\s+/g, ' ');
        return stage.test(line)
          ? `<p class="read-stage">${esc(line)}</p>`
          : `<p>${esc(line)}</p>`;
      }).join('\n');

    if (isDivider) {
      const id = 'c' + (chapters.length + 1);
      chapters.push({ id, title: s.title, n: i + 1 });
      parts.push(`<section class="read-chapter" id="${id}">
  <span class="read-chapter-k">${esc(s.eyebrow || 'Part')}</span>
  <h2>${s.titleHtml}</h2>
  ${body}
  <div class="read-narration">${notes}</div>
</section>`);
      return;
    }

    parts.push(`<section class="read-slide" id="s${i + 1}">
  <div class="read-meta"><span class="n">${i + 1}</span>${s.eyebrow ? esc(s.eyebrow) : ''}</div>
  <h3>${s.titleHtml}</h3>
  ${body ? `<div class="read-visual">${body}</div>` : ''}
  ${notes ? `<div class="read-narration">${notes}</div>` : ''}
</section>`);
  });

  const toc = chapters.map((c) =>
    `<a href="#${c.id}"><b>${String(c.n).padStart(2, '0')}</b> ${esc(c.title)}</a>`).join('\n');

  const words = slides.reduce((a, s) => a + s.notes.split(/\s+/).filter(Boolean).length, 0);

  const body = `<div class="wrap read">
  <header class="read-head">
    <span class="eyebrow"><b>${short ? 'The short lesson' : 'The whole lesson'}</b> &middot; ${slides.length} slides &middot; ~${Math.round(words / 200)} min read</span>
    <h1>${short ? 'RAG, the short way.' : 'RAG, end to end.'}</h1>
    <p class="read-lede">${short
      ? 'The spine of the lesson: every demo, the two strongest playgrounds, and none of the asides. Same depth, fewer detours.'
      : 'Every slide, with what the presenter says underneath it, and the playgrounds where they belong. Nothing to install.'}</p>
    <p class="read-alt">${other}</p>
    <nav class="read-toc">${toc}</nav>
    <p class="read-alt">Presenting instead? <a href="${short ? '/deck/short/' : '/deck/'}">Open the deck &rarr;</a></p>
  </header>
  ${parts.join('\n')}
  <p class="read-end"><a class="btn primary" href="/play/">Play with the five widgets &rarr;</a></p>
</div>`;

  return page({
    title: short ? 'The short lesson — RAG, built in front of you'
                 : 'The lesson — RAG, built in front of you',
    desc: short
      ? 'The RAG lesson, tightened: every demo and the two strongest playgrounds, same depth, fewer detours.'
      : 'The whole RAG lesson as a document: every slide, the narration, and five interactive playgrounds. Nothing to install.',
    active: base,
    body,
    extraCss: '<script defer src="/deck/data.js"></script>\n' +
              '<script defer src="/deck/interactive.js"></script>',
  });
}

/* ------------------------------------------------------------- present */
function buildPresent(all) {
  function cueRows(slides) {
    const cues = [];
    slides.forEach((s, i) => {
      s.cues.forEach((c) => cues.push({ n: i + 1, cue: c, title: s.title }));
      if (s.widget) cues.push({ n: i + 1, cue: null, title: s.title, widget: true });
    });
    return cues.map((c) =>
      `<tr><td class="n">${c.n}</td><td>${esc(c.title)}</td><td>${
        c.widget
          ? '<em>interactive — drive it with the mouse</em>'
          : '<code>' + esc(c.cue) + '</code>'
      }</td></tr>`).join('\n');
  }

  const core = all.filter((s) => s.core);
  const wordsOf = (ss) => ss.reduce((a, s) => a + s.notes.split(/\s+/).filter(Boolean).length, 0);
  const fullMin = Math.round(wordsOf(all) / 135);
  const shortMin = Math.round(wordsOf(core) / 135);
  const slides = all;

  const cues = [];
  slides.forEach((s, i) => {
    s.cues.forEach((c) => cues.push({ n: i + 1, cue: c, title: s.title }));
    if (s.widget) cues.push({ n: i + 1, cue: null, title: s.title, widget: true });
  });

  const rows = cues.map((c) =>
    `<tr><td class="n">${c.n}</td><td>${esc(c.title)}</td><td>${
      c.widget
        ? '<em>interactive — drive it with the mouse</em>'
        : '<code>' + esc(c.cue) + '</code>'
    }</td></tr>`).join('\n');

  const body = `<div class="wrap tx" style="max-width:860px">
  <span class="eyebrow"><b>For the presenter</b> &middot; recording setup</span>
  <h1>Record it from here.</h1>
  <p style="color:var(--ink-soft);font-size:1.08rem">The deck is the whole instrument.
  Slides, live playgrounds and the terminal output are all on screen — you only need a
  second window for your notes.</p>

  <h2 style="margin-top:1.8em">Pick an edit</h2>
  <p style="color:var(--ink-soft)">Two cuts of the same lesson. Same rigour, same eight
  terminal demos, same code — the short edit simply carries fewer slides around them.
  Either one works on its own.</p>
  <div class="cards" style="margin:1.2em 0 0">
    <a class="card" href="/deck/short/" style="border-left:4px solid var(--teal)">
      <span class="k">Short edit</span>
      <h3>${core.length} slides &middot; ~${shortMin} min &rarr;</h3>
      <p>The spine: why RAG, both pipelines, what an embedding is, the build, and the
      silent failure. All eight demos, two playgrounds.</p>
    </a>
    <a class="card" href="/deck/" style="border-left:4px solid var(--accent)">
      <span class="k">Full lesson</span>
      <h3>${all.length} slides &middot; ~${fullMin} min &rarr;</h3>
      <p>Everything: the reference tables, the gotchas, the re-run trap, troubleshooting,
      the check-yourself drills and all five playgrounds.</p>
    </a>
  </div>

  <h2 style="margin-top:1.8em">Setup</h2>
  <ol class="steps">
    <li><strong>Open the deck</strong> and go fullscreen with <kbd>F</kbd>.
      <a class="btn ghost" style="margin-left:0.6em;padding:0.45em 0.9em" href="/deck/">Open the deck &rarr;</a></li>
    <li><strong>Press <kbd>S</kbd></strong> for the speaker window — your narration, a timer,
      and a preview of the next slide. Put it on your second monitor. Allow the popup the
      first time.</li>
    <li><strong>Record the deck window only</strong>, not the speaker window.</li>
    <li>If you are also running the demos in a terminal, run
      <code>./run.sh check</code> first — it makes a real API call and catches a dead key
      before you are on camera.</li>
  </ol>

  <div class="callout" style="margin:1.6em 0">
    <span class="label">One thing to know</span>
    The deck also has a <strong>Narration</strong> button (<kbd>T</kbd>) that shows the same
    notes inline, for people working through it alone. Leave it closed while you record —
    you want the speaker window instead.
  </div>

  <h2 style="margin-top:1.8em">Keys</h2>
  <table class="keys">
    <tr><td><kbd>&rarr;</kbd> <kbd>&larr;</kbd></td><td>next / previous slide</td></tr>
    <tr><td><kbd>S</kbd></td><td>speaker window</td></tr>
    <tr><td><kbd>F</kbd></td><td>fullscreen</td></tr>
    <tr><td><kbd>O</kbd></td><td>slide overview — good for jumping</td></tr>
    <tr><td><kbd>B</kbd></td><td>blank the screen</td></tr>
    <tr><td><kbd>T</kbd></td><td>narration drawer (for learners, not for recording)</td></tr>
  </table>

  <h2 style="margin-top:1.8em">Every cue, in order</h2>
  <p style="color:var(--ink-soft)">Where to switch to the terminal, and where to pick up the
  mouse. Generated from the deck, so it stays in step. Slide numbers are per edit.</p>

  <h3 style="margin-top:1.4em">Short edit &middot; ${core.length} slides</h3>
  <table class="cues">
    <tr><th>Slide</th><th>Title</th><th>What happens</th></tr>
    ${cueRows(core)}
  </table>

  <h3 style="margin-top:2em">Full lesson &middot; ${all.length} slides</h3>
  <table class="cues">
    <tr><th>Slide</th><th>Title</th><th>What happens</th></tr>
    ${rows}
  </table>
</div>`;

  return page({
    title: 'Presenting and recording — ragverse.diy',
    desc: 'How to present or record the RAG lesson from the deck: speaker view, keys, and every demo cue in order.',
    active: '/present/',
    body,
  });
}

/* ---------------------------------------------------------- deck edits */
/* The short deck is the same file with the non-core sections removed and
   its relative asset paths lifted one level, so /deck/short/ still loads
   /deck/'s vendored reveal, tokens and widget code. */
function buildShortDeck(rawHtml) {
  let out = rawHtml.replace(/<section\b([^>]*)>([\s\S]*?)<\/section>\s*/g,
    (whole, attrs) => (/data-track="core"/.test(attrs) ? whole : ''));

  out = out.replace(/\b(href|src)="(?!https?:|\/|data:|#)([^"]+)"/g,
                    (m, attr, url) => `${attr}="../${url}"`);
  out = out.replace('<div class="reveal">', '<div class="reveal" data-edit="short">');
  out = out.replace('<title>', '<title>Short edit — ');
  return out;
}

/* --------------------------------------------------------------- build */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

const slides = parseDeck();
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

copyDir(path.join(ROOT, 'slides'), path.join(DIST, 'deck'));

const rawDeck = read('slides', 'index.html');
fs.mkdirSync(path.join(DIST, 'deck', 'short'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'deck', 'short', 'index.html'), buildShortDeck(rawDeck));
fs.copyFileSync(path.join(ROOT, 'site', 'site.css'), path.join(DIST, 'site.css'));
fs.copyFileSync(path.join(ROOT, 'site', 'theme.js'), path.join(DIST, 'theme.js'));
fs.copyFileSync(path.join(ROOT, 'site', 'hero.js'), path.join(DIST, 'hero.js'));
fs.copyFileSync(path.join(ROOT, 'site', 'og.html'), path.join(DIST, 'og.html'));
fs.copyFileSync(path.join(ROOT, 'site', '404.html'), path.join(DIST, '404.html'));
if (fs.existsSync(path.join(ROOT, 'site', 'og.png'))) {
  fs.copyFileSync(path.join(ROOT, 'site', 'og.png'), path.join(DIST, 'og.png'));
}
fs.copyFileSync(path.join(ROOT, 'site', 'index.html'), path.join(DIST, 'index.html'));

fs.mkdirSync(path.join(DIST, 'play'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'play', 'index.html'), buildPlay(slides));

fs.mkdirSync(path.join(DIST, 'read'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'read', 'index.html'), buildRead(slides, 'full'));
fs.mkdirSync(path.join(DIST, 'read', 'short'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'read', 'short', 'index.html'), buildRead(slides, 'short'));

// /script/ was the narration-only page; /read/ supersedes it. Keep the old
// URL working rather than breaking anyone's link.
fs.mkdirSync(path.join(DIST, 'script'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'script', 'index.html'),
  '<!doctype html><meta charset="utf-8">' +
  '<title>Moved to /read/</title>' +
  '<link rel="canonical" href="/read/">' +
  '<meta http-equiv="refresh" content="0; url=/read/">' +
  '<p>This page is now at <a href="/read/">/read/</a>.</p>\n');

fs.mkdirSync(path.join(DIST, 'present'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'present', 'index.html'), buildPresent(slides));

const widgets = slides.filter((s) => s.widget).length;
const coreN = slides.filter((s) => s.core).length;
console.log(`built dist/`);
console.log(`  deck    ${slides.length} slides   (short edit: ${coreN})`);
console.log(`  play    ${widgets} playgrounds`);
console.log(`  read    ${slides.length} slides as a document`);
console.log(`  present cue sheet`);
