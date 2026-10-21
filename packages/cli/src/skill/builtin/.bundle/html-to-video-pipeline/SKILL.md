---
name: html-to-video-pipeline
description: "通过无头浏览器录制（Playwright/Puppeteer）+ ffmpeg 可靠地把 HTML 渲染成 MP4——其中的先后顺序、坑点和校验步骤必须做对，否则产物会悄悄劣化。只要用户正在构建或调试任何把 HTML/CSS/JS 页面（单文件、多 composition、GSAP 驱动或 `@keyframes` 驱动）转成视频文件的流水线，就触发本技能，包括无头录制、网页屏幕捕获、确定性的逐帧捕获、多场景拼接或混合引擎的视频输出。当症状听起来像以下情况时也触发：开头几帧出现字体切换闪烁（FOUT）、视频前几秒卡死/无内容、动画在页面加载期间播放并被截断、拼接后的片段时长离谱（例如 8s 变成 35s）、`file://` 加载的 HTML 取不到子场景、导出的视频比浏览器里更软/更糊，或者明明给 ffmpeg 传了很高的 `-r` 帧率却仍然卡顿/看起来一顿一顿。即使只是一次性脚本也请使用——这里的失败模式足够隐蔽，从零开始通常会把它们重新引入。 | Trigger keywords: HTML to MP4, headless recording, Playwright recordVideo, ffmpeg, FOUT, frame-by-frame capture, multi-scene concatenation."
---

# HTML → 视频：真正可用的流水线

把一个实时 HTML 页面变成 MP4 听起来是一行命令的事（“Playwright 录、ffmpeg 编”），而且初版总是看着没问题——直到你回放导出文件，发现文字先以回退字体闪了一下、开头有三秒死画面，或者一段“10 秒”的片子实际时长 35 秒。本技能记录了让产物可信的具体顺序、等待与编码器参数。

把这条流水线看作五个阶段，它们之间有一条不变式：

```
launch  →  hold @ frame 0  →  align capture start with animation start  →  record  →  trim & encode
```

这条不变式是：**在录制就绪之前，动画的任何像素都不应被渲染；并且，在每一个影响布局的资源加载完成之前，录制不得开始。** 下面每一个坑都是对这条不变式的违反。

速查清单（每项在下文都有展开）：

1. `viewport` 必须与 `recordVideo.size` 完全相等——不一致会让产物被悄悄缩放，变得发软/发糊。
2. 在 `goto()` **之前**通过 `addInitScript` 冻结 CSS 动画。
3. `goto` 使用 `domcontentloaded`，绝不要用 `load`。
4. 预先内联 `data-composition-src` 子场景——`file://` 会阻止客户端 `fetch`。
5. 字体等待 = 样式表 `<link>` 加载 → 逐个 face 调用 `face.load()` → `fonts.ready` → 2 次 rAF。
6. 探测时长时对无限循环 / `repeat: -1` 做防护。
7. 解冻即 t=0；在 `-i` *之前*用 `-ss` 裁掉 `leadInMs − 120ms`。
8. 拼接：同一引擎 → 解复用器 `-c copy`；混合引擎 → concat *滤镜* + 重新编码。
9. 用 ffprobe 时长 + 完整解码 + 抽样帧来校验。每次都做。

有两种录制模式，选错会浪费一天：

- **模式 A——实时 `recordVideo`**（即下面各阶段所述）。简单，墙钟时间 = 片长。但屏幕录制是尽力而为的可变帧率（约 25fps），而且会和动画争抢 CPU。对预览以及空闲机器上 ≤30fps 的交付物够用。
- **模式 B——确定性逐帧步进**（暂停一切，seek 到 `i / fps`，截图，再编码 PNG 序列）。帧率精确、每一帧都渲染、无需裁掉片头、不受机器负载影响。当产物必须是真正流畅的 ≥30fps，或渲染跑在负载较高的 CI 上时，必须用它。见下文“确定性逐帧步进”。

## 前置条件——先安装这些

两个硬性要求：无头浏览器驱动（Playwright 或 Puppeteer）和 `ffmpeg`。下文假设两者都已安装并位于 `PATH` 中。

### 1. 无头浏览器驱动

本技能默认使用 Playwright（流水线是按其 `recordVideo` API 编写的）。Puppeteer 也能用，但录制需要你自己通过 CDP 屏幕投流来接线——除非有理由不用，否则选 Playwright。

```bash
# Playwright (recommended) — npm / pnpm / bun all work
npm  install playwright
pnpm add playwright
bun  add playwright

# Then install the actual browser binaries (this is the step people forget):
npx playwright install chromium              # just Chromium — enough for this pipeline
npx playwright install --with-deps chromium  # Linux/CI: also install shared libs
```

