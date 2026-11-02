import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'kikyo-theme'
export const inject = []

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const ROUTE = '/dsh-kikyo'

const TEXT_CACHE = new Map()
const BUF_CACHE = new Map()

function join(p) {
  return path.join(ROOT, p)
}

function readText(rel) {
  const file = join(rel)
  const st = fs.statSync(file)
  const hit = TEXT_CACHE.get(file)
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.text
  const text = fs.readFileSync(file, 'utf8')
  TEXT_CACHE.set(file, { mtimeMs: st.mtimeMs, size: st.size, text })
  return text
}

function readBuf(rel) {
  const file = join(rel)
  const st = fs.statSync(file)
  const hit = BUF_CACHE.get(file)
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.buf
  const buf = fs.readFileSync(file)
  BUF_CACHE.set(file, { mtimeMs: st.mtimeMs, size: st.size, buf })
  return buf
}

function send(req, res, rel, type, { cache = 'no-cache' } = {}) {
  let buf
  try {
    buf = readBuf(rel)
  } catch (err) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('kikyo-theme asset not found: ' + rel)
    return
  }

  const headers = {
    'content-type': type,
    'cache-control': cache,
    'accept-ranges': 'bytes',
    'last-modified': new Date(fs.statSync(join(rel)).mtimeMs).toUTCString(),
  }

  const range = req.headers.range
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim())
    if (m) {
      let start = m[1] === '' ? null : Number(m[1])
      let end = m[2] === '' ? null : Number(m[2])
      if (start === null && end !== null) {
        start = buf.length - end
        end = buf.length - 1
      } else {
        if (start === null) start = 0
        if (end === null) end = buf.length - 1
      }
      start = Math.max(0, Math.min(start, buf.length - 1))
      end = Math.max(start, Math.min(end, buf.length - 1))
      const slice = buf.subarray(start, end + 1)
      res.writeHead(206, {
        ...headers,
        'content-range': `bytes ${start}-${end}/${buf.length}`,
        'content-length': slice.length,
      })
      res.end(slice)
      return
    }
  }

  res.writeHead(200, { ...headers, 'content-length': buf.length })
  res.end(buf)
}

