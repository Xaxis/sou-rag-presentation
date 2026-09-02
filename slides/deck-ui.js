/* Deck chrome that serves the two ways this deck gets used.
 *
 *   Presenting / recording : Reveal's speaker window (S) - notes, timer,
 *                            next-slide preview on a second monitor.
 *   Following along alone  : a narration drawer (T) that shows, inline, what
 *                            the presenter would be saying on this slide.
 *
 * Without the drawer a solo learner gets slides and no explanation, which is
 * most of the lesson missing.
 */
(function () {
  'use strict';

  // The speaker window renders the deck inside iframes for its previews.
  // Chrome inside those would be noise, so bail out when framed.
  if (window.self !== window.top) return;

  var KEY = 'ragverse.notes.open';
  var open = false;
  try { open = localStorage.getItem(KEY) === '1'; } catch (e) {}

  var deck, drawer, body, toggle;
  // which edition this file was built as; read once, used in several places
  var editAttr = (document.querySelector('.reveal') || { getAttribute: function () {} })
                   .getAttribute('data-edit') || '';
  var isTalk = /talk/.test(editAttr);
  var lengthOf = /essentials/.test(editAttr) ? 'essentials'
               : /short/.test(editAttr) ? 'short' : 'full';
  var isShort = lengthOf !== 'full';
  // The site serves every edition under /deck/...  Served on its own by
  // ./run.sh slides, this file IS the only edition, and the controls that jump
  // between editions - or back to the site - would all be dead ends. So they
  // only appear when the rest of the site is actually there.
  var onSite = /^\/deck(\/|$)/.test(location.pathname);

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function build() {
    deck = document.querySelector('.reveal');

    var bar = el('div', 'deck-bar');
    toggle = el('button', 'deck-btn', '<b>T</b> Narration');
    toggle.title = 'Show what the presenter says on this slide (T)';
    toggle.addEventListener('click', function () { setOpen(!open); });

    var present = el('button', 'deck-btn', '<b>S</b> Speaker view');
    present.title = 'Open the speaker window for presenting or recording (S)';
    // Reveal's speaker window opens on the layout that gives the notes about a
    // quarter of the screen. "Wide" runs them across the full width in large
    // type, which is what you want when you are reading them aloud. It is the
    // speaker window's own localStorage and we share an origin, so seed it -
    // only when unset, so a presenter's own choice always wins.
    try {
      if (!localStorage.getItem('reveal-speaker-layout')) {
        localStorage.setItem('reveal-speaker-layout', 'wide');
      }
    } catch (e) {}
    present.addEventListener('click', function () {
      setOpen(false);
      // Reveal's notes plugin owns the popup; ask it the same way S does.
      var ev = new KeyboardEvent('keydown', { keyCode: 83, which: 83, key: 's' });
      document.dispatchEvent(ev);
    });

    // same key as the site, so the deck matches whatever the visitor chose
    var theme = el('button', 'deck-btn deck-theme', 'Theme');
    theme.title = 'Light or dark';
    theme.addEventListener('click', function () {
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('ragverse.theme', next); } catch (e) {}
      theme.textContent = next === 'dark' ? 'Light' : 'Dark';
    });
    var start = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light');
    theme.textContent = start === 'dark' ? 'Light' : 'Dark';

    // two axes: how long, and whether you run the code live.
    // absent data-edit means the default deck: full, work-along.
    var LENGTHS = ['essentials', 'short', 'full'];
    var LABEL = { essentials: 'Essentials', short: 'Short', full: 'Full' };
    function urlFor(len, talk) {
      if (!talk) return len === 'full' ? '/deck/' : '/deck/' + len + '/';
      return len === 'full' ? '/deck/talk/' : '/deck/talk-' + len + '/';
    }

    var next = LENGTHS[(LENGTHS.indexOf(lengthOf) + 1) % LENGTHS.length];
    var lenBtn = el('button', 'deck-btn', LABEL[lengthOf] + ' \u203a');
    lenBtn.title = 'Currently the ' + LABEL[lengthOf].toLowerCase() +
      ' edition. Click for ' + LABEL[next].toLowerCase() + '.';
    lenBtn.addEventListener('click', function () {
      window.location.href = urlFor(next, isTalk);
    });

    var modeBtn = el('button', 'deck-btn',
      (isTalk ? 'Talk' : 'Work-along') + ' \u203a');
    modeBtn.title = isTalk
      ? 'Talk narration. Click to switch to work-along, where you run the demos live.'
      : 'Work-along narration. Click to switch to talk only, where output is shown rather than run.';
    modeBtn.addEventListener('click', function () {
      window.location.href = urlFor(lengthOf, !isTalk);
    });

    // Landing on the deck from a shared link otherwise leaves you stranded;
    // the bar auto-hides, so this costs the recording nothing.
    var home = el('a', 'deck-btn deck-home', 'ragverse<b>.diy</b>');
    home.href = '/';
    home.title = 'Back to the site';

    /* Where to go, on every frame. Someone landing halfway through a recording
       has no other way to find out, and the title slide has long gone. Faint,
       top-right, and it never moves or fades - unlike the control bar, it is
       meant to be in shot. */
    var mark = el('div', 'deck-mark', 'ragverse<b>.diy</b>');
    mark.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mark);

    if (onSite) bar.appendChild(home);
    bar.appendChild(toggle);
    bar.appendChild(present);
    bar.appendChild(theme);
    if (onSite) { bar.appendChild(lenBtn); bar.appendChild(modeBtn); }
    document.body.appendChild(bar);

    drawer = el('aside', 'deck-notes');
    var head = el('div', 'deck-notes-head');
    head.appendChild(el('span', 'deck-notes-title', 'What the presenter says'));
    var close = el('button', 'deck-notes-close', '&times;');
    close.setAttribute('aria-label', 'Close narration');
    close.addEventListener('click', function () { setOpen(false); });
    head.appendChild(close);
    body = el('div', 'deck-notes-body');
    drawer.appendChild(head);
    drawer.appendChild(body);
    document.body.appendChild(drawer);
  }

  var STAGE = /^\[[A-Z0-9][^\]]*\]$/;

  function render() {
    if (!body) return;
    var slide = window.Reveal && Reveal.getCurrentSlide();
    var notes = slide && slide.querySelector('aside.notes');
    if (!notes) { body.innerHTML = '<p class="deck-none">No narration for this slide.</p>'; return; }

    var text = notes.textContent.replace(/\r/g, '').trim();
    var html = text.split(/\n\s*\n/).map(function (p) {
      var line = p.trim().replace(/\s+/g, ' ');
      if (!line) return '';
      var esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return STAGE.test(line)
        ? '<p class="deck-stage">' + esc + '</p>'
        : '<p>' + esc + '</p>';
    }).join('');
    body.innerHTML = html;
    body.scrollTop = 0;
  }

  function setOpen(next) {
    open = next;
    try { localStorage.setItem(KEY, open ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('notes-open', open);
    toggle.classList.toggle('on', open);
    if (open) render();
    // Reveal scales slides to its container, so let it re-measure.
    if (window.Reveal && Reveal.layout) setTimeout(function () { Reveal.layout(); }, 210);
  }

  // The deck gets recorded, and a control bar in the corner of every frame is
  // clutter. Fade it out when the mouse rests, bring it back on any movement -
  // the same behaviour presentation tools use for their own chrome.
  function autoHide(bar) {
    var timer, awake = false;
    function wake() {
      if (!awake) { bar.classList.add('awake'); awake = true; }
      clearTimeout(timer);
      timer = setTimeout(sleep, 2600);
    }
    function sleep() {
      if (bar.matches(':hover') || document.body.classList.contains('notes-open')) {
        return wake();
      }
      bar.classList.remove('awake');
      awake = false;
    }
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(function (e) {
      document.addEventListener(e, wake, { passive: true });
    });
    bar.addEventListener('mouseenter', wake);
    wake();
  }

  /* The speaker window can show a pacing clock - how much longer you should
     still be on this slide - but only if the deck declares timings. Derive
     them from the narration each slide actually carries, at the same 125
     words per minute the site quotes everywhere else, plus the minute and a
     half a demo costs when you are running it live rather than explaining
     output. Doing it here rather than in the build means the raw deck gets
     it too, and there is nothing to keep in step with the narration. */
  function setPacing() {
    var WPM = 125;
    var sections = document.querySelectorAll('.reveal .slides > section');
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var n = s.querySelector('aside.notes');
      var words = n ? (n.textContent.match(/\S+/g) || []).length : 0;
      var t = Math.max(25, Math.round(words * 60 / WPM));
      if (!isTalk && s.querySelector('.cue')) t += 90;
      s.setAttribute('data-timing', String(t));
    }
    // pacing stays hidden unless the config declares a timing of some kind;
    // every slide carries its own, so this is only the switch that turns it on
    if (window.Reveal && Reveal.configure) Reveal.configure({ defaultTiming: 60 });
  }

  /* Reveal's notes plugin calls window.open and then writes into the result
     without checking it. With pop-ups blocked that throws a TypeError, the
     deck carries on, and the presenter sees S do absolutely nothing - which
     is a miserable thing to discover with a camera running. Wrap open once
     and say what happened. */
  function watchForBlockedPopup() {
    var nativeOpen = window.open;
    if (!nativeOpen) return;
    window.open = function () {
      var w = null;
      try { w = nativeOpen.apply(window, arguments); } catch (e) { w = null; }
      if (w) {
        var a = document.querySelector('.deck-alert'); if (a) a.remove();
        enhanceSpeakerWindow(w);
      } else { showBlocked(); }
      return w;
    };
  }

  /* ---- draggable divider in the speaker window -------------------------
     Reveal's speaker view splits at a fixed ratio you cannot change, and how
     much room the notes get is the one thing a presenter actually wants to
     adjust. The window is same-origin and we are handed it by the wrapper
     above, so this goes in from here rather than by patching the vendored
     plugin - which means it survives re-vendoring reveal.

     Which edge divides the panes depends on the layout: Wide stacks the
     slides above the notes, Default and Tall put them side by side. So the
     handle knows its axis, and each layout remembers its own ratio. */
  var SPLIT_KEY = 'ragverse.speakerSplit';
  var LAYOUTS = {
    'default':    { axis: 'x', def: 60 },
    'wide':       { axis: 'y', def: 45 },
    'tall':       { axis: 'x', def: 45 },
    'notes-only': null
  };

  function splitCss() {
    return [
      /* Same specificity as the plugin's own rules and injected after them,
         so these win without !important. */
      'body[data-speaker-layout="default"] #current-slide{width:var(--rv-split,60%)}',
      'body[data-speaker-layout="default"] #upcoming-slide,',
      'body[data-speaker-layout="default"] #speaker-controls{width:calc(100% - var(--rv-split,60%))}',
      'body[data-speaker-layout="wide"] #current-slide,',
      'body[data-speaker-layout="wide"] #upcoming-slide{height:var(--rv-split,45%)}',
      'body[data-speaker-layout="wide"] #speaker-controls{top:var(--rv-split,45%);' +
        'height:calc(95% - var(--rv-split,45%))}',
      'body[data-speaker-layout="tall"] #current-slide,',
      'body[data-speaker-layout="tall"] #upcoming-slide{width:var(--rv-split,45%)}',
      'body[data-speaker-layout="tall"] #speaker-controls{left:var(--rv-split,45%);' +
        'width:calc(100% - var(--rv-split,45%))}',
      '.rv-grip{position:fixed;z-index:30;background:transparent;touch-action:none}',
      '.rv-grip::after{content:"";position:absolute;background:#c8c8c8;border-radius:2px;' +
        'transition:background .12s}',
      '.rv-grip:hover::after,.rv-grip.rv-on::after{background:#e8590c}',
      '.rv-grip[data-axis="x"]{top:0;height:100%;width:11px;cursor:col-resize}',
      '.rv-grip[data-axis="x"]::after{top:50%;margin-top:-22px;left:4px;width:3px;height:44px}',
      '.rv-grip[data-axis="y"]{left:0;width:100%;height:11px;cursor:row-resize}',
      '.rv-grip[data-axis="y"]::after{left:50%;margin-left:-22px;top:4px;height:3px;width:44px}',
      '.rv-grip[hidden]{display:none}',
      'body.rv-dragging iframe{pointer-events:none}',
      'body.rv-dragging{user-select:none}'
    ].join('\n');
  }

  function enhanceSpeakerWindow(w) {
    var tries = 0;
    var timer = setInterval(function () {
      var d;
      try { d = w.document; } catch (e) { clearInterval(timer); return; }
      if (w.closed || ++tries > 100) { clearInterval(timer); return; }
      if (!d || !d.body || !d.getElementById('speaker-controls')) return;
      if (d.getElementById('rv-split-style')) { clearInterval(timer); return; }
      clearInterval(timer);
      try { installSplitter(w, d); } catch (e) {}
    }, 100);
  }

  function installSplitter(w, d) {
    var style = d.createElement('style');
    style.id = 'rv-split-style';
    style.textContent = splitCss();
    d.head.appendChild(style);

    var grip = d.createElement('div');
    grip.className = 'rv-grip';
    grip.title = 'Drag to resize · double-click to reset';
    d.body.appendChild(grip);

    var saved = {};
    try { saved = JSON.parse(w.localStorage.getItem(SPLIT_KEY) || '{}') || {}; } catch (e) {}

    function layout() { return d.body.getAttribute('data-speaker-layout') || 'default'; }

    function apply() {
      var name = layout(), cfg = LAYOUTS[name];
      if (!cfg) { grip.hidden = true; d.documentElement.style.removeProperty('--rv-split'); return; }
      var pct = typeof saved[name] === 'number' ? saved[name] : cfg.def;
      d.documentElement.style.setProperty('--rv-split', pct + '%');
      grip.hidden = false;
      grip.setAttribute('data-axis', cfg.axis);
      grip.style.left = cfg.axis === 'x' ? 'calc(' + pct + '% - 5px)' : '0';
      grip.style.top  = cfg.axis === 'y' ? 'calc(' + pct + '% - 5px)' : '0';
    }

    function set(pct) {
      var name = layout();
      saved[name] = Math.max(15, Math.min(85, pct));
      try { w.localStorage.setItem(SPLIT_KEY, JSON.stringify(saved)); } catch (e) {}
      apply();
    }

    grip.addEventListener('pointerdown', function (e) {
      var cfg = LAYOUTS[layout()]; if (!cfg) return;
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      grip.classList.add('rv-on');
      d.body.classList.add('rv-dragging');
      function move(ev) {
        set(cfg.axis === 'x'
          ? (ev.clientX / w.innerWidth) * 100
          : (ev.clientY / w.innerHeight) * 100);
      }
      function up() {
        grip.classList.remove('rv-on');
        d.body.classList.remove('rv-dragging');
        d.removeEventListener('pointermove', move);
        d.removeEventListener('pointerup', up);
        d.removeEventListener('pointercancel', up);
      }
      d.addEventListener('pointermove', move);
      d.addEventListener('pointerup', up);
      d.addEventListener('pointercancel', up);
    });

    grip.addEventListener('dblclick', function () {
      var name = layout();
      delete saved[name];
      try { w.localStorage.setItem(SPLIT_KEY, JSON.stringify(saved)); } catch (e) {}
      apply();
    });

    // the layout dropdown rewrites the body attribute; follow it
    new w.MutationObserver(apply)
      .observe(d.body, { attributes: true, attributeFilter: ['data-speaker-layout'] });
    w.addEventListener('resize', apply);
    apply();
  }

  function showBlocked() {
    if (document.querySelector('.deck-alert')) return;
    var a = el('div', 'deck-alert',
      '<b>The speaker window was blocked.</b> Allow pop-ups for this site — ' +
      'your browser will offer it in the address bar — then press <b>S</b> again. ' +
      'Or press <b>T</b> to read the narration here instead.');
    var x = el('button', 'deck-alert-close', '&times;');
    x.setAttribute('aria-label', 'Dismiss');
    x.addEventListener('click', function () { a.remove(); });
    a.appendChild(x);
    a.setAttribute('role', 'status');
    document.body.appendChild(a);
  }

  function boot() {
    build();
    setPacing();
    watchForBlockedPopup();
    autoHide(document.querySelector('.deck-bar'));

    setOpen(open);

    // A 1280x780 canvas scaled into a phone gives ~15px headings. The reading
    // view is the same lesson as a document, so point narrow screens at it.
    if (onSite && window.matchMedia && window.matchMedia('(max-width: 820px)').matches) {
      var nudge = el('a', 'deck-nudge',
        '<b>Small screen?</b> The lesson reads better as a document &rarr;');
      nudge.href = isTalk
        ? '/read/' + (lengthOf === 'full' ? 'talk/' : 'talk-' + lengthOf + '/')
        : '/read/' + (lengthOf === 'full' ? '' : lengthOf + '/');
      document.body.appendChild(nudge);
    }
    if (window.Reveal && Reveal.on) {
      Reveal.on('slidechanged', function () { if (open) render(); });
      Reveal.on('ready', render);
    }
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); setOpen(!open); }
      // S opens the speaker window, which carries the same notes and is on the
      // other monitor. Leaving the drawer open would only put them in frame.
      if (e.key === 's' || e.key === 'S') { setOpen(false); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
