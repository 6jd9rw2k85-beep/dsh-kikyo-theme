#!/bin/bash
# 把 kikyo-theme-kit 里的内容同步到本机实际位置
# 用法：bash tools/install.sh            （插件 + 宿主资源）
#      bash tools/install.sh plugin       （只装插件，不动桌面壳）
#      bash tools/install.sh host         （只装桌面壳资源）
set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS="$HOME/Library/Application Support/dsh-desktop/harness"
PLUGIN_DEST="$HARNESS/plugins/dsh-kikyo-theme"
RES="/Applications/DSH Desktop.app/Contents/Resources"
WHAT="${1:-all}"

sync_plugin() {
  [ -f "$KIT/plugin/cordis.patch.yml" ] || { echo "缺 plugin/cordis.patch.yml"; exit 1; }
  grep -q 'insert' "$KIT/plugin/cordis.patch.yml" || { echo "cordis.patch.yml 里没有 insert 行，装了也不生效"; exit 1; }
  mkdir -p "$PLUGIN_DEST"
  # 不用 --delete：避免误删本机独有的 kikyo-off 等开关文件
  rsync -a --exclude '.DS_Store' --exclude 'kikyo-off' "$KIT/plugin/" "$PLUGIN_DEST/"
  echo "插件已同步 -> $PLUGIN_DEST"
}

sync_host() {
  [ -w "$RES" ] || { echo "$RES 不可写（可能需要管理员权限）"; exit 1; }
  cp "$KIT/host/kikyo-splash.mp4" "$RES/kikyo-splash.mp4"
  cp "$KIT/host/kikyo-poster.jpg" "$RES/kikyo-poster.jpg"
  # 只在第一次覆盖前备份原始 splash
  [ -f "$RES/splash.html.orig-kikyo" ] || cp "$RES/splash.html" "$RES/splash.html.orig-kikyo"
  cp "$KIT/host/splash.html" "$RES/splash.html"
  echo "宿主资源已同步 -> $RES"
}

case "$WHAT" in
  plugin) sync_plugin ;;
  host)   sync_host ;;
  all)    sync_plugin; sync_host ;;
  *)      echo "用法：install.sh [all|plugin|host]"; exit 1 ;;
esac

echo
echo "下一步：完全退出 DSH（Cmd+Q）再打开，插件与开屏才会重新加载。"
echo "只想刷新页面内的样式/脚本：Cmd+R 就够。"
