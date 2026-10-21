---
name: pptx-official
description: "当正在生成、打开、转换或读取 Microsoft PowerPoint（.pptx）文件时使用本技能。包括：撰写幻灯片演示、路演材料、高管汇报材料、培训材料或任何演示交付物；从既有 .pptx 中提取文本或结构；用具体取值填充 .pptx 模板；把演示文稿转换为 PDF 或图片；拆分或合并演示文稿；检查幻灯片、版式、母版、表格、图片、图表、演讲者备注或批注。当出现 deck、slides、presentation、pitch deck、keynote（且预期产出 .pptx）等词，或任何以 .pptx 结尾的文件名时触发。当主要交付物是 Word 文档、电子表格、PDF 报告、HTML 站点或 Google Slides API 调用时，不要触发，即使过程中出现了演示形态的内容。 | Trigger keywords: deck, slides, presentation, pitch deck, keynote, .pptx filename. Do NOT trigger for Word, spreadsheet, PDF report, HTML site, Google Slides API output."
license: Apache-2.0 — see LICENSE for terms and third-party attributions
---

# PPTX 技能

一个 Apache-2.0 工具集，用于生成、编辑和读取 Microsoft PowerPoint（`.pptx`）文件。它完全基于公开的 [ECMA-376 / ISO/IEC 29500 (PresentationML)](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) 规范从零编写，并构建在宽松许可的工具之上（`python-pptx` MIT、`pptxgenjs` MIT、`lxml` BSD-3-Clause、`Pillow` MIT-CMU，以及可选的外部二进制 `soffice` MPL 2.0 与 `pdftoppm` GPL），因此可以不受限制地在商业项目中复用。

## 决策矩阵

| 场景 | 路径 | 先读 |
|-----------|------|------------|
| 依据提示词或数据集构建演示文稿——没有可起步的源文件 | 用 `python-pptx`（结构化 / 可重复）或 PptxGenJS（偏设计、JS）创作 | [`create.md`](create.md) |
| 有 `.pptx` 模板需要填写——保留其母版、版式、观感 | 通过 `python-pptx` 替换占位符 | [`edit.md`](edit.md) → *模板填充* |
| 深度结构编辑——重排幻灯片、拼接 XML、添加非常规对象 | 解包 → 编辑 XML 部件 → 组装 | [`edit.md`](edit.md) → *原始 XML 工作流* |
| 只需要从 `.pptx` 中取出文本 / 演讲者备注 / 结构 | 提取流水线 | [`read.md`](read.md) |
| 把演示文稿转成 PDF 或 PNG 图片（视觉 QA、发布） | 通过 LibreOffice 运行 `scripts/render_pdf.py` / `scripts/render_slides.py` | 见下文 *QA* |
| 用于预览模板的幻灯片缩略图网格 | `scripts/contact_sheet.py`（Pillow） | [`read.md`](read.md) → *缩略图* |

如果任务混合了其中几项，请按以下顺序执行：
**读取 → 逐页规划 → 编辑/创建 → 校验 → 视觉 QA。**

## 一次性环境准备

> **内置运行时：** 当设置了环境变量 `MIMO_PYTHON` 时，跳过 `uv`/pip 安装——把下面每条 Python 命令中的 `uv run` 替换为 `"$MIMO_PYTHON"`（已预装 python-pptx/Pillow/lxml；pip 控制台脚本不可用，请使用 `"$MIMO_PYTHON" -m <module>`）。内置的 LibreOffice 以 `MIMO_SOFFICE` 暴露（`soffice_bridge.py`/`render_pdf.py` 会自动识别）；当缺少 Poppler（`pdftoppm`）时，幻灯片光栅化会在该解释器中自动回退到 pypdfium2。对于 PptxGenJS 创作路径，内置的 Node.js 以 `MIMO_NODE` 暴露，pptxgenjs/react/react-dom/sharp/react-icons/mathjax-full 已预装在 `MIMO_NODE_MODULES` 中——请以 `NODE_PATH="$MIMO_NODE_MODULES" "$MIMO_NODE" <script.js>` 运行脚本，而不是 `npm install`。