校验：`npx playwright --version` 能打印驱动版本，且 `node -e "require('playwright').chromium.launch().then(b => b.close())"` 能干净退出。

Puppeteer 备选（仅当项目里已经在用它时）：

```bash
npm install puppeteer            # bundles a matching Chromium automatically
# or, to reuse a system Chrome:
npm install puppeteer-core       # no bundled browser — you supply executablePath
```

### 2. ffmpeg

编码/裁剪/拼接/校验各步骤都会调用 `ffmpeg`（以及同一发行包里的 `ffprobe`）。它**不是** npm 依赖——请在操作系统层面安装。

```bash
# macOS
brew install ffmpeg

# Debian / Ubuntu
sudo apt-get update && sudo apt-get install -y ffmpeg

# Fedora / RHEL
sudo dnf install ffmpeg          # requires RPM Fusion enabled

# Windows
winget install Gyan.FFmpeg       # or: choco install ffmpeg
```

校验：`ffmpeg -version` 和 `ffprobe -version` 都能打印版本。如果脚本启动 `ffmpeg` 时报 `ENOENT`，说明二进制不在 `PATH` 中——参见 `references/ffmpeg-cheatsheet.md` 里的优雅失败片段。

生产环境**不要**依赖 `ffmpeg-static` / `@ffmpeg-installer/ffmpeg` 这些 npm 包：它们捆绑的构建会缺少你迟早会遇到的编解码器和编码器参数（例如 `libx264` preset、`tpad`）。系统级安装的 ffmpeg 才是耐久之选。

### 3. 可选——ImageMagick（仅用于校验）

仅当你需要第 6 阶段里那个“到底有没有渲染出东西”的像素均值检查时才需要它。否则可以跳过。

```bash
brew install imagemagick         # macOS
sudo apt-get install imagemagick # Debian/Ubuntu
```

校验：`magick -version`（ImageMagick 7）或 `convert -version`（ImageMagick 6）。

## 流水线

### 第 1 阶段——启动并准备录制器

使用 `playwright.chromium.launch({ headless: true })`，以及配置了 `recordVideo: { dir, size: { width, height } }` 的 context。两条尺寸规则：

- **`viewport` 必须与 `recordVideo.size` 完全相等。** 二者不同时，Playwright 会把屏幕录制缩放到录制尺寸，整个产物都会变软。让两者都来自同一组常量。
- `recordVideo` 按 CSS 像素分辨率录制；`deviceScaleFactor` **不会**提高录制分辨率。要导出 1080p，请用 1920×1080 的 viewport，而不是 960×540 @ 2x。

context 一创建就开始录制——把那个时间戳当作 WebM 的 t=0 并记住它（`tWebmStart = Date.now()`）；第 5 阶段裁剪片头死画面时会用到它。

要清楚录制器的天花板：屏幕录制以可变帧率约 25fps 运行，CPU 负载下会丢帧。第 5 阶段的 `-r <fps>` 参数只能把容器变成恒定帧率，它只会复制帧——无法增加流畅度。如果卡顿是问题，改用逐帧步进（模式 B），而不是跟这一点较劲。

### 第 2 阶段——在页面解析之前冻结动画

这是最容易漏掉的一步。纯 CSS 的 `@keyframes` 动画在元素被赋予样式的那一刻就开始——没有任何可拦截的 JS 触发点。如果你先 `goto()` 打开 HTML，再开始等字体（这要花几秒），那么 CSS 时间轴*这整段时间早就在跑了*。录制会把回退字体在片子中途换成真实字体，而动画开头的节拍则被字体等待吃掉了。

修复方法：**通过 `page.addInitScript()`** 注入全局冻结，它在文档自身的任何脚本之前、CSS 应用之前运行，因此时间轴在存在的那一刻就被暂停在第 0 帧：

```js
await page.addInitScript(() => {
  const style = document.createElement('style');
  style.id = '__freeze';
  style.textContent =
    '*, *::before, *::after { animation-play-state: paused !important;' +
    ' -webkit-animation-play-state: paused !important; }';
  const attach = () => (document.head || document.documentElement).appendChild(style);
  if (document.head || document.documentElement) attach();
  else document.addEventListener('DOMContentLoaded', attach, { once: true });
  window.__unfreeze = () => document.getElementById('__freeze')?.remove();
});
```

这不会阻止由 JS 驱动的 GSAP 补间（见第 4 阶段）——对于 GSAP 驱动的模板，把主时间轴以暂停状态注册，并暴露一个 `window.__playAll()` 供第 4 阶段调用。

### 第 3 阶段——用 `domcontentloaded` 加载，而不是 `load`

