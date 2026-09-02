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
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// counts read as words in prose and as numerals in tables
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
               'eight', 'nine', 'ten'];
const spell = (n) => WORDS[n] || String(n);

/* ------------------------------------------------------------ parse deck */
/* Locate one narration aside by class, tolerating attributes on the tag.
   Returns [openIndex, contentStart, contentEnd] or null. */
function findAside(html, cls) {
  const m = new RegExp(`<aside class="${cls}"[^>]*>`).exec(html);
  if (!m) return null;
  const start = m.index + m[0].length;
  return [m.index, start, html.indexOf('</aside>', start)];
}
const asideText = (html, cls) => {
  const at = findAside(html, cls);
  return at ? html.slice(at[1], at[2]).trim() : '';
};

function parseDeck() {
  const html = read('slides', 'index.html');
  const out = [];
  const re = /<section\b([^>]*)>([\s\S]*?)<\/section>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const raw = m[2];
    const at = findAside(raw, 'notes');
    const body = at ? raw.slice(0, at[0]) : raw;
    // a slide may carry a second <aside class="talk">, so stop at our own close
    const notes = asideText(raw, 'notes');
    const briefNotes = asideText(raw, 'brief');
    const talkNotes = asideText(raw, 'talk');
    const talkTitle = (attrs.match(/data-talk-title="([^"]*)"/) || [])[1] || '';

    const h = body.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/);
    const eb = body.match(/<span class="eyebrow">([\s\S]*?)<\/span>/);
    const cues = [...body.matchAll(/<span class="cmd">([\s\S]*?)<\/span>/g)].map((c) => c[1]);
    const widget = (body.match(/id="(ix-[a-z]+)"/) || [])[1] || null;

    out.push({
      essential: /data-track="essential"/.test(attrs),
      core: /data-track="(core|essential)"/.test(attrs),
      briefNotes,
      talkNotes,
      talkTitle,
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
const FONTS = [
  '<link rel="preload" as="font" type="font/woff2" crossorigin href="/deck/fonts/bricolage-grotesque-latin-4efd1a.woff2">',
  '<link rel="preload" as="font" type="font/woff2" crossorigin href="/deck/fonts/source-serif-4-latin-673d4d.woff2">',
  '<link rel="preload" as="font" type="font/woff2" crossorigin href="/deck/fonts/jetbrains-mono-latin-1cd702.woff2">',
  '<link rel="stylesheet" href="/deck/fonts.css">',
].join('\n');

const FAVICON =
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 ' +
  'viewBox=%270 0 16 16%27%3E%3Ctext y=%2713%27 font-size=%2713%27%3E%F0%9F%94%8D%3C/text%3E%3C/svg%3E">';

function nav(active) {
  const item = (href, label, cls = '') => {
    // any /read/ edition should light up "The lesson", not just the full one
    const here = active === href ||
      (href === '/read/' && active.startsWith('/read/')) ||
      (href === '/deck/' && active.startsWith('/deck/'));
    return `<a class="${['link', cls, here ? 'on' : ''].filter(Boolean).join(' ')}"` +
           ` href="${href}"${here ? ' aria-current="page"' : ''}>${label}</a>`;
  };
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
const WPM = 125;   // presenting pace, including pauses

/* Which narration a given edition actually speaks. buildDeckVariant, the reading
   view and every timing on the site all have to agree about this, so it lives in
   exactly one place. The tightened prose is written mode-neutral, which is why it
   wins over the talk variant in the short and essentials editions. */
const notesFor = (s, length, talk) =>
  (length !== 'full' && s.briefNotes) ? s.briefNotes
    : (talk && s.talkNotes) ? s.talkNotes
      : s.notes;
const wordsOf = (t) => t.split(/\s+/).filter(Boolean).length;
const minutes = (ss, length, talk) =>
  Math.round(ss.reduce((a, s) => a + wordsOf(notesFor(s, length, talk)), 0) / WPM);

function page({ title, desc, active, body, extraCss = '', bodyAttr = '',
                noindex = false }) {
  const discovery = noindex
    ? '<meta name="robots" content="noindex">'
    : `<link rel="canonical" href="${SITE}${active}">
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
<meta name="twitter:image" content="${SITE}/og.png">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${discovery}
<meta name="theme-color" content="#f6f6f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1216" media="(prefers-color-scheme: dark)">
${FAVICON}
${FONTS}
<script>(function(){try{var m=localStorage.getItem("ragverse.theme");
if(m)document.documentElement.setAttribute("data-theme",m);}catch(e){}})();</script>
<link rel="stylesheet" href="/deck/tokens.css">
<link rel="stylesheet" href="/deck/theme.css">
<link rel="stylesheet" href="/deck/syntax.css">
<link rel="stylesheet" href="/site.css">
${extraCss}
</head>
<body${bodyAttr}>
<a class="skip" href="#main">Skip to content</a>
${nav(active)}
<main id="main">
${body}
</main>
<footer><div class="wrap row">
  <span>Built as a work-along lesson. Every claim executed, not asserted.</span>
  <span class="sp"><a href="/read/">The lesson</a> &middot; <a href="/play/">Playgrounds</a>
  &middot; <a href="/deck/">Deck</a> &middot; <a href="/present/">Present</a>
  &middot; <a href="https://github.com/Xaxis/sou-rag-presentation">Source</a></span>
</div></footer>
<script src="/theme.js"></script>
</body>
</html>`;
}

/* --------------------------------------------------------- playgrounds */
/* Numbering, anchors and titles come from the deck's own order. A widget added
   to a slide appears here without touching this file - there is no list to
   forget. The one thing markup cannot tell us is which widgets run on the
   precomputed vectors, because they read window.RAG_DATA at runtime; that set
   is named here and checked against the deck, so a rename fails the build
   rather than quietly mislabelling a playground as a simulation. */
const REAL_VECTOR_WIDGETS = ['ix-embed', 'ix-retr', 'ix-mismatch'];

function buildPlay(slides) {
  const found = slides.filter((s) => s.widget);
  const ids = found.map((s) => s.widget);
  for (const w of REAL_VECTOR_WIDGETS) {
    if (!ids.includes(w)) {
      throw new Error(`REAL_VECTOR_WIDGETS names ${w}, which is not in the deck`);
    }
  }
  const meta = found.map((s, i) => ({
    id: s.widget.replace(/^ix-/, ''),
    n: String(i + 1).padStart(2, '0'),
    title: cap(s.title.replace(/^Try it:\s*/i, '')),
    real: REAL_VECTOR_WIDGETS.includes(s.widget),
    slide: s,
  }));

  const items = meta.map((m) => {
    // drop the eyebrow and the heading; we re-render those ourselves
    const body = m.slide.body
      .replace(/<span class="eyebrow">[\s\S]*?<\/span>\s*/, '')
      .replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>\s*/, '');
    return `<article class="pg-item" id="${m.id}">
  <span class="pg-num">Playground ${m.n}${m.real ? ' &middot; real vectors' : ''}</span>
  <h2>${m.title}</h2>
  ${body.trim()}
</article>`;
  }).join('\n');

  const jump = meta.map((m) =>
    `<a href="#${m.id}"><b>${m.n}</b> ${esc(m.title)}</a>`).join('\n');
  const realN = meta.filter((m) => m.real);
  const list = (ns) => ns.length < 2 ? ns[0]
    : ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1];

  const body = `<div class="wrap pg">
  <span class="eyebrow"><b>Interactive</b> &middot; no API key, no install</span>
  <h1>Take it apart.</h1>
  <p style="max-width:56ch;color:var(--ink-soft);font-size:1.1rem">
  The ${spell(meta.length)} playgrounds from the lesson, on one page. Everything runs in your
  browser. Playground${realN.length > 1 ? 's' : ''} ${list(realN.map((m) => m.n))} use
  <strong>real precomputed OpenAI vectors</strong>; the chunking is exact browser code.</p>
  <nav class="read-toc pg-jump">${jump}</nav>
  ${items}
  <p style="margin-top:2.4em"><a class="btn primary" href="/read/essentials/">Now take the lesson &rarr;</a></p>
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
  const talk = /talk/.test(edit);
  const length = /essentials/.test(edit) ? 'essentials'
               : /short/.test(edit) ? 'short' : 'full';
  const slides = length === 'essentials' ? all.filter((s) => s.essential)
               : length === 'short' ? all.filter((s) => s.core)
               : all;
  const seg = (len) => (len === 'full' ? '' : len + '/');
  const base = '/read/' + (talk ? 'talk' + (length === 'full' ? '/' : '-' + seg(length))
                                : seg(length));
  const link = (len, label) =>
    `<a href="/read/${talk ? 'talk' + (len === 'full' ? '/' : '-' + seg(len)) : seg(len)}">${label}</a>`;
  const others = ['essentials', 'short', 'full'].filter((l) => l !== length)
    .map((l) => link(l, l === 'full' ? 'the full lesson'
                     : l === 'short' ? 'the short edition' : 'the essentials'));
  const other = 'Also available as ' + others.join(' or ') + '.';
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

    if (talk) {
      // the command is provenance for the output above it, not an instruction
      body = body
        .replace(/<span class="label">Demo&nbsp;\d+<\/span>/g, '<span class="label">Output of</span>')
        .replace(/<span class="label">Demo<\/span>/g, '<span class="label">Output of</span>');
    }

    const notes = notesFor(s, length, talk).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => {
        const line = p.replace(/\s+/g, ' ');
        return stage.test(line)
          ? `<p class="read-stage">${esc(line)}</p>`
          : `<p>${esc(line)}</p>`;
      }).join('\n');

    const heading = talk && s.talkTitle ? esc(s.talkTitle) : s.titleHtml;

    if (isDivider) {
      const id = 'c' + (chapters.length + 1);
      chapters.push({ id, title: s.title, n: i + 1 });
      parts.push(`<section class="read-chapter" id="${id}">
  <span class="read-chapter-k">${esc(s.eyebrow || 'Part')}
    <a href="#contents">contents &uarr;</a></span>
  <h2>${heading}</h2>
  ${body}
  <div class="read-narration">${notes}</div>
</section>`);
      return;
    }

    // Slides sit under chapters, so they are h3 - but the opening slides come
    // before any chapter exists, and jumping h1 -> h3 is a real skip for a
    // screen reader. Until the first chapter, a slide IS the top-level section.
    const hl = chapters.length ? 3 : 2;
    parts.push(`<section class="read-slide" id="s${i + 1}">
  <div class="read-meta"><span class="n">${i + 1}</span>${s.eyebrow ? esc(s.eyebrow) : ''}</div>
  <h${hl}>${heading}</h${hl}>
  ${body ? `<div class="read-visual">${body}</div>` : ''}
  ${notes ? `<div class="read-narration">${notes}</div>` : ''}
</section>`);
  });

  const toc = chapters.map((c) =>
    `<a href="#${c.id}"><b>${String(c.n).padStart(2, '0')}</b> ${esc(c.title)}</a>`).join('\n');

  const words = slides.reduce((a, s) => a + wordsOf(notesFor(s, length, talk)), 0);
  const spoken = Math.round(words / WPM);

  const body = `<div class="wrap read">
  <header class="read-head">
    <span class="eyebrow"><b>${length === 'essentials' ? 'The essentials'
      : length === 'short' ? 'The short lesson' : 'The whole lesson'}${talk ? ', as a talk' : ''}</b> &middot; ${slides.length} slides &middot; ~${spoken} min spoken &middot; ~${Math.round(words / 220)} min to read</span>
    <h1>${length === 'essentials' ? 'RAG, the short way.'
         : length === 'short' ? 'RAG, the fast way.' : 'RAG, end to end.'}</h1>
    <p class="read-lede">${length === 'essentials'
      ? `The whole arc in about ${spoken} minutes: why RAG exists, both pipelines, what an embedding really is, the build, and the mistake that fails silently. All eight demos, tightened prose, nothing skipped that matters.`
      : talk
      ? 'Narrated as a talk: the code is shown and explained, not typed live. Every terminal block is genuine output. Follow along in the repo if you want to, or just read.'
      : length === 'short'
      ? 'The spine plus the material that makes it stick — the gotchas, the API key, the practical rules — at the same tight pace as the essentials.'
      : 'Every slide, with what the presenter says underneath it, and the playgrounds where they belong. Nothing to install.'}</p>
    <p class="read-alt">${other}</p>
    <nav class="read-toc" id="contents">${toc}</nav>
    <p class="read-alt">Presenting instead? <a href="/deck/${talk ? 'talk' + (length === 'full' ? '/' : '-' + seg(length)) : seg(length)}">Open the deck &rarr;</a></p>
  </header>
  ${parts.join('\n')}
  <p class="read-end"><a class="btn primary" href="/play/">Play with the five widgets &rarr;</a></p>
</div>`;

  return page({
    title: length === 'essentials' ? `The essentials — RAG in about ${spoken} minutes`
         : length === 'short' ? 'The short lesson — RAG, built in front of you'
         : 'The lesson — RAG, built in front of you',
    desc: length === 'essentials'
      ? `The whole RAG lesson in about ${spoken} minutes: both pipelines, what an embedding is, the build, and the silent failure.`
      : length === 'short'
      ? 'The RAG lesson, tightened: every demo and the two strongest playgrounds, same depth, fewer detours.'
      : 'The whole RAG lesson as a document: every slide, the narration, and five interactive playgrounds. Nothing to install.',
    active: base,
    body,
    bodyAttr: talk ? ' data-mode="talk"' : '',
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
        c.widget ? '<em>interactive — drive it with the mouse</em>'
                 : '<code>' + esc(c.cue) + '</code>'
      }</td></tr>`).join('\n');
  }

  const TIERS = [
    { key: 'essentials', label: 'Essentials',
      slides: all.filter((s) => s.essential),
      blurb: 'The whole arc, tightened. Both pipelines, what an embedding is, the build, and the silent failure — all eight demos. Slides only, no interactive widgets.' },
    { key: 'short', label: 'Short',
      slides: all.filter((s) => s.core),
      blurb: 'Everything in the essentials, plus the gotchas, the API key, the practical rules, and two of the interactive playgrounds.' },
    { key: 'full', label: 'Full',
      slides: all,
      blurb: 'Everything: reference tables, the loader gotchas, the re-run trap, troubleshooting, the drills, and all five playgrounds.' },
  ];

  // one demo takes roughly a minute and a half including talking through it
  const demoMins = (ss) => Math.round(ss.filter((s) => s.cues.length).length * 1.5);

  const url = (tier, talk) => talk
    ? (tier === 'full' ? '/deck/talk/' : `/deck/talk-${tier}/`)
    : (tier === 'full' ? '/deck/' : `/deck/${tier}/`);

  const rows = TIERS.map((t) => {
    const dm = demoMins(t.slides);
    return `<tr>
      <td><strong>${t.label}</strong><br><span class="muted">${t.slides.length} slides</span></td>
      <td><a href="${url(t.key, true)}">~${minutes(t.slides, t.key, true)} min</a><br><span class="muted">talk only</span></td>
      <td><a href="${url(t.key, false)}">~${minutes(t.slides, t.key, false) + dm} min</a><br><span class="muted">work-along</span></td>
      <td>${t.blurb}</td>
    </tr>`;
  }).join('\n');

  const ess = TIERS[0];
  const essTalk = minutes(ess.slides, 'essentials', true);
  const body = `<div class="wrap tx" style="max-width:900px">
  <span class="eyebrow"><b>For the presenter</b> &middot; recording setup</span>
  <h1>Record it from here.</h1>
  <p style="color:var(--ink-soft);font-size:1.08rem">The deck is the whole instrument.
  Slides, live playgrounds and the terminal output are all on screen — you only need a
  second window for your notes.</p>

  <div class="pick">
    <span class="k">Start here</span>
    <h2>Essentials, talk only</h2>
    <p class="n">${essTalk} min &middot; ${ess.slides.length} slides &middot; nothing to run</p>
    <p>The whole argument and all eight demos, with the output already on screen and the
    prose written tight. Nothing to set up, and nothing that can fail on camera.</p>
    <p><a class="btn primary" href="${url('essentials', true)}">Open the deck &rarr;</a>
    <a class="btn ghost" href="${url('essentials', false)}">Run the demos live instead
    &middot; ${minutes(ess.slides, 'essentials', false) + demoMins(ess.slides)} min</a></p>
  </div>

  <h2 style="margin-top:2em">Or pick another edition</h2>
  <p style="color:var(--ink-soft)">Two questions: how long, and do you run the code live?
  Every combination is a complete lesson — the slides and the output are identical.
  <strong>Talk only</strong> means the output is already on screen and you explain it;
  <strong>work-along</strong> means you switch to a terminal and run it.</p>
  <table class="cues" style="margin-top:1em">
    <tr><th>Edition</th><th>Talk only</th><th>Work-along</th><th>What it carries</th></tr>
    ${rows}
  </table>

  <h2 style="margin-top:1.8em">Setup</h2>
  <ol class="steps">
    <li><strong>Open the deck</strong> and press <kbd>S</kbd> for the speaker window. Allow
      the popup the first time, and drag it to your second monitor.
      <em>Do this before going fullscreen</em> — opening a window from a fullscreen tab can
      drop you back out of it.</li>
    <li><strong>Click back into the deck</strong> and press <kbd>F</kbd> for fullscreen.</li>
    <li><strong>Record the deck window only</strong>, not the speaker window.</li>
    <li><strong>One monitor?</strong> Skip the speaker window and press <kbd>T</kbd>
      instead — the same narration, in a drawer under the slide. Close it before you
      start recording and read from <a href="/read/talk-essentials/">the lesson page</a>
      on a phone or tablet.</li>
    <li><strong>Work-along editions only:</strong> run <code>./run.sh check</code> first — it
      makes a real API call and catches a dead key before you are on camera. Rehearse once and
      the embedding cache means the take cannot fail on network.</li>
  </ol>

  <div class="callout" style="margin:1.6em 0">
    <span class="label">What the speaker window gives you</span>
    Your narration in full paragraphs, at reading size — the same words the deck's
    <strong>Narration</strong> drawer (<kbd>T</kbd>) shows, so pressing <kbd>S</kbd> closes
    that drawer for you rather than leaving it in frame. Beside the clock is a
    <strong>pacing</strong> readout: how long you should still be on the slide you are on.
    It counts down as you talk and turns red when you are running behind, so a
    ${essTalk}-minute talk actually lands near ${essTalk} minutes without you watching
    a stopwatch.
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
  <p style="color:var(--ink-soft);margin-top:0.9em">Need a handout? Add
  <code>?print-pdf</code> to the deck's address and print to PDF — one page per slide,
  narration included.</p>

  <h2 style="margin-top:1.8em">Every cue, in order</h2>
  <p style="color:var(--ink-soft)">Where to switch to the terminal, and where to pick up the
  mouse. Generated from the deck, so it stays in step. Slide numbers are per edition.</p>
  ${TIERS.map((t) => `<h3 style="margin-top:1.6em">${t.label} &middot; ${t.slides.length} slides</h3>
  <table class="cues">
    <tr><th>Slide</th><th>Title</th><th>What happens</th></tr>
    ${cueRows(t.slides)}
  </table>`).join('\n')}
</div>`;

  return page({
    title: 'Presenting and recording — ragverse.diy',
    desc: 'How to present or record the RAG lesson: three lengths, talk or work-along, speaker view, and every demo cue in order.',
    active: '/present/',
    body,
  });
}