### 前置条件

如果尚未安装 `uv` 或 `bun`：

```bash
# Install uv (Python package/project manager)
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Install bun (TypeScript runtime, replaces Node.js for this workflow)
# macOS / Linux
curl -fsSL https://bun.sh/install | bash
# Windows: powershell -c "irm bun.sh/install.ps1|iex"
```

只有在用户明确拒绝 `uv` / `bun` 时，才用 `pip`（放在你自己管理的 venv 中）替代 `uv`，并用 `npm`/`pnpm` + `npx tsx` 替代 `bun`——本技能的其余部分保持不变。

### Python（uv）

Python 依赖由 `uv` 管理。不要直接使用 `pip`。

```bash
# Initialize project (if no pyproject.toml exists)
uv init -p 3.12

# Add dependencies
uv add python-pptx lxml Pillow
uv add defusedxml                  # safe XML parsing (recommended for manual XML edits)
```

**规则：**
- 绝不要使用 `pip`——安装包一律用 `uv add`。
- 绝不要直接运行 `python scripts/...`——一律用 `uv run scripts/...`。
- 不要用 `python -m venv` 或 `source .venv/bin/activate` 手动管理环境。

### TypeScript（bun）

对于 PptxGenJS 创作，请使用 `bun`（项目本地，不要全局安装）：

```bash
# Initialize (if no package.json exists)
bun init -y

# Add dependencies
bun add pptxgenjs                  # core PPTX creation library
bun add react react-dom sharp      # rasterization (icons + formulas)
bun add react-icons                # icon library (FA, MD, etc.)
bun add mathjax-full               # LaTeX formula rendering

# Type definitions (including Bun runtime types)
bun add -d @types/bun @types/react @types/react-dom
```

如果不存在 `tsconfig.json`，请创建一个：
```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun"]
  }
}
```

直接以 TypeScript 运行脚本——无需转译：
```bash
bun run create-ppt.ts
```

**编写或修改 TS 代码后务必运行类型检查：**
```bash
bun tsc --noEmit
```
模型可能在不知不觉中使用过时的 PptxGenJS API 签名或已废弃的语法。类型检查能在运行前捕获这些不匹配。

### 系统依赖（PDF/PNG 渲染）

```bash
# macOS
brew install --cask libreoffice
brew install poppler

# Debian/Ubuntu
sudo apt-get install -y libreoffice poppler-utils
```

`scripts/` 下的每个脚本只使用标准库加上 `python-pptx`、`lxml` 和 `Pillow`。没有任何专有依赖。外部二进制（`soffice`、`pdftoppm`）以子进程方式调用；不捆绑也不静态链接任何东西。

## 常用命令

```bash
# 1. Extract text from every slide (title, body, notes) — the "what does it say?" query
uv run scripts/dump_text.py input.pptx --notes > input.txt

# 2. Convert a deck to PDF for review
uv run scripts/render_pdf.py input.pptx                     # writes input.pdf next to it

# 3. Convert every slide to a PNG (visual QA)
uv run scripts/render_slides.py input.pptx --out slides/       # writes slides/slide-1.png, ...

# 4. Grid thumbnail preview (planning which template slide to reuse)
uv run scripts/contact_sheet.py input.pptx --cols 3         # writes input.contact-sheet.jpg

# 5. Explode a .pptx into readable XML for surgical edits
uv run scripts/explode.py input.pptx unpacked/

# 6. Reassemble an exploded tree
uv run scripts/assemble.py unpacked/ output.pptx

# 7. Drop orphaned slides and unused media before reassembly
uv run scripts/prune.py unpacked/

# 8. Duplicate slide 3, or spin up a new slide from layout 5
uv run scripts/insert_slide.py unpacked/ --clone slide3.xml
uv run scripts/insert_slide.py unpacked/ --blank-from slideLayout5.xml

# 9. Well-formedness check (ZIP + XML + python-pptx round-trip)
uv run scripts/diagnose.py output.pptx
```