`waitUntil: 'load'` 会阻塞在每个外部资源上，包括没有 CORS 头的跨域视频。Chromium 会重试约 4s 才放弃，而这 4s 会被录进片子，变成冻结的首个场景。改用 `waitUntil: 'domcontentloaded'`——此时 DOM 和同步内联脚本（GSAP、你的播放器）已就绪，字体则放到下一步显式处理。

如果模板是多 composition 的（场景通过 `data-composition-src` 和客户端 `fetch` 加载），你必须在 Node 侧把这些子文件**预先内联**进入口 HTML，并写到一个同级的 `.tmp.html`。Chromium 会阻止 `file://` 下的 fetch，因此那些在浏览器标签页里好用的客户端场景加载器，在无头录制中会悄无声息地只产出一个空壳。见 `references/multi-composition.md`。

### 第 4 阶段——正确等待字体，然后放开

单靠 `document.fonts.ready` **是不够的**，这是第二容易漏掉的一步。在 `domcontentloaded` 时机下，Google Fonts（或任何外部）的 `<link rel="stylesheet">` 通常还没返回。在它的 CSS 到达之前，其 `@font-face` 规则根本不在 `document.fonts` 里——于是 `fonts.ready` 看到空集合，*瞬间*就 resolve 了。录制继续，CSS 在片子中途到达，字体文件下载完成，换字体就发生在镜头前。

正确的顺序如下，全部放在一个带 8s 硬上限的 `page.evaluate()` 中，以免卡死的 CDN 永久阻塞：

1. 等待每个 `<link rel="stylesheet">` 触发 `load` 或 `error`——这会把 `@font-face` 规则注册进 `document.fonts`。
2. 对每个已注册的 face 显式调用 `face.load()`。`font-display: swap` 会把下载推迟到有内容用该 face 绘制时——如果你的首帧恰好没用到该 face，不加这一步就永远不会去取它。
3. `await fonts.ready`。
4. 等两次 rAF，让布局在第 0 帧之前稳定到真实字形度量上。

然后，也只有到这时：

5. 驱动播放：对 GSAP 多 composition 模板，调用 `window.__playAll()` 让每个已注册的（暂停的）主时间轴从 0 开始。对纯 CSS 模板，这一步是空操作。
6. 调用 `window.__unfreeze()` 移除冻结样式。**这才是动画真正的 t=0。** 记录相对 `tWebmStart` 的墙钟偏移（`leadInMs = Date.now() - tWebmStart`）——第 5 阶段要裁掉的就是它。

第 4 阶段的完整 JS 见 `references/font-wait.md`。

### 第 5 阶段——探测时长、录制，然后裁剪并编码

**先探测时长**（仅当你确切知道目标长度时才可跳过）。用户请求的 `duration` 可能比动画短，那样会把动画拦腰截断。取以下两者的最大值：

- 最长的**非无限** CSS 动画（对 `animation-iteration-count !== 'infinite'` 的条目取 `animation-duration + animation-delay`）。
- 最长的**有限** GSAP 补间。**不要**用 `gsap.globalTimeline.totalDuration()`——一个 `repeat: -1` 的补间（闪烁光标、循环背景）会让它变成约 1e10s。遍历 `globalTimeline.getChildren(true, true, true)`，跳过任何 `repeat() === -1` 的项。

加上约 400ms 的稳定期，以便捕获最后一个动画帧；上限设为 30s，避免某个离谱的巨大值失控。如果调用方传入了*显式*的每帧时长（例如“每个场景恰好 4s”），就**不要**延长——把它当作硬上限，并在动画提前结束时补齐尾部（见下文）。如果 duration 是 'auto'，则延长到探测出的长度。

按 `totalDuration` **录制**，然后 `context.close()`。Playwright 会把 WebM 放到 `recordDir`。

**用 ffmpeg 编码**，应用两项修正：

```
ffmpeg -y \
  [ -ss <(leadInMs - 120) / 1000> ]  # trim dead lead-in, back off 120ms so we don't clip frame 1
  -i input.webm \
  [ -vf tpad=stop_mode=clone:stop_duration=<totalDuration> ]  # pad tail only when duration is explicit
  -t <totalDuration> \                # trim to exact length (recordVideo sometimes overshoots)
  -r <fps> \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 \
  -movflags +faststart \
  out.mp4
```

`-ss` 的回退很重要：如果你精确裁到 `leadInMs`，录制器启动抖动和取整会偷走第一个真实帧。片头多出几帧静帧看不出来；少了开场节拍却很显眼。

## 确定性逐帧步进（模式 B）

当交付物必须是精确帧率下真正流畅的，或者渲染跑在负载较高、实时录制明显卡顿的 CI 机器上时，干脆不要实时录制。保留第 1–4 阶段（去掉 `recordVideo`），然后：暂停所有时间轴，seek 到 `i / fps`，对每一帧调用 `page.screenshot()`，再用 `ffmpeg -framerate <fps>` 编码 PNG 序列。时长天生精确、没有片头需要裁剪，而且无论机器负载如何，每一帧都被完整渲染。