/* ---------------------------------------------------------- deck edits */
/* The short deck is the same file with the non-core sections removed and
   its relative asset paths lifted one level, so /deck/short/ still loads
   /deck/'s vendored reveal, tokens and widget code. */
function buildDeckVariant(rawHtml, { length, talk }) {
  let out = rawHtml;

  // 1. drop the slides this length does not carry
  if (length !== 'full') {
    const keep = length === 'essentials'
      ? /data-track="essential"/
      : /data-track="(core|essential)"/;
    out = out.replace(/<section\b([^>]*)>([\s\S]*?)<\/section>\s*/g,
      (whole, attrs) => (keep.test(attrs) ? whole : ''));
  }

  // 2. pick the narration for this edition, then remove the unused variants.
  //    essentials uses the brief notes, which are written mode-neutral;
  //    otherwise talk mode swaps in the talk notes where a slide has them.
  out = out.replace(/<section\b([^>]*)>([\s\S]*?)<\/section>/g, (whole, attrs, body) => {
    const pull = (b, cls) => {
      const at = findAside(b, cls);
      if (!at) return [b, null];
      return [b.slice(0, at[0]) + b.slice(at[2] + 8), b.slice(at[1], at[2])];
    };
    const setNotes = (b, text) => {
      const at = findAside(b, 'notes');
      return at ? b.slice(0, at[1]) + text + b.slice(at[2]) : b;
    };

    let [b, brief] = pull(body, 'brief');
    let talkText;
    [b, talkText] = pull(b, 'talk');

    if (length !== 'full' && brief) {
      // essentials and short both run on the tightened prose; only the full
      // edition keeps the unhurried version
      b = setNotes(b, brief);
    } else if (talk && talkText) {
      b = setNotes(b, talkText);
    }

    // a title that assumes a live terminal is wrong in every talk edition,
    // whichever narration that edition happens to be using
    if (talk) {
      const t = (attrs.match(/data-talk-title="([^"]*)"/) || [])[1];
      if (t) b = b.replace(/(<h[12][^>]*>)[\s\S]*?(<\/h[12]>)/, `$1${t}$2`);
    }
    return `<section${attrs}>${b}</section>`;
  });

  // 3. lift relative asset paths one level, since variants live in a subdir
  out = out.replace(/\b(href|src)="(?!https?:|\/|data:|#)([^"]+)"/g,
                    (m, attr, url) => `${attr}="../${url}"`);

  if (talk) {
    out = out.replace(/<body>/, '<body data-mode="talk">');
    out = out.replace(/<span class="label">Demo&nbsp;\d+<\/span>/g,
                      '<span class="label">Output of</span>');
    out = out.replace(/<span class="label">Demo<\/span>/g,
                      '<span class="label">Output of</span>');
  }

  const edit = `${length}-${talk ? 'talk' : 'workalong'}`;
  out = out.replace('<div class="reveal">', `<div class="reveal" data-edit="${edit}">`);
  const label = (talk ? 'Talk' : 'Work-along') + (length === 'full' ? '' : `, ${length}`);
  out = out.replace('<title>', `<title>${label} — `);
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
const DECK_VARIANTS = [
  ['short',           { length: 'short',      talk: false }],
  ['essentials',      { length: 'essentials', talk: false }],
  ['talk',            { length: 'full',       talk: true  }],
  ['talk-short',      { length: 'short',      talk: true  }],
  ['talk-essentials', { length: 'essentials', talk: true  }],
];
for (const [dir, opts] of DECK_VARIANTS) {
  fs.mkdirSync(path.join(DIST, 'deck', dir), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'deck', dir, 'index.html'),
                   buildDeckVariant(rawDeck, opts));
}
// the default deck still needs its talk asides stripped out
fs.writeFileSync(path.join(DIST, 'deck', 'index.html'),
  rawDeck.replace(/\s*<aside class="(talk|brief)">[\s\S]*?<\/aside>/g, ''));
