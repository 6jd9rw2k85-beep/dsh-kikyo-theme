#!/bin/bash
# 自检：文件是否齐、挂载声明是否还在、三个本地服务与主题路由是否在线
set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS="$HOME/Library/Application Support/dsh-desktop/harness"
PLUGIN="$HARNESS/plugins/dsh-kikyo-theme"
RES="/Applications/DSH Desktop.app/Contents/Resources"
PORT="${DSH_PORT:-43129}"
ok=0; bad=0

pass() { printf "  \033[32mPASS\033[0m %-28s %s\n" "$1" "$2"; ok=$((ok+1)); }
fail() { printf "  \033[31mFAIL\033[0m %-28s %s\n" "$1" "$2"; bad=$((bad+1)); }

echo "== 安装位置 =="
[ -f "$PLUGIN/index.js" ] && pass "插件 index.js" "$PLUGIN" || fail "插件 index.js" "缺失（先跑 tools/install.sh）"
if grep -q 'insert' "$PLUGIN/cordis.patch.yml" 2>/dev/null; then
  pass "挂载声明" "cordis.patch.yml 含 insert"
else
  fail "挂载声明" "cordis.patch.yml 没有 insert 行 —— 插件不会被加载"
fi
[ -f "$PLUGIN/kikyo-off" ] && fail "启用状态" "存在 kikyo-off，主题被手动停用" || pass "启用状态" "未停用"

echo "== 关键素材 =="
for f in assets/hero-boot.jpg assets/anim-wall.mp4 assets/anim-boot.mp4 assets/anim-raft.mp4 runtime/kikyo.js runtime/art.js runtime/kikyo.css; do
  [ -s "$PLUGIN/$f" ] && pass "$f" "$(du -h "$PLUGIN/$f" | cut -f1)" || fail "$f" "缺失或为空"
done

echo "== 宿主资源 =="
for f in splash.html kikyo-splash.mp4 kikyo-poster.jpg; do
  [ -s "$RES/$f" ] && pass "Resources/$f" "$(du -h "$RES/$f" | cut -f1)" || fail "Resources/$f" "缺失"
done

echo "== 本地服务 =="
for pair in "8802 视频" "8803 TTS" "8805 音频"; do
  set -- $pair
  curl -s -m 2 -o /dev/null -w '' "http://127.0.0.1:$1/health" 2>/dev/null && pass "服务 $1" "$2 在线" || fail "服务 $1" "$2 没响应"
done

echo "== 主题路由（需要 DSH 开着且插件已加载）=="
for p in kikyo.js art.js kikyo.css hero-boot.jpg anim-wall.mp4 anim-boot.mp4; do
  code=$(curl -s -m 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/dsh-kikyo/$p" 2>/dev/null)
  [ "$code" = "200" ] && pass "/dsh-kikyo/$p" "200" || fail "/dsh-kikyo/$p" "HTTP $code（插件没加载或需要完全退出重开）"
done

echo
echo "通过 $ok 项，失败 $bad 项。"
[ "$bad" -eq 0 ]
