/* Interactive widgets for the RAG deck.
 *
 * Five of them, all driven from the slide markup by id. Two use real
 * precomputed OpenAI vectors (data.js); the chunking and retrieval
 * playgrounds run entirely in the browser with no API key, and say so.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tokens = (chars) => Math.round(chars / 4);

  /* Reveal listens for arrow keys and space globally. Without this, typing a
     space in a question box would advance the slide. */
  function isolate(root) {
    root.querySelectorAll('input, textarea, button').forEach((el) => {
      ['keydown', 'keypress', 'keyup'].forEach((evt) =>
        el.addEventListener(evt, (e) => e.stopPropagation())
      );
    });
  }

  /* ================================================== 1. scale explorer */
  function scaleExplorer() {
    const root = $('ix-scale');
    if (!root) return;
    const slider = $('sc-size');

    function render() {
      // slider is an exponent: 6 = 1 MB ... 15 = 1 PB
      const exp = +slider.value;
      const bytes = Math.pow(10, exp);
      const chars = bytes;                 // ~1 byte per char for plain text
      const toks = Math.round(chars / 4);
      const chunks = Math.ceil(chars / 800);
      const windows = toks / 2e6;          // 2M-token frontier window
      const cost = (toks / 1e6) * 0.02;    // text-embedding-3-small, $0.02/M

      $('sc-label').textContent = humanBytes(bytes);
      $('sc-tokens').textContent = short(toks);
      $('sc-chunks').textContent = short(chunks);
      $('sc-cost').textContent = cost < 0.01 ? '<$0.01' : '$' + short(cost, true);
      $('sc-windows').textContent =
        windows < 1 ? (windows * 100).toFixed(0) + '%' : short(Math.ceil(windows)) + '×';
      $('sc-verdict').innerHTML =
        windows <= 1
          ? 'Fits in one prompt. <b>You do not need RAG for this.</b>'
          : 'Needs <b>' + short(Math.ceil(windows)) + ' full context windows</b>. ' +
            'Retrieval is the only option.';
    }

    function humanBytes(b) {
      const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      let i = 0, v = b;
      while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
      return (v < 10 ? v.toFixed(1) : Math.round(v)) + ' ' + u[i];
    }
    function short(n, money) {
      if (n < 1000) return money ? n.toFixed(2) : fmt(Math.round(n));
      const u = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['k', 1e3]];
      for (const [s, d] of u) if (n >= d) return (n / d).toFixed(1).replace(/\.0$/, '') + s;
      return fmt(Math.round(n));
    }

    slider.addEventListener('input', render);
    isolate(root);
    render();
  }

  /* ============================================ 2. embedding explorer */
  function embeddingExplorer() {
    const root = $('ix-embed');
    if (!root || !window.RAG_DATA) return;
    const D = window.RAG_DATA;
    let probe = D.words.indexOf('cat');

    const chips = $('em-chips');
    chips.innerHTML = D.words
      .map((w, i) => `<span class="ix-chip" data-i="${i}">${w}</span>`)
      .join('');
    chips.addEventListener('click', (e) => {
      const c = e.target.closest('.ix-chip');
      if (c) { probe = +c.dataset.i; render(); }
    });

    function render() {
      chips.querySelectorAll('.ix-chip').forEach((c, i) =>
        c.classList.toggle('on', i === probe)
      );

      const rows = D.words
        .map((w, i) => ({ w, i, s: D.similarity[probe][i] }))
        .filter((r) => r.i !== probe)
        .sort((a, b) => b.s - a.s);

      $('em-bars').innerHTML = rows
        .map((r) => {
          const pct = Math.max(0, Math.min(100, (r.s / 0.8) * 100));
          return `<div class="ix-bar"><span class="w">${r.w}</span>` +
            `<span class="track"><span class="fill ${D.groups[r.w]}" ` +
            `style="width:${pct.toFixed(1)}%"></span></span>` +
            `<span class="n">${r.s.toFixed(3)}</span></div>`;
        })
        .join('');

      $('em-probe').textContent = D.words[probe];
      $('em-top').textContent = rows[0].w + ' · ' + rows[0].s.toFixed(3);
      $('em-far').textContent = rows[rows.length - 1].w + ' · ' +
        rows[rows.length - 1].s.toFixed(3);

      // scatter
      const W = 620, H = 190, P = 26;
      const pts = D.coords.map(([x, y], i) => ({
        x: P + ((x + 1) / 2) * (W - 2 * P),
        y: P + ((y + 1) / 2) * (H - 2 * P),
        w: D.words[i], g: D.groups[D.words[i]], i,
      }));
      const colour = { animals: 'var(--accent)', fruit: 'var(--teal)', drinks: '#7a6fd3' };
      // simple label de-collision: nudge a label down if it lands on another
      const placed = [];
      pts.forEach((p) => {
        p.ly = p.y + 3.5;
        let guard = 0;
        while (placed.some((q) => Math.abs(q.x - p.x) < 52 &&
                                  Math.abs(q.ly - p.ly) < 11) && guard++ < 8) {
          p.ly += 11;
        }
        placed.push(p);
      });

      $('em-scatter').innerHTML =
        `<svg class="ix-scatter" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">` +
        pts.map((p) =>
          `<g class="pt" data-i="${p.i}">` +
          `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" ` +
          `r="${p.i === probe ? 7 : 4}" fill="${colour[p.g]}" ` +
          `opacity="${p.i === probe ? 1 : 0.55}"/>` +
          `<text x="${(p.x + 9).toFixed(1)}" y="${p.ly.toFixed(1)}" ` +
          `class="${p.i === probe ? 'on' : ''}">${p.w}</text></g>`
        ).join('') + '</svg>';
      $('em-scatter').querySelectorAll('.pt').forEach((g) =>
        g.addEventListener('click', () => { probe = +g.dataset.i; render(); })
      );
    }
    isolate(root);
    render();
  }

  /* ============================================= 3. chunking playground */
  const CHUNK_DOC =