fs.copyFileSync(path.join(ROOT, 'site', 'site.css'), path.join(DIST, 'site.css'));
fs.copyFileSync(path.join(ROOT, 'site', 'theme.js'), path.join(DIST, 'theme.js'));
fs.copyFileSync(path.join(ROOT, 'site', 'hero.js'), path.join(DIST, 'hero.js'));
fs.writeFileSync(path.join(DIST, '404.html'), page({
  title: 'Not found — ragverse.diy',
  desc: 'Nothing at this address.',
  active: '/404',
  noindex: true,
  body: `<div class="wrap tx" style="max-width:640px">
  <span class="eyebrow"><b>404</b> &nbsp;&middot;&nbsp; nothing retrieved</span>
  <h1 style="font-size:clamp(2.2rem,6vw,3.4rem)">No chunk matched.</h1>
  <p style="color:var(--ink-soft);font-size:1.08rem;max-width:38ch">
  A retriever always returns something, even when nothing fits. This page is the
  honest version of that — there is genuinely nothing here.</p>
  <div class="cta" style="margin-top:2em">
    <a class="btn primary" href="/read/essentials/">Start the lesson &rarr;</a>
    <a class="btn ghost" href="/play/">Playgrounds</a>
    <a class="btn ghost" href="/present/">Present or record</a>
  </div>
</div>`,
}));