export function apply(ctx) {
  /* 紧急刹车：插件目录下只要存在 kikyo-off 这个文件，整个主题就不注入、不注册
     路由，DSH 回到原生外观。它是「出问题时一秒回到可用状态」的开关，不影响正常
     启动；判断失败一律按「启用」处理。 */
  try {
    if (fs.existsSync(path.join(ROOT, 'kikyo-off'))) {
      try { ctx.logger?.info?.('[kikyo-theme] disabled by kikyo-off') } catch {}
      return
    }
  } catch {}

  try { ctx.logger?.info?.('[kikyo-theme] apply') } catch {}

  // The desktop shell collects this table exactly once, synchronously at boot.
  ctx.on('webserver/index-inject', (table) => {
    if (!Array.isArray(table)) return
    try {
      table.push({ kind: 'style', text: readText('runtime/kikyo.css') })
      table.push({ kind: 'script', placement: 'body', text: readText('runtime/loader.js') })
    } catch (err) {
      try {
        ctx.logger?.warn?.('[kikyo-theme] injection failed: %s', err && err.message)
      } catch {}
    }
  })

  ctx.inject(['webServer'], (child) => {
    const routes = [
      [`${ROUTE}/art.js`, 'runtime/art.js', 'text/javascript; charset=utf-8'],
      [`${ROUTE}/kikyo.js`, 'runtime/kikyo.js', 'text/javascript; charset=utf-8'],
      [`${ROUTE}/kikyo.css`, 'runtime/kikyo.css', 'text/css; charset=utf-8'],
      [`${ROUTE}/boot.m4a`, 'assets/boot.m4a', 'audio/mp4'],
      [`${ROUTE}/ost-wall.m4a`, 'assets/ost-wall.m4a', 'audio/mp4'],
      [`${ROUTE}/ost-boot.m4a`, 'assets/ost-boot.m4a', 'audio/mp4'],
      [`${ROUTE}/ost-raft.m4a`, 'assets/ost-raft.m4a', 'audio/mp4'],
      [`${ROUTE}/kk-enter.m4a`, 'assets/kk-enter.m4a', 'audio/mp4'],
      [`${ROUTE}/chibi.svg`, 'assets/chibi.svg', 'image/svg+xml; charset=utf-8'],
      [`${ROUTE}/chibi.png`, 'assets/chibi.png', 'image/png'],
      [`${ROUTE}/hero-boot.jpg`, 'assets/hero-boot.jpg', 'image/jpeg'],
      [`${ROUTE}/hero-wall.jpg`, 'assets/hero-wall.jpg', 'image/jpeg'],
      [`${ROUTE}/anim-boot.mp4`, 'assets/anim-boot.mp4', 'video/mp4'],
      [`${ROUTE}/anim-wall.mp4`, 'assets/anim-wall.mp4', 'video/mp4'],
      [`${ROUTE}/wall-still.jpg`, 'assets/wall-still.jpg', 'image/jpeg'],
      [`${ROUTE}/anim-raft.mp4`, 'assets/anim-raft.mp4', 'video/mp4'],
    ]

    // Server-side tap on index.html. The desktop shell collects the
    // `index-inject` rows only after its boot handshake, so on a cold start the
    // raw page paints first and the host's own "加载 DeepSeek" screen flashes
    // before the theme's boot animation. Tapping index.html puts the cover into
    // the very first byte we serve; kikyo.js lifts it on the first painted frame
    // and a 6 s inline timer guarantees it never traps the page.
    try {
      child.webServer.tapIndex((html) => {
        if (typeof html !== 'string' || html.includes('kk-precover')) return html
        const pre =
          // The desktop shell paints its own "正在启动 DSH Desktop" cover over
          // the page (a div + a style block that hides body children). That is
          // the black screen the user kept seeing before the boot animation.
          // This runs as the first script in <head>, so it wins the race: it
          // drops the cover the moment it appears and keeps dropping it while
          // the shell retries, letting our own artwork curtain show through.
          '<script id="kk-drop-shell-cover">(function(){' +
          'var IDS=["dsh-desktop-boot-cover","dsh-desktop-boot-cover-style"];' +
          'function drop(){for(var k=0;k<IDS.length;k++){var el=document.getElementById(IDS[k]);' +
          'if(el&&el.parentNode)el.parentNode.removeChild(el);}}' +
          'function unhide(){document.documentElement.style.removeProperty("background");' +
          'if(document.body)document.body.style.removeProperty("visibility");}' +
          'function both(){drop();unhide();}' +
          'try{both();' +
          'var mo=new MutationObserver(both);' +
          'mo.observe(document.documentElement,{childList:true,subtree:true});' +
          'var tick=setInterval(both,500);' +
          /* Startup-only cleanup. Leaving a document-wide observer attached
             starves the renderer as soon as chat output starts changing DOM. */
          'setTimeout(function(){mo.disconnect();clearInterval(tick);both();},15000);' +
          '}catch(e){}' +
          '})();<\/script>' +
          // warm the painting before the curtain asks for it
          '<link rel="preload" as="image" href="/dsh-kikyo/hero-boot.jpg" />' +
          '<style id="kk-precover">' +
          // The curtain is the artwork itself, not a black rectangle: the first
          // paint of the app already looks like the boot animation's opening
          // frame, so the hand-off from splash.html reads as one continuous move.
          // z-index has to beat the shell cover (2147483646) even when its node
          // survives a race with the preload script.
          '#dsh-desktop-boot-cover,#dsh-desktop-boot-cover-style{display:none!important}' +
          'html:not(.kk-ready) body::after{content:"";position:fixed;inset:0;' +
          'z-index:2147483647;pointer-events:none;' +
          'background:radial-gradient(120% 90% at 50% 46%,rgba(30,12,9,.10),rgba(9,4,5,.55) 78%),' +
          'url("/dsh-kikyo/hero-boot.jpg") center/cover no-repeat,#0a0507;' +
          // the curtain is already moving: a slow push-in in the same direction
          // (and from the same start zoom) as art.js's boot branch, so the
          // hand-off is a continuation instead of a cut.
          'transform:scale(1.03);transform-origin:center;will-change:transform;' +
          'animation:kkPrecover 11s ease-out both}' +
          '@keyframes kkPrecover{from{transform:scale(1.03)}to{transform:scale(1.085)}}' +
          'html.kk-ready body::after{opacity:0;transition:opacity .9s ease}' +
          '</style>' +
          '<script id="kk-precover-failsafe">' +
          '(function(){var t0=Date.now(),n=0;' +
          'function tick(){' +
          // the theme is in: kikyo.js owns kk-ready from here on
          'if(document.getElementById("kk-boot")){return}' +
          // hard ceiling: never leave the page behind the veil
          'if(Date.now()-t0>8000){document.documentElement.classList.add("kk-ready");return}' +
          'setTimeout(tick,100)}' +
          'tick()})()' +
          '</script>'
        return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, pre + '</head>') : pre + html
      })
    } catch (err) {
      try { ctx.logger?.warn?.('[kikyo-theme] index tap unavailable: %s', err && err.message) } catch {}
    }

    // Register one route per try/catch: a single bad path must never abort the
    // whole plugin (that is how the theme went missing once already).
    let ok = 0
    for (const [route, rel, type] of routes) {
      try {
        child.webServer.register({
          kind: 'exact',
          path: route,
          handler: (req, res) => send(req, res, rel, type),
        })
        ok += 1
      } catch (err) {
        try { ctx.logger?.warn?.('[kikyo-theme] route %s failed: %s', route, err && err.message) } catch {}
      }
    }
    try { ctx.logger?.info?.('[kikyo-theme] webServer ready, routes=%d/%d', ok, routes.length) } catch {}

  })
}