`Tesla, Inc. is an American multinational automotive and clean energy company. Headquartered in Austin, Texas, it designs, manufactures and sells battery electric vehicles, stationary battery energy storage devices, solar panels and related products and services.

The company was incorporated in July 2003 by Martin Eberhard and Marc Tarpenning as Tesla Motors. Its name is a tribute to the inventor and electrical engineer Nikola Tesla. In February 2004, Elon Musk led Tesla's first funding round and became the company's chairman; in 2008 he was named chief executive officer.

Tesla began production of its first car, the Roadster, in 2008, followed by the Model S sedan in 2012, the Model X SUV in 2015, the Model 3 sedan in 2017 and the Model Y crossover in 2020. The Model 3 became the best selling electric car worldwide, and in 2023 the Model Y became the best selling vehicle of any kind.

Tesla is one of the world's most valuable companies by market capitalisation. The company operates vehicle factories in California, Texas, Shanghai and Berlin, and produces battery cells and energy storage products at several sites. Its energy division sells solar generation and grid scale storage under the Powerwall and Megapack names.

The company has been the subject of significant controversy, including lawsuits over its driver assistance branding, workplace conditions at its factories, and public statements made by its chief executive. Several regulatory investigations have examined the safety record of its Autopilot system.`;

  function chunkText(text, size, overlap) {
    if (overlap >= size) overlap = Math.max(0, size - 10);
    const out = [];
    let i = 0;
    while (i < text.length) {
      let end = Math.min(i + size, text.length);
      if (end < text.length) {
        const sp = text.lastIndexOf(' ', end);
        if (sp > i + size * 0.6) end = sp;
      }
      // never begin a chunk mid-word: nudge the start to the next boundary
      let s0 = i;
      if (s0 > 0 && text[s0 - 1] !== ' ' && text[s0] !== ' ') {
        const nx = text.indexOf(' ', s0);
        if (nx !== -1 && nx < end) s0 = nx + 1;
      }
      out.push({ text: text.slice(s0, end).trim(), start: s0, end, ov: 0 });
      if (end >= text.length) break;
      const next = end - overlap;
      i = next <= i ? end : next;
    }
    for (let k = 1; k < out.length; k++) {
      out[k].ov = Math.max(0, out[k - 1].end - out[k].start);
    }
    return out.filter((c) => c.text.length > 0);
  }

  function chunkPlayground() {
    const root = $('ix-chunk');
    if (!root) return;
    const size = $('ck-size'), over = $('ck-over');

    function render() {
      const s = +size.value, o = +over.value;
      $('ck-size-v').textContent = s;
      $('ck-over-v').textContent = o;

      const chunks = chunkText(CHUNK_DOC, s, o);
      const total = chunks.reduce((a, c) => a + c.text.length, 0);
      const dup = chunks.reduce((a, c) => a + c.ov, 0);

      $('ck-count').textContent = chunks.length;
      $('ck-avg').textContent = chunks.length ? Math.round(total / chunks.length) : 0;
      $('ck-dup').textContent = Math.round((dup / CHUNK_DOC.length) * 100) + '%';
      $('ck-tok').textContent = fmt(tokens(total));

      $('ck-list').innerHTML = chunks.map((c, i) => {
        const head = c.ov > 0 ? c.text.slice(0, c.ov) : '';
        const rest = c.ov > 0 ? c.text.slice(c.ov) : c.text;
        return `<div class="ix-row"><span class="idx">[${i}]</span>` +
          `<span class="body">${head ? '<mark>' + esc(head) + '</mark>' : ''}` +
          `${esc(rest)}</span></div>`;
      }).join('');

      $('ck-note').innerHTML = o === 0
        ? 'Overlap is <b>0</b>. Each chunk starts exactly where the last ended — ' +
          'any sentence on a seam is cut in half and neither half matches well.'
        : 'Each chunk repeats the <b>' + o + ' highlighted characters</b> before it, ' +
          'so a sentence on the seam survives intact. You pay for that duplication ' +
          'in storage and embedding calls.';
    }

    size.addEventListener('input', render);
    over.addEventListener('input', render);
    isolate(root);
    render();
  }

  /* ============================================ 4. retrieval playground */
  const RETR_DOC =