if (fs.existsSync(path.join(ROOT, 'site', 'og.png'))) {
  fs.copyFileSync(path.join(ROOT, 'site', 'og.png'), path.join(DIST, 'og.png'));
}
{
  const coreSlides = slides.filter((s) => s.core);
  const essSlides = slides.filter((s) => s.essential);
  const vals = {
    FULL_SLIDES: slides.length, SHORT_SLIDES: coreSlides.length,
    ESS_SLIDES: essSlides.length,
    FULL_MIN: minutes(slides, 'full', false),
    SHORT_MIN: minutes(coreSlides, 'short', false),
    ESS_MIN: minutes(essSlides, 'essentials', false),
    PLAYGROUNDS: slides.filter((s) => s.widget).length,
    // Count the numbered demos the lesson actually runs, from the deck's own
    // cues. Reading demo/ would be the more obvious source and is wrong:
    // .vercelignore excludes that directory, so the build would work locally
    // and fail on deploy - which is exactly what it did.
    DEMOS: new Set(slides.flatMap((s) => s.cues)
             .flatMap((c) => c.match(/\b(\d\d)_[a-z_]+\.py\b/) || [])
             .filter((m) => /^\d\d$/.test(m))).size,
  };
  const fill = (file) => {
    let out = read('site', file);
    for (const [k, v] of Object.entries(vals)) out = out.split(`{{${k}}}`).join(String(v));
    const left = out.match(/\{\{[A-Z_]+\}\}/g);
    if (left) throw new Error(`unfilled placeholders in site/${file}: ${left.join(', ')}`);
    return out;
  };
  fs.writeFileSync(path.join(DIST, 'index.html'), fill('index.html'));
  // the social card is generated from the same numbers, so it cannot drift
  // from the site it advertises
  fs.writeFileSync(path.join(DIST, 'og.html'), fill('og.html'));
}

