#!/bin/bash
# 只回滚桌面壳的开屏（1～2 秒那一屏），不影响插件主题
set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RES="/Applications/DSH Desktop.app/Contents/Resources"

if [ -f "$KIT/host/splash.html.orig-kikyo" ]; then
  cp "$KIT/host/splash.html.orig-kikyo" "$RES/splash.html"
  echo "splash.html 已还原为 DSH 原始版本"
else
  echo "找不到 host/splash.html.orig-kikyo，无法回滚"; exit 1
fi

rm -f "$RES/kikyo-splash.mp4" "$RES/kikyo-poster.jpg"
echo "已移除 kikyo-splash.mp4 / kikyo-poster.jpg"
echo "完全退出 DSH 再打开即可看到原生开屏。"
