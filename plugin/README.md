# dsh-kikyo-theme（插件本体）

这个目录是主题插件的实际代码。**完整说明、安装步骤、素材政策与已知问题都在仓库根目录的 [README](../README.md)**，这里只留维护者需要的短说明。

## 入口

- `index.js`：`apply(ctx)` 注册 16 条 exact 路由（`/dsh-kikyo/*`）+ 通过 `webserver/index-inject` 注入 `loader.js`；入口先检查 `kikyo-off` 开关文件，存在就直接 return。
- `cordis.patch.yml`：bundle 挂载声明。**被清空成 `[]` 时插件完全不加载，而且没有任何报错** —— 排查「主题不生效」先看它有没有 `insert` 行。
- `runtime/loader.js`：极小的内联 loader，先铺封面再拉 `kikyo.js`，避免白屏闪一下。

## 运行层

| 文件 | 作用 | 改了怎么生效 |
|---|---|---|
| `runtime/art.js` | 原画/视频、推镜、飘叶金尘（开机与壁纸共用） | `Cmd+R` |
| `runtime/kikyo.js` | 开机时间轴、壁纸循环、Q 版、雪花、入场字幕 | `Cmd+R` |
| `runtime/kikyo.css` | token、开机层、壁纸层、字幕、动效 | `Cmd+R`（CSS 另有一份带 `?v=` 的实时 link） |
| `index.js` | 路由表与注入 | **Cmd+Q 重开** |

## 约定

- 不要在页面上挂常驻 `MutationObserver` 或无界 `setInterval`；清理类逻辑只允许启动期有界执行并自行 disconnect。
- 新增动效必须给 `prefers-reduced-motion` 降级。
- 素材（jpg/png/mp4/m4a）不进仓库，见根目录 `.gitignore` 与 [docs/ASSETS.md](../docs/ASSETS.md)。
