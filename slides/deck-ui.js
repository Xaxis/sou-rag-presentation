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
    present.addEventListener('click', function () {
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
    var lenBtn = el('button', 'deck-btn',
      '<b>' + LABEL[lengthOf].charAt(0) + '</b> ' + LABEL[next]);
    lenBtn.title = 'Currently the ' + LABEL[lengthOf].toLowerCase() +
      ' edition. Switch to ' + LABEL[next].toLowerCase() + '.';
    lenBtn.addEventListener('click', function () {
      window.location.href = urlFor(next, isTalk);
    });

    var modeBtn = el('button', 'deck-btn', isTalk ? 'Work-along' : 'Talk only');
    modeBtn.title = isTalk
      ? 'Switch to the work-along narration, where you run the demos live'
      : 'Switch to the talk narration, where the output is shown rather than run';
    modeBtn.addEventListener('click', function () {
      window.location.href = urlFor(lengthOf, !isTalk);
    });

    bar.appendChild(toggle);
    bar.appendChild(present);
    bar.appendChild(theme);
    bar.appendChild(lenBtn);
    bar.appendChild(modeBtn);
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

  function boot() {
    build();

    setOpen(open);

    // A 1280x780 canvas scaled into a phone gives ~15px headings. The reading
    // view is the same lesson as a document, so point narrow screens at it.
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) {
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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
