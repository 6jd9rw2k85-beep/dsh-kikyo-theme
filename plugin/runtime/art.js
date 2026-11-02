/* ==========================================================================
   dsh-kikyo-theme — real-art scene
   Loads the two painted plates and paints a slow, breathing frame on top:
   drifting maple leaves, gold dust, a soft vignette. No vector people.
   ========================================================================== */
(function () {
  'use strict';
  if (window.KIKYO_ART) return;

  var BASE = '/dsh-kikyo';
  var ART = { boot: null, wall: null, ready: false, _p: null,
              vid: { boot: null, wall: null, raft: null } };

  /* Local AI clips (Wan2.2 I2V) drawn in place of the still plates once ready.
     Anything missing simply falls back to the painted image. */
  function makeVideo(src, loop) {
    var v = document.createElement('video');
    var st = { el: v, ok: false, started: 0 };
    v.src = src;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = !!loop;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.addEventListener('loadeddata', function () {
      st.ok = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    v.addEventListener('error', function () { st.ok = false; });
    return st;
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  ART.load = function () {
    if (ART._p) return ART._p;
    ART._p = Promise.all([
      loadImage(BASE + '/hero-boot.jpg'),
      loadImage(BASE + '/hero-wall.jpg')
    ]).then(function (list) {
      ART.boot = list[0];
      ART.wall = list[1] || list[0];
      ART.ready = !!ART.boot;
      try {
        /* ?v= busts an old clip out of the HTTP cache whenever the asset is
           re-rendered — the route serves by path and ignores the query */
        ART.vid.wall = makeVideo(BASE + '/anim-wall.mp4?v=kikyo3', true);
        /* boot clip: her breathing / hair drifting / light snow. Painted only
           once it has real frames; until then the still plate is used. */
        ART.vid.boot = makeVideo(BASE + '/anim-boot.mp4?v=kikyo4', true);
        /* she and the raft are inside the wallpaper clip now, so the old
           separate raft clip is no longer fetched at all */
      } catch (e) {}
      return ART.ready;
    });
    return ART._p;
  };

  function mediaSize(m) {
    return [m.videoWidth || m.naturalWidth || m.width || 1,
            m.videoHeight || m.naturalHeight || m.height || 1];
  }

  /* A still plate that plays instead of the video while the loop seam passes. */
  function seamFade(el, span) {
    if (!el || !el.duration || !isFinite(el.duration) || el.duration < 1) return 0;
    var remain = el.duration - el.currentTime;
    var edge = Math.min(remain, el.currentTime);
    return 1 - Math.min(1, edge / span);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function seeded(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  /* A small five-lobed maple silhouette, normalized to ~[-1, 1]. */
  var LEAF = [
    [0, -1.00], [0.13, -0.62], [0.42, -0.78], [0.30, -0.34],
    [0.64, -0.36], [0.40, -0.04], [0.67, 0.12], [0.29, 0.20],
    [0.33, 0.58], [0.05, 0.40], [0, 0.56],
    [-0.05, 0.40], [-0.33, 0.58], [-0.29, 0.20], [-0.67, 0.12],
    [-0.40, -0.04], [-0.64, -0.36], [-0.30, -0.34], [-0.42, -0.78], [-0.13, -0.62]
  ];

  function leafPath(ctx, s) {
    var n = LEAF.length;
    function P(i) { var p = LEAF[(i + n) % n]; return [p[0] * s, p[1] * s]; }
    var p0 = P(0);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    for (var i = 0; i < n; i++) {
      var a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
      ctx.bezierCurveTo(
        b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6,
        c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6,
        c[0], c[1]
      );
    }
    ctx.closePath();
  }

  var COLORS = ['#a83326', '#8f2a22', '#c25131', '#7d231e', '#cf7a3c', '#b5432b'];

  function rays(ctx, W, H, t, strength) {
    if (strength <= 0.002) return;
    var cx = W * 0.53;
    var cy = -H * 0.18;
    var L = H * 1.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(11px)';
    for (var i = 0; i < 11; i++) {
      var ang = -0.95 + i * 0.17 + Math.sin(t * 0.07 + i * 1.3) * 0.012;
      var w = 12 + (i % 4) * 10;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      var g = ctx.createLinearGradient(0, 0, 0, L);
      g.addColorStop(0, 'rgba(255, 232, 180, 0)');
      g.addColorStop(0.18, 'rgba(255, 226, 168, ' + (0.075 * strength) + ')');
      g.addColorStop(0.55, 'rgba(255, 208, 140, ' + (0.04 * strength) + ')');
      g.addColorStop(1, 'rgba(255, 196, 120, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, 0, w, L);
      ctx.restore();
    }
    ctx.restore();
  }

  function hopeDust(ctx, W, H, t, count) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < count; i++) {
      var r = seeded(i * 97 + 31);
      var x0 = r() * W;
      var speed = 12 + r() * 26;
      var y = H + 30 - ((r() * (H + 120) + t * speed) % (H + 120));
      var x = x0 + Math.sin(t * (0.3 + r() * 0.5) + r() * 6.28) * (8 + r() * 18);
      var a = (0.22 + 0.4 * Math.abs(Math.sin(t * (0.8 + r()) + r() * 6.28))) * (0.5 + 0.5 * r());
      var rad = 1.2 + r() * 2.6;
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad * 6);
      g.addColorStop(0, 'rgba(255, 238, 190, ' + a + ')');
      g.addColorStop(0.4, 'rgba(255, 214, 150, ' + (a * 0.35) + ')');
      g.addColorStop(1, 'rgba(255, 196, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad * 6, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  function pulse(ctx, W, H, t) {
    var e = Math.exp(-Math.pow((t - 4.45) / 0.95, 2));
    if (e < 0.01) return;
    var cx = W * 0.54, cy = H * 0.24, R = H * 0.75;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(255, 238, 196, ' + (0.20 * e) + ')');
    g.addColorStop(0.35, 'rgba(255, 210, 150, ' + (0.09 * e) + ')');
    g.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function sorrow(ctx, W, H, t, count) {
    var P = 40;
    var ph = (t % P) / P;
    ctx.save();
    for (var i = 0; i < count; i++) {
      var r = seeded(i * 211 + 7);
      var cold = r() > 0.35;
      var size = 0.8 + r() * 1.8;
      var ny = 1 + Math.floor(r() * 2);
      var y = ((r() * H + ph * H * ny) % H);
      var x = r() * W + Math.sin(Math.PI * 2 * (ph * ny + r())) * (6 + r() * 14);
      var a = (0.10 + r() * 0.22) * (0.55 + 0.45 * Math.sin(Math.PI * 2 * (ph * (1 + Math.floor(r() * 2)) + r())));
      a = Math.max(0.03, a);
      var col = cold ? '168, 196, 224' : '206, 186, 160';
      var g = ctx.createRadialGradient(x, y, 0, x, y, size * 7);
      g.addColorStop(0, 'rgba(' + col + ', ' + a + ')');
      g.addColorStop(1, 'rgba(' + col + ', 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size * 7, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLeaf(ctx, x, y, s, rot, color, alpha, blur) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    if (blur) ctx.filter = 'blur(' + blur + 'px)';
    ctx.font = Math.round(s * 1.45) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83C\uDF41', 0, 0);
    ctx.restore();
  }

  /* Leaves are computed from t, not stored: a reload always looks the same. */
  function leaves(ctx, W, H, t, count, scale) {
    var P = 40;
    var ph = (t % P) / P;
    var spanY = H + 140;
    var spanX = W + 120;
    for (var i = 0; i < count; i++) {
      var r = seeded(i * 131 + 17);
      var layer = r();
      var size = (14 + r() * 12) * scale * (layer > 0.82 ? 1.55 : 1);
      var ny = 1 + Math.floor(r() * 3);
      var nx = 1 + Math.floor(r() * 3);
      var y0 = r() * spanY;
      var x0 = r() * spanX;
      var y = ((y0 + ph * spanY * ny) % spanY) - 70;
      var x = ((x0 + ph * spanX * nx) % spanX) - 60;
      x += Math.sin(Math.PI * 2 * (ph * ny + r())) * (10 + r() * 22);
      var rot = r() * 6.28 + Math.PI * 2 * ph * (1 + Math.floor(r() * 2)) * (r() > 0.5 ? 1 : -1);
      var alpha = 0.38 + r() * 0.40;
      var color = COLORS[i % COLORS.length];
      var blur = layer > 0.9 ? 1.6 : 0;
      drawLeaf(ctx, x, y, size, rot, color, alpha, blur);
    }
  }
  function dust(ctx, W, H, t, count) {
    var P = 40;
    var ph = (t % P) / P;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < count; i++) {
      var r = seeded(i * 73 + 5);
      var x = r() * W;
      var base = r() * H;
      var ny = 1 + Math.floor(r() * 3);
      var y = ((base - ph * H * ny) % H + H) % H;
      var tw = 0.35 + 0.65 * Math.sin(Math.PI * 2 * (ph * (1 + Math.floor(r() * 3)) + r()));
      var rad = 0.7 + r() * 1.4;
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad * 5);
      g.addColorStop(0, 'rgba(255, 226, 176, ' + (0.5 * Math.max(0, tw)) + ')');
      g.addColorStop(1, 'rgba(255, 196, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad * 5, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawLeaf(ctx, x, y, s, rot, color, alpha, blur) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    if (blur) ctx.filter = 'blur(' + blur + 'px)';
    ctx.font = Math.round(s * 1.45) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83C\uDF41', 0, 0);
    ctx.restore();
  }

  /* Leaves are computed from t, not stored: a reload always looks the same. */
  function leaves(ctx, W, H, t, count, scale) {
    var P = 40;
    var ph = (t % P) / P;
    var spanY = H + 140;
    var spanX = W + 120;
    for (var i = 0; i < count; i++) {
      var r = seeded(i * 131 + 17);
      var layer = r();
      var size = (14 + r() * 12) * scale * (layer > 0.82 ? 1.55 : 1);
      var ny = 1 + Math.floor(r() * 3);
      var nx = 1 + Math.floor(r() * 3);
      var y0 = r() * spanY;
      var x0 = r() * spanX;
      var y = ((y0 + ph * spanY * ny) % spanY) - 70;
      var x = ((x0 + ph * spanX * nx) % spanX) - 60;
      x += Math.sin(Math.PI * 2 * (ph * ny + r())) * (10 + r() * 22);
      var rot = r() * 6.28 + Math.PI * 2 * ph * (1 + Math.floor(r() * 2)) * (r() > 0.5 ? 1 : -1);
      var alpha = 0.38 + r() * 0.40;
      var color = COLORS[i % COLORS.length];
      var blur = layer > 0.9 ? 1.6 : 0;
      drawLeaf(ctx, x, y, size, rot, color, alpha, blur);
    }
  }
  function grain(ctx, W, H, count) {
    ctx.save();
    for (var i = 0; i < count; i++) {
      var r = seeded(i * 57 + 3);
      var x = r() * W;
      var y = r() * H;
      var white = r() > 0.45;
      ctx.fillStyle = white ? 'rgba(255, 246, 232, 0.035)' : 'rgba(10, 4, 6, 0.045)';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }

  function shimmer(ctx, W, H, ph) {
    var cx = W * (0.30 + 0.05 * Math.sin(Math.PI * 2 * ph));
    var cy = H * 0.10;
    var R = H * 1.05;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    var a = 0.075 + 0.025 * Math.sin(Math.PI * 4 * ph);
    g.addColorStop(0, 'rgba(255, 214, 158, ' + a + ')');
    g.addColorStop(0.55, 'rgba(255, 188, 120, ' + (a * 0.35) + ')');
    g.addColorStop(1, 'rgba(255, 170, 100, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function cover(ctx, img, W, H, zoom, panX, panY, biasY) {
    var dim = mediaSize(img);
    var s = Math.max(W / dim[0], H / dim[1]) * zoom;
    var dw = dim[0] * s;
    var dh = dim[1] * s;
    var bias = (biasY == null) ? 0.5 : biasY;
    ctx.drawImage(img, (W - dw) / 2 + panX, (H - dh) * bias + panY, dw, dh);
  }

  function liveVideo(mode) {
    var st = ART.vid && ART.vid[mode];
    if (!st || !st.ok || !st.el || st.el.readyState < 2) return null;
    return st.el;
  }

  /* The raft clip is composited into a small off-screen buffer and feathered
     with a radial mask, so it dissolves into the far end of the river instead
     of cutting a rectangle into the wallpaper. */
  /* raftLayer() used to feather the separate raft clip onto the water.
     She is painted into the wallpaper now, so the helper is gone. */
  ART.draw = function (ctx, W, H, t, mode) {
    if (!ART.ready || !ART.boot) {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#170a10');
      g.addColorStop(0.55, '#3d1a1e');
      g.addColorStop(1, '#7a3524');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    ctx.save();
    if (mode === 'wall') {
      var ph = (t % 40) / 40 * Math.PI * 2;
      var wv = liveVideo('wall');
      var zoom = wv ? 1.005 : 1.04 + 0.02 * Math.cos(ph);
      var px = wv ? 7 * Math.sin(ph) : 12 * Math.sin(ph);
      var py = 3 * Math.sin(ph * 2);
      ctx.save();
      ctx.filter = 'brightness(1.32) saturate(1.07)';
      cover(ctx, wv || ART.wall, W, H, zoom, px, py, 0.02);
      ctx.restore();

      /* Kikyo and her raft are painted into the wallpaper clip itself now:
         the river, the mist and she are one picture, so there is nothing to
         fade in or out — no more ghost pop every couple of minutes, and her
         paddle / leaf-picking loop just keeps going as part of the scene. */
      leaves(ctx, W, H, t, 14, 0.92);
      dust(ctx, W, H, t, 7);
      sorrow(ctx, W, H, t, 20);
      shimmer(ctx, W, H, ph);
    } else {
      /* Boot uses the artwork itself — the picture the user first found — with
         a slow push-in identical to the ken-burns of the desktop splash clip,
         so the hand-off from splash window to page never jumps. */
      var e = smooth(t / 10.4);
      /* the i2v clip carries her breathing, the drifting hair and the snow;
         the still plate only shows until the clip has decoded its first frame */
      cover(ctx, liveVideo('boot') || ART.boot, W, H,
            1.03 + 0.055 * e, -8 * e, -3 * e, 0.02);
      rays(ctx, W, H, t, 0.85 * (1 - smooth((t - 6.6) / 1.6)));
      hopeDust(ctx, W, H, t, 12);
      leaves(ctx, W, H, t, 18, 1.0);
      dust(ctx, W, H, t, 8);
      pulse(ctx, W, H, t);
      grain(ctx, W, H, 220);
      /* let the moving wallpaper take over while the push-in is still alive,
         instead of parking a still frame on screen for the last second */
      var wf = smooth((t - 7.2) / 1.8);
      if (wf > 0.001) {
        ctx.save();
        ctx.globalAlpha = wf;
        /* same zoom and colour as wall mode, so the hand-off at 10.4s is
           invisible instead of a small zoom + brightness pop */
        ctx.filter = 'brightness(1.32) saturate(1.07)';
        cover(ctx, liveVideo('wall') || ART.wall, W, H, 1.005, 0, 0, 0.02);
        ctx.restore();
        /* she is part of the wallpaper, so let a warm bloom settle on her as the
           picture takes over — the wipe reads as "the river lights up around her"
           instead of a plain cross-fade */
        var bl = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 7.2) / 3.0)));
        if (bl > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          var bx = W * 0.33, by = H * 0.47, br = Math.max(H * 0.10, W * 0.05);
          var bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          bg2.addColorStop(0, 'rgba(255, 206, 150, ' + (0.20 * bl).toFixed(3) + ')');
          bg2.addColorStop(0.55, 'rgba(255, 168, 96, ' + (0.07 * bl).toFixed(3) + ')');
          bg2.addColorStop(1, 'rgba(255, 150, 80, 0)');
          ctx.fillStyle = bg2;
          ctx.fillRect(bx - br, by - br, br * 2, br * 2);
          ctx.restore();
        }
      }
    }
    ctx.restore();

    var vg = ctx.createRadialGradient(W * 0.56, H * 0.44, H * 0.30, W * 0.56, H * 0.44, H * 1.02);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8, 3, 7, 0.09)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  };

  ART.sorrow = sorrow;
  window.KIKYO_ART = ART;
})();