fs.mkdirSync(path.join(DIST, 'play'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'play', 'index.html'), buildPlay(slides));

fs.mkdirSync(path.join(DIST, 'read'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'read', 'index.html'), buildRead(slides, 'full'));
for (const v of ['short', 'essentials', 'talk', 'talk-short', 'talk-essentials']) {
  fs.mkdirSync(path.join(DIST, 'read', v), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'read', v, 'index.html'), buildRead(slides, v));
}

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

/* robots + sitemap, walked out of dist/ once everything is written, so a new
   route is in the sitemap the moment it exists rather than when someone
   remembers to add it to a list. */
const routes = [];
(function walk(dir, url) {
  if (fs.existsSync(path.join(dir, 'index.html'))) routes.push(url);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== 'fonts' && e.name !== 'vendor') {
      walk(path.join(dir, e.name), `${url}${e.name}/`);
    }
  }
})(DIST, '/');
// /script/ is a redirect stub kept alive for old links; it is not a page
const pages = routes.filter((r) => r !== '/script/').sort();
fs.writeFileSync(path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map((r) =>
    `  <url><loc>${SITE}${r}</loc><changefreq>monthly</changefreq>` +
    `<priority>${r === '/' ? '1.0' : r.startsWith('/read') ? '0.9' : '0.7'}</priority></url>`
  ).join('\n') + '\n</urlset>\n');

const widgets = slides.filter((s) => s.widget).length;
const tier = (ss, key) =>
  `${String(ss.length).padStart(2)} slides  ~${minutes(ss, key, true)} min talk` +
  `  ~${minutes(ss, key, false) + Math.round(ss.filter((s) => s.cues.length).length * 1.5)} min work-along`;
console.log(`built dist/  (${pages.length} pages)`);
console.log(`  essentials  ${tier(slides.filter((s) => s.essential), 'essentials')}`);
console.log(`  short       ${tier(slides.filter((s) => s.core), 'short')}`);
console.log(`  full        ${tier(slides, 'full')}`);
console.log(`  play        ${widgets} playgrounds`);