当页面动效可以按声明式方式 seek 时它才适用——CSS `@keyframes`（通过 `document.getAnimations()` + `currentTime`）、WAAPI 和 GSAP（`gsap.globalTimeline.time(t)`）。它**不**适用于 `<video>` 元素、用 `setTimeout` 编排的场景或 rAF 驱动的物理模拟；这些需要实时录制或 CDP 虚拟时钟。时间只能单调向前步进，绝不回退。

完整循环、seek/suppressEvents 的细节、“JS 后续创建的动画对 seek 不可见”这一陷阱，以及可选的 2x 超采样，都在 `references/frame-stepping.md`。

## 多段拼接

当你手上有 N 个按场景拆分的 MP4，需要合成一个输出时，正确的 ffmpeg 策略取决于各输入是否共享编解码器/时基。

**同一编码器、同一参数（典型情况：所有场景由同一个适配器渲染）**——使用 `concat` 解复用器加流复制。快速、无损：

```
ffmpeg -y -f concat -safe 0 -i list.txt -c copy out.mp4
```

其中 `list.txt` 的内容是 `file 'seg1.mp4'\nfile 'seg2.mp4'\n...`。

**混合来源（例如场景 A 由无头 Chromium 录制，场景 B 由 React/Remotion 流水线渲染）**——concat 解复用器的 `-c copy` 路径假定时基和 PTS 兼容。时基不同时，PTS 会错误累加，8 秒的输出可能变成 35 秒。**即使 `-vsync cfr` 也救不了你**——错误的 PTS 早已被喂进去了。必须通过 concat **滤镜**重新编码，它会重建时间轴：

```
ffmpeg -y -i seg1.mp4 -i seg2.mp4 -i seg3.mp4 \
  -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -r 60 \
  -movflags +faststart out.mp4
```

代码里的决策规则：把 `reencode: boolean` 传给你的拼接辅助函数。只要有任何片段来自与其他片段不同的渲染引擎，或你拿不准，就设为 `true`。

## 校验——每次都要做

不能把“文件写出来了”当作成功。上面那些失败模式（时长错误、FOUT、片头死画面）都会产出可播放的 MP4。宣布成功之前：

- `ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4`——实际时长与预期相差在约 50ms 以内吗？
- `ffmpeg -v error -i out.mp4 -f null -`——完整解码且无错误吗？坏拼接产生的“静默损坏”输出能正常解码但时长错误；反过来，concat 解复用器产出损坏文件时也可能在这里报错。
- 在 t=0.1s 和 t=0.5s 附近抽帧（`ffmpeg -ss 0.1 -i out.mp4 -frames:v 1 -y f1.png`）——文字是否以预期字体渲染？如果你的测试环境装有 ImageMagick，`magick f1.png -threshold 50% -format '%[fx:100*mean]' info:` 会给出粗略的非背景像素占比，可捕捉“录制完全是空白”的回归。

特别针对字体：**studio 式的实时 iframe 预览复现不出 FOUT**，因为浏览器标签页会缓存字体 face。只有冷启动的无头渲染（即真正的导出路径）才能复现。要在导出的 MP4 上校验，而不是在预览上。

## 何时可以偏离这套模板

- **无动画的单帧 PNG 导出。** 跳过第 2 阶段和第 4–5 阶段中的录制部分；goto → `fonts.ready` → `page.screenshot()` 就够了。截图仍然会遇到 FOUT。
- **你在 JS 里端到端掌控动画时间轴**（例如 Motion Canvas / Remotion 生成器风格）。冻结/解冻这套操作就没必要了，因为逐帧渲染由*你*驱动——用框架自己的帧 API，完全跳过 Playwright 录制。如果混用引擎，拼接规则依然适用。
- **交互式页面捕获**（录制真实用户会话）。探测时长没有意义；改用手动开始/停止信号，并跳过片头裁剪。

## 参考文件

- `references/font-wait.md` —— 第 4 阶段字体等待例程的完整 JS，含逐链接超时和基于 rAF 的稳定等待。
- `references/frame-stepping.md` —— 模式 B 的确定性捕获循环：逐帧 seek、截图、PNG 序列编码、超采样及其限制。
- `references/multi-composition.md` —— 为 `file://` 录制内联 `data-composition-src` 场景，包括重新执行克隆的 `<script>` 节点。
- `references/duration-probe.md` —— 带无限循环防护的 CSS + GSAP 探测。
- `references/ffmpeg-cheatsheet.md` —— 编码/拼接/校验命令的集中速查。