每个脚本都是一个小型 Python CLI。有些脚本（例如 `render_pdf.py`、`render_slides.py`、`contact_sheet.py`）会从同目录下的共享辅助模块（`soffice_bridge.py`）导入——请一起复制。阅读每个文件开头可了解其完整的 CLI 选项。

## 实时预览

提供实时预览服务器，用于幻灯片的实时反馈。
**默认不启动。** 开始多幻灯片工作时，询问用户是否希望启用实时预览。

**只在纯命令行环境中提供此选项。** 该服务器面向 ymcode CLI。如果你运行在通过 SDK 嵌入 ymcode 的宿主中——Web UI、桌面应用、IDE 插件等——该宿主几乎肯定有自己的原生预览 / 打开文件机制；请改用宿主机制，不要启动此服务器。

如果用户同意，且当前是 CLI 环境：

```bash
# `scripts/preview.ts` lives in this skill's bundle directory, not in
# your cwd. Prefix it with the absolute path shown in this skill's
# location header (the folder that contains SKILL.md) — refer to it
# as <SKILL_DIR> below.

# Start (spawns background server, prints URL, exits immediately)
bun run <SKILL_DIR>/scripts/preview.ts /path/to/output.pptx
bun run <SKILL_DIR>/scripts/preview.ts /path/to/output.pptx --port 5000

# Stop
bun run <SKILL_DIR>/scripts/preview.ts --stop /path/to/output.pptx
```

如果服务器已在运行，`preview.ts` 会通过 PID 文件检测到，并打印现有 URL，而不是再启动一个重复实例。

后台服务器会监视 `.pptx` 文件，做防抖（800ms），通过 LibreOffice 转换为 PDF，并向浏览器推送 WebSocket 重载。浏览器原生的 PDF 阅读器提供滚动、缩略图、缩放和搜索。预览输出写入 `.pptx-preview/`（与 `qa/` 分开，不会与其他脚本冲突）。

把打印出的 URL 交给用户在浏览器中打开。

**实时预览仅供人使用——它不能替代视觉 QA。**
预览服务器让用户观察进度。你仍必须按“视觉 QA 执行模型”一节所述运行视觉 QA 子代理（把 PNG 渲染到 `qa/`，派出视觉模型检查）。这是两条独立的工作流：
- 预览服务器 → 用户在浏览器中看到实时更新
- 视觉 QA 子代理 → 自动检查，捕获你看不到的问题

**多幻灯片工作中何时重新生成 .pptx：** 如果用户已开启预览服务器，请在完成每个逻辑模块后重新生成 `.pptx`（重跑创作脚本）——例如完成某一节的幻灯片之后，而不是每放置一个形状就重跑。这样能给用户有意义的视觉检查点，又不会产生过多中间渲染。

## 编写原则

幻灯片是**视觉表面**。用户可能在房间后排 40 英尺处看，也可能在手机上三英寸宽的浏览器标签页里看。两种情况都必须成立。请牢记：

1. **每页一个观点。** 如果你无法用五个词的标题概括这一页，就把它拆成两页。长篇推理属于随演示文稿一起交付的文档，而不是幻灯片本身。
2. **写标题，而不是标签。** 标题是这一页的论点。“收入”是标签。“收入增长 34%，人员仅增 22%”才是标题。标题承载论点，正文承载证据。
3. **每一页都要靠视觉元素立足。** 没有图表、图片、图标或形状的幻灯片通常只是要点堆砌。把它改成对比、数据亮点或示意图，否则就删掉。**“视觉”不一定是一张图片**——数据亮点、对比形状或排版精良的引文本身就是视觉。确实需要图片时，见下文 *图片来源*。
4. **用版式，而不是逐页几何。** 对于任何会被复用的东西（章节分隔页、内容页、引文页），定义一次 `slide_layout` 然后套用。这样换主题只需改一行，而不是扫改五十页。
5. **宽高比匹配目标场景。** 笔记本和投影仪用 16:9（默认）；仅在明确要求时用 4:3（学术界和部分企业模板仍常见）；较老的宽屏用 16:10。
6. **让演讲者备注承载讲稿。** 把完整讲述放进 `slide.notes_slide.notes_text_frame`，让演讲者可以直接对着演示文稿排练。幻灯片上只保留他们能记住的那句话。
7. **不要默认使用项目符号。** 要点列表是大多数演示文稿的失败模式——对比、表格、带标签的图标和数据亮点几乎总是效果更好。

