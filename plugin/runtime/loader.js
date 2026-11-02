/* Kikyo theme — inline loader. Kept tiny: paints the cover immediately, then
   pulls art.js + kikyo.js from the plugin route. Never throws into the page. */
(function () {
  'use strict';
  if (window.__KK_LOADER__) return;
  window.__KK_LOADER__ = true;

  var BASE = '/dsh-kikyo';

  function paintCover() {
    if (document.getElementById('kk-boot')) return;
    var box = document.createElement('div');
    box.id = 'kk-boot';
    box.setAttribute('role', 'presentation');
    box.innerHTML =
      '<div class="kk-boot-fallback">' +
      '<div class="kk-fb-ring"></div>' +
      '<div class="kk-fb-mark">桔梗</div>' +
      '<div class="kk-fb-sub">K I K Y O &nbsp;·&nbsp; D E E P S E E K</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(box);
    document.documentElement.classList.add('kk-booting');
  }

  if (document.body) paintCover();
  else document.addEventListener('DOMContentLoaded', paintCover, { once: true });

  function addScript(src, done) {
    var s = document.createElement('script');
    s.src = BASE + src;
    s.async = false;
    s.onload = done || null;
    s.onerror = function () {
      try { console.warn('[kikyo-theme] failed to load', src); } catch (_) {}
      if (done) done();
    };
    (document.body || document.documentElement).appendChild(s);
  }

  // Serialise: kikyo.js consumes KIKYO_RIVER from art.js.
  addScript('/art.js', function () { addScript('/kikyo.js'); });

  // Fail-open: if the runtime never signals ready, lift the cover so the app is usable.
  setTimeout(function () {
    if (window.__KK_READY__) return;
    var el = document.getElementById('kk-boot');
    if (el) {
      el.classList.add('kk-gone');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
    }
    document.documentElement.classList.remove('kk-booting');
  }, 16000);
})();
