/* Theme toggle. The no-flash part runs inline in <head>; this adds the
   control and keeps every open surface in step. */
(function () {
  'use strict';
  var KEY = 'ragverse.theme';

  function current() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  function apply(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.setAttribute('aria-label', mode === 'dark' ? 'Switch to light' : 'Switch to dark');
      b.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('themechange', { detail: mode }));
  }

  function mount() {
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.innerHTML =
        '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">' +
        '<circle class="sun" cx="10" cy="10" r="4"/>' +
        '<g class="rays" stroke-linecap="round">' +
        '<path d="M10 1.6v2.2M10 16.2v2.2M1.6 10h2.2M16.2 10h2.2' +
        'M4.1 4.1l1.6 1.6M14.3 14.3l1.6 1.6M15.9 4.1l-1.6 1.6M5.7 14.3l-1.6 1.6"/></g>' +
        '<path class="moon" d="M13.6 11.9A5 5 0 0 1 8.1 6.4a5 5 0 1 0 5.5 5.5z"/></svg>';
      b.addEventListener('click', function () {
        apply(current() === 'dark' ? 'light' : 'dark');
      });
    });
    apply(current());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }
})();
