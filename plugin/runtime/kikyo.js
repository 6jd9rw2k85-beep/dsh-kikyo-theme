/* ==========================================================================
   dsh-kikyo-theme runtime
   Boot cover (canvas scene + voice + subtitles + meteors + welcome),
   then a looping autumn hero wallpaper and light sidebar decoration.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__KK__) return;
  window.__KK__ = true;

  var BASE = '/dsh-kikyo';

  /* The injected stylesheet is snapshotted at DSH boot; re-link the live route
     so CSS edits apply on a plain reload without restarting the whole app. */
  try {
    if (!document.getElementById('kk-css-live')) {
      var lk = document.createElement('link');
      lk.id = 'kk-css-live';
      lk.rel = 'stylesheet';
      lk.href = BASE + '/kikyo.css?v=' + Date.now();
      (document.head || document.documentElement).appendChild(lk);
    }
  } catch (e) {}

  /* The desktop shell's preload paints its own dark "正在启动 DSH Desktop" frame
     (z-index 2147483646, plus a sheet that hides body and every child). The
     index tap only reaches pages the harness renders itself, so the injection
     path has to clean up as well: strip the cover, and opt the page back into
     visibility so the artwork curtain can paint over it. */
  (function clearShellCover() {
    var IDS = ['dsh-desktop-boot-cover', 'dsh-desktop-boot-cover-style'];
    function strip() {
      for (var i = 0; i < IDS.length; i++) {
        var n = document.getElementById(IDS[i]);
        if (n && n.parentNode) n.parentNode.removeChild(n);
      }
      try {
        if (document.body) document.body.style.setProperty('visibility', 'visible', 'important');
        if (document.documentElement) {
          document.documentElement.style.setProperty('visibility', 'visible', 'important');
          document.documentElement.style.removeProperty('background');
        }
      } catch (e) {}
    }
    strip();
    /* 25 秒后停止：与外壳重建封面的速度无关，也绝不会和它互相追赶 */
    var until = Date.now() + 25000;
    var t = setInterval(function () { strip(); if (Date.now() > until) clearInterval(t); }, 300);
  })();

  var W = 1280;
  var H = 720;
  var BOOT_MS = 10400;
  /* belt and braces: the CSS curtain lifts itself at ~14s, but if this script
     dies halfway the page must still become usable */
  setTimeout(function () {
    try { document.documentElement.classList.add('kk-ready'); } catch (e) {}
  }, 13500);
  var LOOP = 40;
  var LINE = 'ずっと待っていたの';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  // Size a canvas to the viewport and return a cover transform for the 1280x720 scene.
  function fit(canvas) {
    /* 1.5x is visually indistinguishable at this softness and cuts the pixel
       count ~44% vs 2x — stability beats pixels */
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round((canvas.clientWidth || window.innerWidth) * dpr));
    var h = Math.max(1, Math.round((canvas.clientHeight || window.innerHeight) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    var sc = Math.max(w / W, h / H);
    return { s: sc, ox: (w - W * sc) / 2, oy: (h - H * sc) / 2 };
  }

  var uiOn = false;
  function markUI() {
    if (uiOn) return;
    uiOn = true;
    document.documentElement.classList.add('kk-ui');
    decorate();
  }

  /* ------------------------------------------------------------ boot --- */
  var ended = false;

  function bootBox() {
    var box = document.getElementById('kk-boot');
    if (!box) {
      box = el('div', '');
      box.id = 'kk-boot';
      (document.body || document.documentElement).appendChild(box);
      document.documentElement.classList.add('kk-booting');
    }
    box.classList.remove('kk-gone');
    return box;
  }

  function clearBox(box) {
    while (box.firstChild) box.removeChild(box.firstChild);
  }

  /* 开机小雪：18 片，纯 CSS transform 动画（合成器线程），零 JS 计时。
     数量刻意压到很低，符合「主题永远让位于程序」的约束。 */
  function snowLayer() {
    var wrap = el('div', '');
    wrap.id = 'kk-snow';
    for (var i = 0; i < 18; i++) {
      var f = document.createElement('i');
      f.style.left = (Math.random() * 100).toFixed(2) + '%';
      f.style.animationDuration = (9 + Math.random() * 9).toFixed(1) + 's';
      f.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
      f.style.setProperty('--dx', ((Math.random() * 2 - 1) * 46).toFixed(1) + 'px');
      f.style.setProperty('--s', (0.55 + Math.random() * 1.0).toFixed(2));
      f.style.setProperty('--o', (0.4 + Math.random() * 0.5).toFixed(2));
      wrap.appendChild(f);
    }
    var kick = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    kick(function () { kick(function () { wrap.classList.add('on'); }); });
    return wrap;
  }

  function runBoot() {
    var box = bootBox();
    clearBox(box);
    document.documentElement.classList.add('kk-booting');

    var stage = el('div', 'kk-boot-stage');
    var canvas = document.createElement('canvas');
    canvas.className = 'kk-boot-canvas';
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    stage.appendChild(canvas);
    stage.appendChild(el('div', 'kk-boot-shade'));
    stage.appendChild(snowLayer());

    var copy = el('div', 'kk-boot-copy');
    var vert = el('div', 'kk-vert');
    vert.id = 'kk-vert';
    var spans = [];
    for (var i = 0; i < LINE.length; i++) {
      var sp = el('span', '', LINE.charAt(i));
      vert.appendChild(sp);
      spans.push(sp);
    }
    copy.appendChild(vert);
    copy.appendChild(el('div', 'kk-sub', '<i>KIKYO</i>我一直在等你'));
    stage.appendChild(copy);

    stage.appendChild(el('div', 'kk-brand',
      '<b>DEEPSEEK</b><em>·</em><s></s>KIKYO'));
    stage.appendChild(el('div', 'kk-welcome',
      '<div class="kk-w-main">欢迎探索未知之境</div>' +
      '<div class="kk-w-line"><span class="kk-w-dot"></span></div>' +
      '<div class="kk-w-sub">WELCOME TO THE UNKNOWN</div>'));

    var skip = el('button', 'kk-skip', '跳过 <span>ESC</span>');
    skip.id = 'kk-skip';
    skip.type = 'button';
    stage.appendChild(skip);

    var sound = el('div', 'kk-sound', '点击开启声音');
    sound.id = 'kk-sound';
    stage.appendChild(sound);

    box.appendChild(stage);
    markUI();

    var sub = copy.querySelector('.kk-sub');
    var brand = stage.querySelector('.kk-brand');
    var welcome = stage.querySelector('.kk-welcome');

    var audio = null;
    var audioBlocked = false;
    var audioStarted = false;
    try {
      audio = new Audio(BASE + '/boot.m4a');
      audio.preload = 'auto';
      audio.volume = 0.88;
    } catch (e) { audio = null; }

    function tryAudio(from) {
      if (!audio) return;
      if (audioStarted) return;
      var t = clamp(from || 0, 0, 8.4);
      try {
        audio.currentTime = t;
        var p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(function () { audioStarted = true; sound.classList.remove('kk-on'); })
            .catch(function () {
              audioBlocked = true;
              if (!ended) sound.classList.add('kk-on');
            });
        } else {
          audioStarted = true;
        }
      } catch (e) {
        audioBlocked = true;
        if (!ended) sound.classList.add('kk-on');
      }
    }

    function endBoot(skipped) {
      if (ended) return;
      ended = true;
      if (audio) {
        if (skipped) { try { audio.pause(); } catch (e) {} }
        else {
          try {
            var fade = setInterval(function () {
              try {
                audio.volume = Math.max(0, audio.volume - 0.07);
                if (audio.volume <= 0.01) { clearInterval(fade); audio.pause(); }
              } catch (e) { clearInterval(fade); }
            }, 90);
          } catch (e) { try { audio.pause(); } catch (_) {} }
        }
      }
      try { sessionStorage.setItem('kk-played', '1'); } catch (e) {}
      box.classList.add('kk-gone');
      var wallEl = document.getElementById('kk-wall');
      if (wallEl) {
        wallEl.classList.add('kk-reveal');
        setTimeout(function () { wallEl.classList.remove('kk-reveal'); }, 2200);
      }
      /* light seam + her bloom while the wallpaper slides in */
      try {
        document.body.classList.add('kk-wiping');
        setTimeout(function () { document.body.classList.remove('kk-wiping'); }, 1900);
      } catch (e) {}
      document.documentElement.classList.remove('kk-booting');
      setTimeout(function () {
        if (box.parentNode) box.parentNode.removeChild(box);
      }, skipped ? 420 : 1500);
      startWall();
      if (!skipped) showEnterLine();
      /* background music intentionally off: the theme is silent once the boot
         track has faded out */
    }

    /* The line that lands as the wallpaper slides in, with her voice over it. */
    var enterLineDone = false;
    function showEnterLine() {
      if (enterLineDone) return;
      enterLineDone = true;
      var box2 = el('div', '');
      box2.id = 'kk-line';
      box2.appendChild(el('b', ''));
      box2.appendChild(el('i', ''));
      var tx = el('span', '');
      tx.textContent = '陪你一起探索未知之境';
      box2.appendChild(tx);
      box2.appendChild(el('i', ''));
      (document.body || document.documentElement).appendChild(box2);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { box2.classList.add('on'); });
      });
      setTimeout(function () { box2.classList.remove('on'); }, 4600);
      setTimeout(function () { if (box2.parentNode) box2.parentNode.removeChild(box2); }, 5900);
      playEnterVoice();
    }

    function playEnterVoice() {
      var va;
      try {
        va = new Audio(BASE + '/kk-enter.m4a');
        va.preload = 'auto';
        va.volume = 0.92;
      } catch (e) { return; }
      var p = va.play();
      if (p && p.catch) {
        p.catch(function () {
          /* autoplay blocked: wait for the first gesture, then whisper it once */
          var once = function () {
            window.removeEventListener('pointerdown', once, true);
            window.removeEventListener('keydown', once, true);
            try { va.currentTime = 0; va.play(); } catch (e) {}
          };
          window.addEventListener('pointerdown', once, true);
          window.addEventListener('keydown', once, true);
        });
      }
    }

    skip.addEventListener('click', function () { endBoot(true); });
    sound.addEventListener('click', function (ev) {
      ev.stopPropagation();
      sound.classList.remove('kk-on');
      tryAudio(elapsed());
    });
    function onKey(ev) {
      if (ev.key === 'Escape') { endBoot(true); }
      else if (audioBlocked) { tryAudio(elapsed()); }
    }
    window.addEventListener('keydown', onKey);
    box.addEventListener('pointerdown', function () {
      if (audioBlocked) tryAudio(elapsed());
    }, { once: true });

    /* meteors / light dust */
    var meteors = [];
    for (var m = 0; m < 26; m++) {
      var r = Math.random();
      meteors.push({
        x: 360 + r * 980,
        y: -40 + Math.random() * 250,
        vx: -34 - Math.random() * 60,
        vy: 86 + Math.random() * 80,
        len: 30 + Math.random() * 80,
        life: 0,
        delay: 3.6 + Math.random() * 1.0,
        gold: Math.random() > 0.55,
        size: 1.1 + Math.random() * 1.5
      });
    }
    var dust = [];
    for (var d = 0; d < 40; d++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.6,
        a: 0.15 + Math.random() * 0.4,
        sp: 4 + Math.random() * 10,
        ph: Math.random() * 6.28
      });
    }

    function drawMeteors(t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < meteors.length; i++) {
        var p = meteors[i];
        var life = t - p.delay;
        if (life < 0) continue;
        var a = Math.min(1, life / 0.25) * Math.max(0, 1 - life / 1.5);
        if (a <= 0) continue;
        var x = p.x + p.vx * life;
        var y = p.y + p.vy * life;
        var nx = x - p.vx * 0.055;
        var ny = y - p.vy * 0.055;
        var g = ctx.createLinearGradient(x, y, nx - (p.len / 60) * p.vx, ny - (p.len / 60) * p.vy);
        g.addColorStop(0, p.gold ? 'rgba(255,218,150,0.95)' : 'rgba(255,236,214,0.95)');
        g.addColorStop(0.25, p.gold ? 'rgba(248,178,104,0.45)' : 'rgba(236,196,166,0.35)');
        g.addColorStop(1, 'rgba(248,178,104,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx - p.vx * (p.len / 420), ny - p.vy * (p.len / 420));
        ctx.stroke();
        var rg = ctx.createRadialGradient(x, y, 0, x, y, 8);
        rg.addColorStop(0, 'rgba(255,240,214,' + (0.65 * a) + ')');
        rg.addColorStop(1, 'rgba(255,214,150,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.fill();
      }
      for (var k = 0; k < dust.length; k++) {
        var q = dust[k];
        var tw = 0.45 + 0.55 * Math.sin(t * 2.1 + q.ph);
        ctx.fillStyle = 'rgba(255,222,176,' + (q.a * tw) + ')';
        ctx.beginPath();
        ctx.arc(q.x + Math.sin(t * 0.25 + q.ph) * 14, q.y - ((t * q.sp) % 60), q.r, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }

    var t0 = performance.now();
    function elapsed() { return (performance.now() - t0) / 1000; }

    /* safety net: if the boot path ever stalls, drop the pre-JS cover anyway
       so nobody is stuck behind a black veil */
    setTimeout(function () {
      document.documentElement.classList.add('kk-ready');
    }, 6000);
    var painted = false;
    var lastPaint = -Infinity;
    function frame(now) {
      now = typeof now === 'number' ? now : performance.now();
      /* A 60fps procedural boot scene competes with the app's own hydration.
         Thirty frames per second is visually identical for this slow scene. */
      if (now - lastPaint < 1000 / 30) {
        requestAnimationFrame(frame);
        return;
      }
      lastPaint = now;
      var t = elapsed();
      var A = window.KIKYO_ART;
      var f = fit(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(f.s, 0, 0, f.s, f.ox, f.oy);
      if (A && A.ready) {
        A.draw(ctx, W, H, t, 'boot');
      } else {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#170a10');
        g.addColorStop(0.55, '#3d1a1e');
        g.addColorStop(1, '#7a3524');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      drawMeteors(t);
      if (!painted) {
        painted = true;
        /* first frame is on screen — lift the pre-JS cover that hides the
           app's own loading view */
        document.documentElement.classList.add('kk-ready');
      }

      for (var i = 0; i < spans.length; i++) {
        if (t > 0.55 + i * 0.14 && !spans[i].classList.contains('kk-on')) {
          spans[i].classList.add('kk-on');
        }
      }
      if (t > 1.15 && !sub.classList.contains('kk-on')) sub.classList.add('kk-on');
      if (t > 2.25 && !brand.classList.contains('kk-on')) brand.classList.add('kk-on');
      if (t > 1.0 && !skip.classList.contains('kk-on')) skip.classList.add('kk-on');
      if (t > 4.4 && !welcome.classList.contains('kk-on')) welcome.classList.add('kk-on');

      if (t < BOOT_MS / 1000 && !ended) {
        requestAnimationFrame(frame);
      } else if (!ended) {
        endBoot(false);
      }
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        stage.classList.add('kk-in');
        frame();
      });
    });

    window.__KK_READY__ = true;
    tryAudio(0);
  }

  /* ------------------------------------------------------- wallpaper --- */
  var wallStarted = false;
  /* --------------------------------------------- ambient AI soundtrack --- */
  var amb = null, ambOn = false, ambChip = null;

  function ambFade(to, ms) {
    if (!amb) return;
    var from = amb.volume, steps = Math.max(1, Math.round((ms || 900) / 60)), i = 0;
    clearInterval(amb._fade);
    amb._fade = setInterval(function () {
      i++;
      amb.volume = Math.min(1, Math.max(0, from + (to - from) * (i / steps)));
      if (i >= steps) clearInterval(amb._fade);
    }, 60);
  }

  function setAmbChip(on) {
    if (!ambChip) return;
    ambChip.textContent = on ? '♪' : '♪';
    if (on) ambChip.classList.add('kk-on'); else ambChip.classList.remove('kk-on');
    ambChip.title = on ? '关闭背景音乐' : '播放背景音乐';
  }

  function startAmbient() {
    if (ambOn || !amb) return;
    var p;
    try { p = amb.play(); } catch (e) { setAmbChip(false); return; }
    if (p && p.then) {
      p.then(function () {
        ambOn = true; ambFade(0.17, 1400); setAmbChip(true);
      }).catch(function () { setAmbChip(false); });
    } else { ambOn = true; setAmbChip(true); }
  }

  function stopAmbient() {
    if (!amb || !ambOn) return;
    ambFade(0, 700);
    setTimeout(function () { try { amb.pause(); } catch (e) {} }, 760);
    ambOn = false; setAmbChip(false);
  }

  function mountAmbient() {
    if (typeof document === 'undefined' || document.getElementById('kk-music')) return;
    try {
      amb = new Audio(BASE + '/ost-wall.m4a');
      amb.loop = true; amb.preload = 'none'; amb.volume = 0;
    } catch (e) { amb = null; }
    if (!amb) return;
    ambChip = document.createElement('div');
    ambChip.id = 'kk-music';
    ambChip.textContent = '♪';
    ambChip.title = '播放背景音乐';
    ambChip.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (ambOn) stopAmbient(); else startAmbient();
    });
    /* If the track route is missing (assets not deployed yet) drop the chip
       instead of leaving a button that silently does nothing. */
    amb.addEventListener('error', function () {
      if (ambChip && ambChip.parentNode) ambChip.parentNode.removeChild(ambChip);
      ambChip = null; amb = null; ambOn = false;
    });
    document.body.appendChild(ambChip);
    /* Chromium blocks audio until a gesture: arm a one-shot listener. */
    var once = function () {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
      startAmbient();
    };
    window.addEventListener('pointerdown', once, { passive: true });
    window.addEventListener('keydown', once);
  }

  function startWall() {
    if (wallStarted) return;
    wallStarted = true;
    if (document.getElementById('kk-wall')) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'kk-wall';
    canvas.width = W;
    canvas.height = H;
    var shade = el('div', '');
    shade.id = 'kk-wall-shade';
    var veil = el('div', '');
    veil.id = 'kk-wall-veil';
    /* light seam that travels with the wipe + a few sparks off it */
    var fx = el('div', '');
    fx.id = 'kk-wipefx';
    var seam = el('i', '');
    fx.appendChild(seam);
    for (var s = 0; s < 14; s++) {
      var sp = el('b', '');
      sp.style.setProperty('--sy', (6 + Math.random() * 88).toFixed(1) + '%');
      sp.style.setProperty('--sd', (Math.random() * 0.55).toFixed(2) + 's');
      sp.style.setProperty('--sr', (1.6 + Math.random() * 2.6).toFixed(1) + 'px');
      sp.style.setProperty('--sx', ((Math.random() - 0.5) * 46).toFixed(0) + 'px');
      fx.appendChild(sp);
    }
    var body = document.body || document.documentElement;

    /* Play the clip with the compositor instead of repainting it into a canvas
       every frame. A canvas copy has to be sampled out of phase with the 24fps
       source, which is exactly what reads as "跳帧"; a plain <video> is locked
       to the decoder and costs no JS at all. */
    var A0 = window.KIKYO_ART;
    /* Default wallpaper is the still frame with a 90s ken-burns drift: an
       infinite CSS transform the compositor handles for free. The clip is only
       used when explicitly asked for (?kkmotion=1) because a looping video has
       to restart somewhere, and every restart/turnaround reads as a flash. */
    var wantMotion = !/[?&]kkstill=1(&|$)/.test(location.search);
    var ready = wantMotion && A0 && A0.vid && A0.vid.wall && A0.vid.wall.ok ? A0.vid.wall.el : null;
    if (!ready) {
      var still = el('div', '');
      still.id = 'kk-wall';
      still.className = 'kk-wallstill';
      body.appendChild(still);
      body.appendChild(shade);
      body.appendChild(veil);
      body.appendChild(fx);
      requestAnimationFrame(function () { still.classList.add('kk-on'); });
      return;
    }
    if (ready) {
      ready.id = 'kk-wall';
      ready.className = (ready.className || '') + ' kk-wallvid';
      try {
        ready.loop = true;
        ready.muted = true;
        ready.autoplay = true;
        ready.setAttribute('playsinline', '');
        ready.setAttribute('muted', '');
      } catch (e) {}
      body.appendChild(ready);
      body.appendChild(shade);
      body.appendChild(veil);
      body.appendChild(fx);
      try {
        var pr = ready.play();
        if (pr && pr.catch) pr.catch(function () {});
      } catch (e) {}
      requestAnimationFrame(function () { ready.classList.add('kk-on'); });
      return;
    }

    body.appendChild(canvas);
    body.appendChild(shade);
    body.appendChild(veil);
    body.appendChild(fx);

    var ctx = canvas.getContext('2d');
    var t0 = performance.now();
    var lastPaint = -Infinity;
    var lastVt = -1;

    function frame(now) {
      /* Cap the full-screen scene at 30fps. The source clip is 24fps, so this
         avoids duplicate frames without allowing a runaway render loop. */
      if (now - lastPaint < 1000 / 30) {
        requestAnimationFrame(frame);
        return;
      }
      var t = (now - t0) / 1000;
      /* Draw exactly once per decoded video frame: redrawing a 24fps clip from
         a 60Hz loop repeats frames unevenly and reads as judder ("抽帧"). */
      var A0 = window.KIKYO_ART;
      var wv = A0 && A0.vid && A0.vid.wall && A0.vid.wall.ok ? A0.vid.wall.el : null;
      if (wv && wv.readyState >= 2) {
        if (wv.currentTime === lastVt) { requestAnimationFrame(frame); return; }
        lastVt = wv.currentTime;
      }
      lastPaint = now;

      var f = fit(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(f.s, 0, 0, f.s, f.ox, f.oy);
      if (window.KIKYO_ART && window.KIKYO_ART.ready) {
        window.KIKYO_ART.draw(ctx, W, H, t, 'wall');
      } else {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#070511');
        g.addColorStop(1, '#1a0d15');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      veil.style.opacity = '0';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(function () {
      canvas.classList.add('kk-on');
      requestAnimationFrame(frame);
    });
  }

  /* --------------------------------------------------------- sidebar --- */
  var decoTries = 0;
  var decoWired = false;
  var decoTimer = 0;

  /* The Q-figure sits at the bottom-left of the conversation column, so it has
     to know how wide the app's left rail currently is. */
  function syncSideWidth(known) {
    var root = known || document.querySelector('[data-dsh-sidebar-root]') ||
               document.querySelector('aside') || document.querySelector('nav');
    var w = 0;
    if (root) {
      var r = root.getBoundingClientRect();
      if (r.height > 200 && r.width > 100 && r.width < 620 && r.left < 60) w = r.width;
    }
    if (!w) w = 268;
    document.documentElement.style.setProperty('--kk-side-w', Math.round(w) + 'px');
  }
  function decorate() {
    // These two are fixed to the viewport, so they must not depend on the sidebar.
    if (!document.getElementById('kk-chibi') && document.body) {
      var c = el('div', '');
      c.id = 'kk-chibi';
      c.setAttribute('aria-hidden', 'true');
      // five drifting maple leaves: the figure breathes and a few leaves keep
      // rising around her, so the corner mascot reads as alive rather than a
      // pasted sticker.
      // .kk-body carries the artwork so it can sway on its own timeline while
      // #kk-chibi does the breathing rise — two loops that never sync up.
      var leaves = '<span class="kk-body"></span>';
      for (var li = 0; li < 5; li++) leaves += '<span class="kk-ml kk-ml-' + (li + 1) + '"></span>';
      c.innerHTML = leaves;
      document.body.appendChild(c);
    }
    if (!document.getElementById('kk-motto') && document.body) {
      var m = el('div', 'kk-motto',
        '<i></i><span>探索未知之境</span><i></i>');
      m.id = 'kk-motto';
      m.setAttribute('aria-hidden', 'true');
      document.body.appendChild(m);
    }

    var root = document.querySelector('[data-dsh-sidebar-root]');
    if (!root) {
      if (decoTries++ < 80) setTimeout(decorate, 500);
      return;
    }
    syncSideWidth(root);
    if (!decoWired && window.addEventListener) {
      decoWired = true;
      window.addEventListener('resize', function () {
        clearTimeout(decoTimer);
        decoTimer = setTimeout(function () { syncSideWidth(); }, 180);
      });
    }
    root.classList.add('kk-side');
    if (!root.querySelector('.kk-vine')) {
      var v = el('div', 'kk-vine');
      var glyphs = ['🍁', '🍂', '🍁', '🍁', '🍂', '🍁'];
      for (var i = 0; i < glyphs.length; i++) {
        var sp = el('span', '', glyphs[i]);
        sp.style.top = (12 + i * 44) + 'px';
        sp.style.transform = 'rotate(' + (-18 + i * 9) + 'deg)';
        v.appendChild(sp);
      }
      v.setAttribute('aria-hidden', 'true');
      root.appendChild(v);
    }
  }

  /* ------------------------------------------------------ ui motes --- */
  var motesStarted = false;
  function startMotes() {
    if (motesStarted || !document.body) return;
    /* a second full-screen canvas redrawing 60x/s is the single most
       expensive thing the theme ever did — the wallpaper already paints
       its own leaves and dust, so this layer stays off unless asked for
       (?kkmotes=1). */
    if (!/[?&]kkmotes=1(&|$)/.test(location.search)) return;
    if (!window.requestAnimationFrame) return;
    motesStarted = true;
    var c = document.createElement('canvas');
    c.id = 'kk-motes';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    function size() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.round(window.innerWidth * dpr));
      c.height = Math.max(1, Math.round(window.innerHeight * dpr));
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size, { passive: true });
    var t0 = performance.now();
    function frame(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (window.KIKYO_ART && KIKYO_ART.sorrow) {
        ctx.globalAlpha = 0.42;
        KIKYO_ART.sorrow(ctx, window.innerWidth, window.innerHeight, t, 18);
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ start --- */
  function start() {
    markUI();
    if (window.KIKYO_ART && window.KIKYO_ART.load) {
      try { window.KIKYO_ART.load(); } catch (e) {}
    }
    var forced = /[?&]kkboot=1(&|$)/.test(location.search);
    var played = false;
    try { played = sessionStorage.getItem('kk-played') === '1'; } catch (e) {}
    if (played && !forced) {
      var box = document.getElementById('kk-boot');
      if (box) { box.classList.add('kk-gone'); setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 500); }
      document.documentElement.classList.remove('kk-booting');
      document.documentElement.classList.add('kk-ready');
      startWall();
      window.__KK_READY__ = true;
      return;
    }
    runBoot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