## 图片来源（选对渠道）

“每一页都要靠视觉元素立足”**并不**意味着“给每一页生成一张图片”。要根据图片承担的职责来选择来源。共有四个渠道，按偏好排序（成本更低 + 稳定性更高者优先）：

**L1 · 用代码绘制。** 图标用 react-icons / iconify。图表用 matplotlib / plotly / echarts。流程图、对比图、组织架构图用形状 + 线条。任何数据或概念可视化都属于这一类——绝不要为此抓取或生成图片。

**L2 · 搜索图库，然后下载字节。** 当某一页需要**通用的真实照片**（城市天际线、办公桌、团队协作、自然风光、图库素材）时，用 `websearch` 配合 `site:unsplash.com` / `site:pexels.com` / `site:pixabay.com` 查询找到真实 URL，然后**把图片下载到本地文件**，再把这个路径传给 `add_picture`（见下文 *下载*）。不要试图把 HTTP URL 直接传给 `add_picture`——python-pptx 的 `add_picture` 只接受本地路径或类文件对象；它不会替你抓取 URL。

**L3 · 搜索特定来源。** 对于**特定的真实事物**（某家公司的 Logo、某个产品的官方截图、某位具名人物的照片），用 `websearch` 配合定向查询（例如 `"Acme Inc" logo site:acme.com`，或 `<product name> screenshot`），而不是图库查询，然后按与 L2 相同的方式下载字节。此处绝不要调用 `image_gen`——生成的 Logo 不会像真实 Logo。注意：`webfetch` 只返回 text/markdown/html，无法提供二进制图片字节——请用 `bash` + `curl` 或 python `urllib` 下载。

**L4 · 用 `image_gen` 生成。** 只用于**风格化视觉**——封面图、主视觉背景、插画风格的概念图、品牌氛围图。预算：**每套演示文稿最多 1–2 次 `image_gen` 调用**，通常用于封面或章节分隔页。不要用于每一页内容。

### 为 `add_picture` 下载 URL

两种可行写法。两者都把文件保存在本地，以便 `add_picture` 读取字节：

```python
# Pattern A: download to a temp file, then pass the path
from urllib.request import Request, urlopen
from pathlib import Path

def download_image(url: str, dest: Path) -> Path:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})  # some CDNs 403 an empty UA
    with urlopen(req, timeout=15) as r:
        dest.write_bytes(r.read())
    return dest

path = download_image(hit_url, Path("assets/hero.jpg"))
slide.shapes.add_picture(str(path), Inches(1), Inches(1.5), width=Inches(11))
```

```python
# Pattern B: in-memory via BytesIO — no temp file, but same request headers
from io import BytesIO
from urllib.request import Request, urlopen

req = Request(hit_url, headers={"User-Agent": "Mozilla/5.0"})
with urlopen(req, timeout=15) as r:
    slide.shapes.add_picture(BytesIO(r.read()), Inches(1), Inches(1.5), width=Inches(11))
```

或在 bash 步骤中完成：

```bash
curl -sSL -A "Mozilla/5.0" -o assets/hero.jpg "$URL"
```

任何下载都要包在 try/except 中：失败时顺延到下一个渠道（L3 → L4）或用形状 + 文字兜底——绝不要让某一页留空。

### 决策（逐页执行）

1. 这一页真的需要图片吗？答案常常是不需要——大号数据亮点、对比形状、排版精良的引文或示意图*本身*就是视觉。当版式 + 字体已能传达信息时，就跳过图片。
2. 如果需要，选择能奏效的最便宜渠道：
   - 数据 / 概念 / 流程 / 图标 → **L1**（用代码绘制）
   - 通用真实照片 → **L2**（图库搜索 + 下载）
   - 特定品牌 / Logo / 产品 / 人物 → **L3**（定向网络搜索 + 下载）
   - 风格化封面 / 主视觉 / 插画 → **L4**（`image_gen`）
