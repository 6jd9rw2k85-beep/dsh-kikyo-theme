#!/bin/bash
# 一键停用 / 启用主题（不改任何代码，只放一个开关文件）
set -euo pipefail

HARNESS="$HOME/Library/Application Support/dsh-desktop/harness"
PLUGIN="$HARNESS/plugins/dsh-kikyo-theme"
FLAG="$PLUGIN/kikyo-off"

case "${1:-status}" in
  off)
    touch "$FLAG"
    echo "已停用：$FLAG"
    echo "完全退出 DSH 重开后界面就是原生样式（插件 apply 会直接 return）。"
    ;;
  on)
    rm -f "$FLAG"
    echo "已启用主题。完全退出 DSH 重开生效。"
    ;;
  status)
    [ -f "$FLAG" ] && echo "当前：已停用" || echo "当前：启用中"
    ;;
  *)
    echo "用法：toggle.sh [off|on|status]"; exit 1 ;;
esac
