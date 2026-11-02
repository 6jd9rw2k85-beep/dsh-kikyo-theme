# 素材生成说明（仓库不含美术素材）

仓库里**故意不提交**图片、视频、音频。下面是用你自己的语料/提示词在本机复现视觉效果的完整路径。全部在 macOS + Apple Silicon 上验证过，ComfyUI 走 Metal（MPS）。

## 0. 环境

- ComfyUI（本机 127.0.0.1:8188），启动参数带 `--gpu-only`，否则 text encoder 会掉到 CPU，慢十倍。
- 模型（放在 `ComfyUI/models/`）：
  - `diffusion_models/`：FLUX 3 image（或任意 FLUX/SDXL 底模）、`hunyuanvideo1.5_720p_t2v_distilled`、`hunyuanvideo1.5_i2v_distilled`
  - `text_encoders/`：`umt5_xxl_fp8_e4m3fn_scaled.safetensors`、`sigclip_vision_patch14_384.safetensors`
  - `vae/`：对应 VAE
  - `upscale_models/`：`RealESRGAN_x4plus_anime_6B.pth`（二次元图超分）
- 没有这些也能出效果：只要你有 `1920×1080` 左右的图和一段 `10s` 左右的循环视频，按第 3 节的封装规则装进去即可。

## 1. 开机原画 / 壁纸原画

用 FLUX 3 出 3:2 或 16:9 大图，提示词方向（英文效果更稳）：

```
anime illustration, young shrine maiden with very long straight black hair,
white haori and red hakama, standing in an autumn maple forest,
warm low sun through leaves, soft rim light, drifting red maple leaves,
cinematic wide shot, shallow depth of field, high detail
```

出图后按屏幕比例做 **cover 裁剪**（不要拉伸）：

```bash
# 用 sips 或任意图像工具裁到 1920x1080；需要精确控制偏移就自己写脚本
sips -c 1080 1920 input.png --out plugin/assets/hero-boot.jpg
```

原图偏白偏亮时，烘一层轻微的 gamma + 左侧暖暗，保证标题文字可读（深色主题上的白底会非常刺眼）。

## 2. 让图动起来（开机片段）

HunyuanVideo 1.5 图生视频，1280×704 / 49 帧 / 14 步，一条约 9 分钟（M5 Max 64GB）。

提示词只描述**微动**，不要写具体手势，模型在远景小人物上很容易画崩：

```
subtle motion only: hair gently sways, snowflakes drift slowly,
camera locked, keep composition and lighting unchanged
```

## 3. 做成不跳帧的循环（关键）

片段首尾帧几乎不可能对齐，所以用 **ping-pong**：正放 + 倒放拼接，循环点就是一次普通帧步。

```bash
FF=ffmpeg
# 慢放到 2.6 倍并统一帧率，再正放+倒放拼接，最后放大到屏幕尺寸
"$FF" -y -i raw.mp4 -vf "setpts=2.6*PTS,fps=24" -an /tmp/slow.mp4
"$FF" -y -i /tmp/slow.mp4 -filter_complex \
  "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,scale=1920:1056:flags=lanczos" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart -an plugin/assets/anim-boot.mp4
```

装进 `plugin/assets/anim-boot.mp4`，同时复制一份给桌面壳开屏（如果要用）：`host/kikyo-splash.mp4`。

> 备用：不喜欢反向感，就裁一段首尾相近的片段做交叉淡化（`xfade`），代价是会有一点溶解感。

## 4. 页内字幕的旁白（可选）

本地零样本克隆 TTS，参考音频 5 秒左右、干净无混响。合成后去首尾静音 + 响度归一：

```bash
"$FF" -y -i raw.wav -af "silenceremove=start_periods=1:start_threshold=-45dB, \
loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 96k plugin/assets/kk-enter.m4a
```

不放音频也能跑：`runtime/kikyo.js` 的 `playEnterVoice()` 失败时是静默降级。

## 5. 装回去并自检

```bash
bash tools/install.sh plugin
bash tools/verify.sh
```

素材放好后记得**不要 `git add` 它们**（`.gitignore` 已经拦住，提交前 `git status` 再看一眼）。

## 6. 想换素材但不想动代码

- 换开机/壁纸原画：直接覆盖 `plugin/assets/hero-boot.jpg`、`anim-wall.mp4`，路由每次请求都现读磁盘，`Cmd+R` 即生效。
- 想用静帧壁纸（零解码、最省电）：地址后加 `?kkstill=1`，会读取 `plugin/assets/wall-still.jpg`。
- 想关掉第二层粒子：默认已关；需要时加 `?kkmotes=1`。