3. 如果抓取失败：L2 → L3 → L4 → 形状 + 文字兜底。绝不要因为图片加载失败而让某一页留空。

### 反模式

- **每一页内容都调用 `image_gen`。** 慢、贵、风格不一致、视觉嘈杂。20 页演示文稿配 20 张生成图是危险信号，不是成功。
- **把 HTTP URL 直接传给 `add_picture`。** python-pptx 会抛出 `FileNotFoundError`——务必先下载字节（见 *下载*）。
- **用 `webfetch` 抓取图片字节。** `webfetch` 只返回文本。二进制请用 `bash` + `curl` 或 python `urllib`。
- **凭记忆编造图库 URL。** Unsplash / Pexels 的 CDN 路径是不透明哈希——你无法可靠地回忆起一个既存在又匹配所述内容的 URL。永远先搜索，再下载。
- **用 `image_gen` 生成 Logo、名人照片或产品截图。** 输出不会像真品。请使用定向网络搜索（L3）。
- **高管 / 状态 / 周报演示文稿使用插画风格。** 工作汇报是数据 + 图标 + 层级，而不是概念艺术。把 L4 留给发布、品牌或主视觉。
- **因为图片抓取失败而让某一页留空。** 始终备好形状 + 文字兜底；格式良好的数据亮点无论如何都比空白页更好。

### 场景默认值（各类演示文稿的大致配比）

L2/L3 每张图大约各需一次 `websearch` + 一次下载——比起 L4 很便宜，但也不是零成本。L1 仍是默认。

| 演示文稿类型 | 主导 | 说明 |
|------------------------|----------|-------------------------------------------------|
| 状态 / OKR / 周报 | L1（约 90%） | 图标 + 数据图表。几乎不用 L2 / L3 / L4。 |
| 战略 / 提案 | L1 + L2 | 约 60% L1、约 30% L2（搜索图库）、约 10% L4 封面。 |
| 销售 / 路演 / BP | L2 + L3 | 客户 Logo 与产品截图（L3）很关键。封面最多 1 张 L4。 |
| 培训 / 教育 | L1（约 80%） | 示意图和流程图效果最好。 |
| 发布 / 品牌 | 以 L4 为主 | 视觉就是重点。仍要限制风格漂移并复用素材。 |
| 竞品分析 | 以 L3 为主 | Logo 和截图不可替代。 |

## 排版默认值（安全的起点）

| 元素 | 字体 | 字号 | 字重 | 说明 |
|----------------------|---------------|---------|---------|-------|
| 幻灯片标题 | Calibri / Segoe UI | 32-40pt | 粗体 | 单行——需要折行就重做标题 |
| 章节标题 | Calibri | 24-28pt | 粗体 | 放在专门的章节分隔页 |
| 正文 / 要点 | Calibri | 18-22pt | 常规 | 面向房间演讲绝不低于 18pt；屏幕演示可用 14pt |
| 数据亮点 | Calibri Light | 60-96pt | 粗体 | 先放数字，下方用 14-18pt 放标签 |
| 题注 / 页脚 | Calibri | 10-12pt | 常规 | 柔和灰 `#7A7A7A` |
| 代码 / 等宽 | Consolas / Cascadia Code | 16-20pt | 常规 | 左对齐，不自动换行 |

按主题调整配色（金融 → 藏青 `#1F3A5F`；环保 → 森林绿 `#2C5F2D`；产品发布 → 你的品牌强调色）。背景避免纯黑配纯白——`#F7F5F0` 米白配 `#1F1F1F` 墨色，在投影仪下更柔和。

## 幻灯片尺寸

| 宽高比 | 宽 × 高（英寸） | 96 DPI 下的像素 | 适用场景 |
|--------|-------------------------|------------------|-------------|
| 16:9 宽屏（默认） | 13.333 × 7.5    | 1280 × 720       | 几乎所有新演示文稿 |
| 16:10                      | 13.333 × 8.333  | 1280 × 800       | 较老的投影仪；部分企业模板 |
| 4:3 标准               | 10.0   × 7.5    | 960  × 720       | 学术界、遗留模板、打印讲义 |
| A4 横向               | 11.69  × 8.27   | 1123 × 794       | 以打印为先的演示文稿（欧洲） |
| Letter 横向           | 11.0   × 8.5    | 1056 × 816       | 以打印为先的演示文稿（美国） |