`Annual leave. Every full time employee receives 25 days of annual leave per year, plus public holidays in the country where they are registered. Leave accrues monthly from the start date. You may carry a maximum of 5 unused days into the following year.

Equipment and expenses. New joiners receive a laptop budget of 2000 euros and a home office budget of 600 euros in their first month. Recurring costs such as internet and electricity are not reimbursed. Submit receipts within 30 days of purchase or the claim is rejected.

Deadlines. We would rather hear about a slipping deadline three weeks early than three days early. Raise it in your team channel as soon as you know. A missed deadline is a planning problem, not a performance problem.

Payroll. Payroll runs on the 25th of each month, or the last working day before it if the 25th falls on a weekend. For anything related to pay, tax documents or your contract, contact the people operations team.

Reviews. Formal reviews happen twice a year, in June and December. Promotion decisions are made in the December cycle only. Salary adjustments take effect from the first of February.`;

  function vec(s) {
    s = ' ' + s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const m = new Map();
    for (let i = 0; i < s.length - 2; i++) {
      const t = s.slice(i, i + 3);
      m.set(t, (m.get(t) || 0) + 1);
    }
    return m;
  }
  function cos(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const v of a.values()) na += v * v;
    for (const [k, v] of b) { nb += v * v; if (a.has(k)) dot += a.get(k) * v; }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function retrievalPlayground() {
    const root = $('ix-retr');
    if (!root) return;
    const q = $('rt-q'), k = $('rt-k');
    const chunks = chunkText(RETR_DOC, 320, 40);

    $('rt-presets').addEventListener('click', (e) => {
      const c = e.target.closest('.ix-chip');
      if (c) { q.value = c.textContent; render(); }
    });

    function render() {
      const topk = +k.value;
      $('rt-k-v').textContent = topk;
      const question = q.value.trim();
      const qv = vec(question);
      const scored = chunks.map((c, i) => ({
        i, text: c.text, s: question ? cos(vec(c.text), qv) : 0,
      }));
      const ranked = [...scored].sort((a, b) => b.s - a.s).slice(0, topk);
      const hits = new Set(ranked.map((r) => r.i));

      $('rt-list').innerHTML = scored.map((c) =>
        `<div class="ix-row ${hits.has(c.i) ? 'hit' : ''}">` +
        `<span class="idx">[${c.i}]</span>` +
        `<span class="body">${esc(c.text.slice(0, 96))}…</span>` +
        `<span class="sc">${c.s.toFixed(3)}</span></div>`
      ).join('');

      const context = ranked.map((r) => r.text).join('\n\n');
      const prompt = 'Answer the question using only the context below.\n\nCONTEXT:\n' +
        context + '\n\nQUESTION: ' + (question || '…');
      $('rt-prompt').innerHTML =
        '<span class="lbl">Answer the question using only the context below.</span>\n\n' +
        '<span class="lbl">CONTEXT:</span>\n' + esc(context) +
        '\n\n<span class="lbl">QUESTION:</span> <span class="q">' +
        esc(question || '…') + '</span>';

      $('rt-ptok').textContent = fmt(tokens(prompt.length));
      $('rt-dtok').textContent = fmt(tokens(RETR_DOC.length));
      $('rt-pct').textContent =
        Math.round((context.length / RETR_DOC.length) * 100) + '%';
      $('rt-top').textContent = (ranked[0] ? ranked[0].s : 0).toFixed(3);

      const best = ranked[0] ? ranked[0].s : 0;
      $('rt-note').innerHTML = best < 0.25
        ? 'Top score is <b>' + best.toFixed(3) + '</b> — nothing here really answers that. ' +
          'Note that you still got ' + topk + ' results back. A retriever always returns k.'
        : 'Only the highlighted chunks are sent. Everything else in the document ' +
          'is never seen by the model.';
    }

    q.addEventListener('input', render);
    k.addEventListener('input', render);
    isolate(root);
    render();
  }

  /* =============================================== 5. mismatch toggle */
  function mismatchToggle() {
    const root = $('ix-mismatch');
    if (!root || !window.RAG_DATA) return;
    const M = window.RAG_DATA.mismatch;
    let mode = 'right';

    root.querySelectorAll('.ix-toggle button').forEach((b) =>
      b.addEventListener('click', () => { mode = b.dataset.mode; render(); })
    );

    function render() {
      root.querySelectorAll('.ix-toggle button').forEach((b) =>
        b.classList.toggle('on', b.dataset.mode === mode)
      );
      const rows = M[mode];
      const top = rows[0].score;
      $('mm-list').innerHTML = rows.map((r, i) => {
        const pct = Math.max(1, Math.min(100, (r.score / 0.6) * 100));
        const ok = r.text === M.correct;
        return `<div class="ix-row ${i < 3 ? 'hit' : ''}">` +
          `<span class="idx">${i + 1}</span>` +
          `<span class="body">${esc(r.text)}${ok ? '  ←  the right answer' : ''}</span>` +
          `<span class="sc">${r.score.toFixed(3)}</span></div>`;
      }).join('');
      $('mm-top').textContent = top.toFixed(3);
      $('mm-model').textContent = mode === 'right'
        ? window.RAG_DATA.meta.model
        : window.RAG_DATA.meta.wrongModel;
      $('mm-note').innerHTML = mode === 'right'
        ? 'Top score <b>' + top.toFixed(3) + '</b>. The right answer wins clearly.'
        : 'Top score <b>' + top.toFixed(3) + '</b> — the signal has collapsed by a factor ' +
          'of twenty. <b>No error was raised.</b> Nothing crashed. The retriever looks healthy.';
    }
    isolate(root);
    render();
  }

  function boot() {
    scaleExplorer();
    embeddingExplorer();
    chunkPlayground();
    retrievalPlayground();
    mismatchToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
