/* The hero background: an embedding space you can watch retrieval happen in.
 *
 * Points sit in clusters in 3-D, the way real embeddings do. Every few
 * seconds one point lights up as a query, and lines reach out to its nearest
 * neighbours - which is, literally, the thing this whole site teaches.
 *
 * Hand-rolled projection on a 2-D canvas: no library, a few KB, and it takes
 * its colours from the CSS tokens so it follows the theme.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var points = [];
  var CLUSTERS = 7;
  var PER = 78;

  var css = getComputedStyle(document.documentElement);
  function token(n, fallback) {
    var v = css.getPropertyValue(n).trim();
    return v || fallback;
  }
  var COL = {};
  function readTokens() {
    css = getComputedStyle(document.documentElement);
    COL.accent = token('--accent', '#e8590c');
    COL.teal   = token('--teal', '#146b5f');
    COL.violet = token('--violet', '#7a6fd3');
    COL.faint  = token('--ink-faint', '#8b97a3');
  }
  readTokens();

  function rnd(n) { return (Math.random() - 0.5) * 2 * n; }

  function build() {
    points = [];
    var palette = [COL.accent, COL.teal, COL.violet, COL.faint, COL.faint, COL.faint];
    for (var c = 0; c < CLUSTERS; c++) {
      // cluster centres spread over a sphere, the way neighbourhoods sit apart
      var t = (c / CLUSTERS) * Math.PI * 2;
      var cx = Math.cos(t) * 0.62 + rnd(0.1);
      var cy = Math.sin(t * 1.7) * 0.42 + rnd(0.1);
      var cz = Math.sin(t) * 0.62 + rnd(0.1);
      for (var i = 0; i < PER; i++) {
        points.push({
          x: cx + rnd(0.24), y: cy + rnd(0.24), z: cz + rnd(0.24),
          c: palette[c % palette.length],
          hot: c === 0,
        });
      }
    }
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* --- the retrieval event ------------------------------------------- */
  var query = null;
  var nextQueryAt = 1400;

  function startQuery(now) {
    var qi = Math.floor(Math.random() * points.length);
    var q = points[qi];
    var scored = [];
    for (var i = 0; i < points.length; i++) {
      if (i === qi) continue;
      var p = points[i];
      var dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
      scored.push({ p: p, d: dx * dx + dy * dy + dz * dz });
    }
    scored.sort(function (a, b) { return a.d - b.d; });
    query = { q: q, hits: scored.slice(0, 5).map(function (s) { return s.p; }), t0: now };
    nextQueryAt = now + 4200 + Math.random() * 1800;
  }

  /* --- projection ----------------------------------------------------- */
  var FOV = 2.6;

  function project(p, a, b) {
    var ca = Math.cos(a), sa = Math.sin(a);
    var x1 = p.x * ca - p.z * sa;
    var z1 = p.x * sa + p.z * ca;
    var cb = Math.cos(b), sb = Math.sin(b);
    var y1 = p.y * cb - z1 * sb;
    var z2 = p.y * sb + z1 * cb;
    var f = FOV / (FOV + z2);
    // wide screens put the headline on the left, so the cloud sits right of it
    var wide = W > 900;
    var s = (wide ? Math.min(W * 0.55, H * 1.05) : Math.min(W, H)) * 0.62;
    var cx = wide ? W * 0.68 : W * 0.5;
    var cy = H * (wide ? 0.42 : 0.40);
    return { x: cx + x1 * f * s, y: cy + y1 * f * s, f: f, z: z2 };
  }

  function frame(now) {
    var a = reduce ? 0.6 : now * 0.000085;
    var b = reduce ? 0.22 : 0.22 + Math.sin(now * 0.00006) * 0.13;

    ctx.clearRect(0, 0, W, H);

    var proj = new Array(points.length);
    for (var i = 0; i < points.length; i++) proj[i] = project(points[i], a, b);

    if (!reduce) {
      if (!query && now > nextQueryAt) startQuery(now);
      if (query && now - query.t0 > 3400) query = null;
    }

    // retrieval lines, drawn under the points
    if (query) {
      var age = (now - query.t0) / 3400;
      var fade = age < 0.16 ? age / 0.16 : age > 0.76 ? (1 - age) / 0.24 : 1;
      var qp = project(query.q, a, b);
      ctx.lineWidth = 1;
      for (var h = 0; h < query.hits.length; h++) {
        var hp = project(query.hits[h], a, b);
        var reach = Math.min(1, Math.max(0, (age - h * 0.05) * 6));
        ctx.strokeStyle = COL.accent;
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = 0.62 * fade * qp.f * reach;
        ctx.beginPath();
        ctx.moveTo(qp.x, qp.y);
        ctx.lineTo(qp.x + (hp.x - qp.x) * reach, qp.y + (hp.y - qp.y) * reach);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = COL.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(qp.x, qp.y, 10 + Math.sin(now * 0.005) * 2.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // painter's algorithm so near points sit over far ones
    var order = [];
    for (i = 0; i < points.length; i++) order.push(i);
    order.sort(function (m, n) { return proj[n].z - proj[m].z; });

    for (var k = 0; k < order.length; k++) {
      var idx = order[k], p = points[idx], pr = proj[idx];
      var lit = query && (query.q === p || query.hits.indexOf(p) !== -1);
      var r = (lit ? 4.6 : 2.7) * pr.f;
      var depth = Math.max(0, Math.min(1, (pr.f - 0.34) * 1.9));
      ctx.globalAlpha = depth * (lit ? 1 : 0.82);
      ctx.fillStyle = lit ? COL.accent : p.c;
      if (lit) { ctx.shadowColor = COL.accent; ctx.shadowBlur = 14; }
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
      if (lit) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  /* --- loop ------------------------------------------------------------ */
  var running = false, rafId = 0;
  function loop(now) { frame(now); rafId = requestAnimationFrame(loop); }
  function start() { if (!running) { running = true; rafId = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  build();
  resize();
  frame(0);

  if (reduce) {
    // one static frame is enough; never animate against the preference
  } else {
    start();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es[0].isIntersecting ? start() : stop();
      }, { threshold: 0.01 }).observe(canvas);
    }
  }

  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () { resize(); if (reduce) frame(0); }, 120);
  });

  // follow the theme when it flips
  window.addEventListener('themechange', function () {
    readTokens();
    build();
    if (reduce) frame(0);
  });
})();