## QA 检查清单——宣布完成前务必执行

**假设一定有问题。** PowerPoint 会悄无声息地打开损坏的文件：错位的文本框、指向已删除数据的图表、模板填充后残留的多余占位符。请显式验证。

1. **能干净打开。** 没有修复对话框，没有部件缺失警告。
   ```bash
   uv run scripts/diagnose.py output.pptx
   ```

2. **文本完整性。** 没有占位符残留，也没有未填的 `{{token}}`：
   ```bash
   uv run scripts/dump_text.py output.pptx --notes \
       | grep -Ei "\{\{|TODO|TBD|lorem|ipsum|xxxx|click to add"
   ```
   grep 必须没有任何输出。

3. **视觉检查。** 把整套演示文稿渲染成 PNG，抽查首页、末页以及你改动过的任何页面。检查：
   - 文本溢出占位符，或被自动缩小到无法阅读。
   - 两个形状重叠（标题压住图片、页脚压住正文）。
   - 图表上的图例 / 坐标轴标签被截断。
   - 图标比例不对（细如发丝的小图标，或被拉得巨大）。
   - 从复制来的幻灯片混入的非品牌色。
   ```bash
   uv run scripts/render_slides.py output.pptx --out qa/
   ```

4. **版式卫生。** 每个非母版幻灯片都应引用真正的版式，章节分隔页不要默认用 `slideLayout1`：
   ```bash
   uv run python -c "
   from pptx import Presentation
   prs = Presentation('output.pptx')
   for i, s in enumerate(prs.slides, 1):
       print(f'slide {i}: layout={s.slide_layout.name!r}')"
   ```

任何一项不通过，修复后重新运行——不要掩盖问题。

## 视觉 QA 执行模型

**幻灯片图片很昂贵。** 一张 150 DPI 渲染的 PNG 会消耗数千个上下文 token。把多张幻灯片加载进主对话来检查，会很快耗尽上下文预算，并挤占有用的工作记忆。

**默认：视觉检查一律使用子代理。** 派出一个 `general` 子代理，附上渲染好的 PNG 路径和上面第 3 步的检查标准。子代理以文本形式报告发现（幻灯片编号 + 问题描述）；图片绝不进入主对话上下文。这是强制要求，除非下面列出的例外情形成立。

```
actor({
  operation: {
    action: "run",
    subagent_type: "general",
    // omit `model` when your current model is vision-capable (preferred — see Model selection)
    description: "Visual QA slides",
    prompt: "Inspect the rendered slide images in qa/ for: text overflow, overlapping shapes, cut-off labels, wrong-scale icons, off-brand colors. Report each issue as 'slide N: <problem>'. Images: qa/slide-1.png through qa/slide-<N>.png."
  }
})
```

**模型选择（按优先级顺序）：**

1. **优先使用用户当前的模型。** 通过 `actor({ operation: { action: "models", vision: true } })` 查询可服务的视觉模型。如果你当前的模型在列表中，**省略 `model` 参数**——子代理会继承它，视觉 QA 就在用户选定的模型上运行。
2. **回退：明确说明使用轻量视觉模型。** 如果你当前的模型不具备视觉能力，请从查询结果中挑一个**轻量级**视觉模型（如果有 haiku/flash/lite 级别就用它，否则选列表中成本最低的），并**在回复中告诉用户**你为视觉 QA 使用了哪个模型以及原因（当前模型无法检查图片）。
3. **没有可用的视觉模型。** 如果查询返回空列表，不要猜测模型 id——跳过视觉 QA 子代理，只运行结构检查，并告诉用户无法完成视觉检查。

**绝不要硬编码模型 id。** 可服务的模型因部署而异，并会随时间变化；只有视觉模型查询返回的 id 才保证可用。猜测的 id 会直接让子代理失败。

**例外——在主上下文中直接检查：** 只有当用户明确要求当前模型检查某一页以进行细粒度、交互式编辑时（例如“看第 5 页，把标题位置调一下”），才直接加载幻灯片图片（不经过子代理）。这要求当前模型是多模态的。如果不是，请告知用户，并提议改为派出视觉子代理。

## 常见视觉陷阱

- **标题折成两行**——要么缩短标题，要么加宽占位符。折行标题会把正文往下推，破坏各页之间的版式对齐。
- **正文自动缩小到 14pt 以下**——python-pptx 会遵循占位符的自动调整设置；如果结果字号无法阅读，就把这一页拆开，而不是接受缩小。
- **图表继承 Office 默认样式**——PowerPoint 自带的淡蓝 / 灰配色看起来很通用。请显式设置 `chart.chart_style`，或用 `python-pptx` 的底层访问接口为数据系列设置填充色。
- **忘记演讲者备注**——没有备注的演示文稿无法排练。为每一页填写 `notes_slide.notes_text_frame.text`，哪怕只有一句话。
- **图片 DPI 不当**——在 1280×720 的幻灯片里放 4000×3000 的照片只会让文件变大，毫无视觉收益。请按目标显示尺寸重采样到约 150 DPI（见 `create.md` → *图片*）。
- **字体未嵌入**——`python-pptx` 不嵌入字体。如果演示文稿在没有所选字体的机器上打开，PowerPoint 会替换字体，版式随之漂移。对于**拉丁文**文本，优先使用系统安全字体（Calibri、Arial、Segoe UI、Times New Roman、Consolas），或随 .pptx 一起提供字体安装步骤。
- **CJK 文本需要东亚字体槽位**——`run.font.name` 只设置拉丁字体（`a:latin`）；中文 / 日文 / 韩文字形来自东亚槽位（`a:ea`），而 python-pptx 并未暴露它。若置之不理，CJK 会渲染成豆腐块或不一致的替代字体。请在每一个包含 CJK 文本的 run 上，把 `a:latin` + `a:ea` + `a:cs` 都设置为支持 CJK 的字体（配方见 `create.md` → *CJK / 东亚文本*）。

## 不在范围内

- **`.ppt`（PowerPoint 97-2003 二进制格式）**。请先转换：
  `soffice --headless --convert-to pptx old.ppt`。
- **VBA / 宏 / `.pptm`。** 本技能不生成也不执行宏。
- **受密码保护或加密的演示文稿。** `python-pptx` 无法读取加密文件；请先用 PowerPoint 或 LibreOffice 解除保护。
- **实时 PowerPoint 自动化。** 若需 COM（Windows）或 AppleScript（macOS）集成，请使用专门的自动化库——本工具集是文件进 / 文件出的。
- **Keynote `.key` 文件。** 它不是 PresentationML 格式；往返处理请使用 Apple 的 Keynote 或 LibreOffice。

## 各细节的位置

- **从零创建**：[`create.md`](create.md)——python-pptx 配方、PptxGenJS 配方、版式、文本、表格、图片、图表、图标、背景、演讲者备注、配色与排版指导。
- **编辑 / 模板**：[`edit.md`](edit.md)——占位符填充、幻灯片复制 / 重排 / 删除、为 XML 手术而解包/组装、批注、孤立部件清理、常见陷阱。
- **读取 / 提取**：[`read.md`](read.md)——纯文本导出（含演讲者备注）、结构遍历、元数据、缩略图、图片提取、为 QA 转换为 PDF / PNG。
- **脚本**：[`scripts/`](scripts/)——CLI 工具（部分脚本共用本地 `soffice_bridge.py` 辅助模块；提取时请一起复制）。
- **实时预览**：[`scripts/preview.ts`](scripts/preview.ts)——启动器（启动/停止）；[`scripts/preview_server.ts`](scripts/preview_server.ts)——后台服务器，监视 .pptx、转换为 PDF，并通过浏览器原生 PDF 阅读器提供 WebSocket 热重载。
