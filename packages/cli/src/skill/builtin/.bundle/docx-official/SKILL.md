---
name: docx-official
description: "当正在生成、打开、转换或读取 Microsoft Word（.docx）文件时使用本技能。包括：撰写报告、信函、合同、RFP、技术文档或任何长篇书面交付物；从既有 Word 文件中提取文本或结构；用具体取值填充 Word 模板；把 Word 转换为 PDF 或纯文本；拆分或合并文档；检查样式、标题、节、表格、图片、批注或修订。 | Trigger keywords: Word doc, DOCX, Office document, a filename ending in .docx, turn this into a Word report."
license: Apache-2.0 — see LICENSE for terms and third-party attributions
---

# DOCX 技能

一个 Apache-2.0 工具集，用于生成、编辑和读取 Microsoft Word（`.docx`）文件。它完全基于公开的 [ECMA-376 / ISO/IEC 29500](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) 规范从零编写，并构建在宽松许可的工具之上（`python-docx` MIT、`lxml` BSD-3-Clause，以及可选的外部二进制 `pandoc` 和 `soffice`），因此可以不受限制地在商业项目中复用。

## 决策矩阵

| 场景 | 路径 | 先读 |
|-----------|------|------------|
| 没有源文件——依据提示词 / 数据构建文档 | 用 `python-docx` 从零创作 | [`create.md`](create.md) |
| 有需要填写或小幅修改的 `.docx` 模板 | 通过 `python-docx` 替换占位符，保留样式 | [`edit.md`](edit.md) → *工作流 A —— `python-docx` 原地编辑* |
| 深度结构编辑、新增章节、自定义 XML、非常规版式 | 解包 → 编辑 XML → 组装 | [`edit.md`](edit.md) → *工作流 B —— 解包 → 编辑 XML → 组装* |
| 只需要从 `.docx` 中取出文本 / 结构 / 元数据 | 提取流水线 | [`read.md`](read.md) |
| 需要 PDF 预览来做 QA | 通过 LibreOffice 运行 `scripts/render_pdf.py` | 见下文 *QA* |

如果任务混合了其中几项，请按以下顺序执行：**读取 → 规划 → 编辑/创建 → 校验**。

## 一次性环境准备

> **内置运行时：** 当设置了环境变量 `MIMO_PYTHON` 时，完全跳过 `uv`/`python3` 与 pip 安装——把下面每条命令中的 `uv run` 替换为 `"$MIMO_PYTHON"`（例如 `"$MIMO_PYTHON" scripts/extract_text.py input.docx`）。本技能的 Python 依赖已预装在该解释器中；pip 控制台脚本不可用，因此始终通过 `"$MIMO_PYTHON" -m <module>` 调用。内置的 LibreOffice 以 `MIMO_SOFFICE` 暴露，此处的脚本会自动识别它。

所有脚本都包含 [PEP 723](https://peps.python.org/pep-0723/) 内联元数据，因此 `uv run` 会自动解析依赖——无需手动安装步骤。直接运行：

```bash
uv run scripts/extract_text.py input.docx
```

如果你不使用 `uv`，请一次性安装依赖：

```bash
python3 -m pip install --upgrade python-docx lxml
# Optional but recommended:
#   LibreOffice (for docx → pdf preview):   brew install --cask libreoffice   (macOS)
#                                           apt-get install -y libreoffice    (Debian/Ubuntu)
#   Poppler   (for pdf → image, QA loop):   brew install poppler
```

或者，如果本技能位于持久化工作区中，你可以 `uv init` 一个项目、`uv add python-docx lxml`，然后在项目根目录用 `uv run scripts/...` 运行脚本——这样就能获得锁文件与可复现的环境。

此处所有脚本只使用标准库加上 `python-docx`。没有任何专有依赖。

## 常用命令

```bash
# 1. Extract plain text (best for "what does this file say?" questions)
uv run scripts/extract_text.py input.docx > input.txt

# 2. Explode a .docx into readable XML for structural surgery
uv run scripts/explode.py input.docx exploded/

# 3. Assemble an exploded directory into a fresh .docx
uv run scripts/assemble.py exploded/ output.docx

# 4. Render a .docx as PDF (used for visual QA)
uv run scripts/render_pdf.py output.docx           # writes output.pdf next to it

# 5. Well-formedness check (ZIP integrity + parseable XML + python-docx open)
uv run scripts/audit.py output.docx

# 6. Accept every tracked change without needing Word/LibreOffice
uv run scripts/resolve_revisions.py reviewed.docx clean.docx

# 7. Add a comment to an exploded directory
uv run scripts/annotate.py exploded/ "Please check" --author "Reviewer" --anchor "text"
```

每个脚本都是一个短小、自包含的 Python 文件。阅读文件开头即可了解完整的 CLI 选项。

## 编写原则

Word 是**流式**文档格式，而不是幻灯片画布。用户期望它看起来像人在 Word 里写出来的东西——而不是某个试图重新发明排版的设计工具。请牢记这一点：

1. **依赖命名样式。** 使用 `Heading 1`、`Heading 2`、`Normal`、`Title`、`Quote`、`List Bullet`、`List Number`、`Caption`。正是它们让 Word 的目录、导航窗格和交叉引用得以工作。
2. **每段一个观点。** 长段落没问题；一逗到底的段落不行。在逻辑边界处分段。
3. **结构优先，行文其次。** 先草拟标题树，再在其中写作。审阅者扫读标题先于正文。
4. **表格只用于表格型数据。** 不要用表格伪造多栏布局——导出 PDF 后，用户会看到边框穿透布局。
5. **行宽由页边距决定，而不是硬换行。** 绝不要插入手动换行来控制折行。
6. **会变化的内容使用域，而不是字面文本**——页码、日期、目录、交叉引用。`python-docx` 可通过底层 XML 支持域代码（见 `edit.md`）。
7. **每张图片都需要替代文本**——为了无障碍，而且缺失时 Word 会在审阅模式下不断告警。

## 排版默认值（安全的起点）

| 元素 | 字体 | 字号 | 字重 | 说明 |
|----------------|---------------|------|--------|-------|
| 标题 | Calibri Light | 28pt | 粗体 | 居中或左对齐，单行 |
| 标题 1 | Calibri Light | 18pt | 粗体 | 段前 12pt |
| 标题 2 | Calibri Light | 14pt | 粗体 | 段前 10pt |
| 标题 3 | Calibri | 12pt | 粗体 | 段前 6pt |
| 正文 | Calibri | 11pt | 常规 | 行距 1.15，段后 6pt |
| 题注 | Calibri | 9pt | 斜体 | 柔和灰 `#595959` |
| 代码 / 等宽 | Consolas | 10pt | 常规 | 左对齐，无首行缩进 |

按主题调整配色——法律/金融用沉稳的藏青 `#1F3A5F`，编辑出版用暖炭灰 `#2E2A26`。正文避免纯 `#000000`；`#1F1F1F` 在印刷品上读起来更柔和。

## 页面设置（A4 与 Letter）

询问用户使用哪一种。如果无法询问，按语言所暗示的地区取默认值（中文/欧洲 → A4，美式英语 → Letter）。页边距：

| 尺寸 | 宽 × 高 | 标准页边距（上/下/左/右） |
|--------|-------------------|-----------------------------|
| A4     | 21.0 × 29.7 cm    | 2.54 / 2.54 / 3.18 / 3.18 cm |
| Letter | 8.5 × 11.0 in     | 1.00 / 1.00 / 1.25 / 1.25 in |

## QA 检查清单——宣布完成前务必执行

**假设一定有问题。** Word 文件会静默失败：损坏的关系、未闭合的 `<w:p>`、缺失的样式——Word 仍会打开文件，但会丢掉内容或抛出“内容有问题”的警告。请显式验证。

1. **能干净打开**——没有修复提示。
   ```bash
   uv run python -c "import docx; docx.Document('output.docx')"   # loads without exceptions
   ```
2. **文本完整性**——没有占位符残留。
   ```bash
   uv run scripts/extract_text.py output.docx | grep -Ei "TODO|TBD|\{\{|lorem|xxxx"
   ```
   grep 必须没有任何输出。
3. **视觉检查**——渲染为 PDF，打开首页和末页，检查：
   - 孤行标题单独留在页面底部。
   - 表格跨页断裂且不美观。
   - 图片因超出内容宽度而被挤到单独一页。
   - 缺少页码、页眉/页脚内容错误。
   ```bash
   uv run scripts/render_pdf.py output.docx
   ```
4. **样式卫生**——每个标题都使用真正的样式，而不只是加粗放大：
   ```bash
   uv run python -c "
   import docx; d = docx.Document('output.docx')
   for p in d.paragraphs:
       if p.text and p.style.name == 'Normal' and p.runs and p.runs[0].bold:
           print('possible fake heading:', p.text[:80])"
   ```

任何一项不通过，修复后重新运行——不要掩盖问题。

## 不在范围内

- **`.doc`（旧版 Word 97-2003）**——本技能只面向 `.docx`（Office Open XML）。请先用 LibreOffice 把 `.doc` 转换为 `.docx`：`soffice --headless --convert-to docx old.doc`。
- **实时协同编辑**——Word 在线 API 是另一回事；这里我们只生成和修改文件。
- **宏 / VBA**——不要生成 `.docm` 文件。如果用户要求自动化，改为提供一个能重新生成文档的 Python 脚本。

## 各细节的位置

- **从零创建**：[`create.md`](create.md)——标题、段落、样式、表格、图片、页面设置、页眉/页脚、目录。
- **编辑 / 模板**：[`edit.md`](edit.md)——占位符替换、章节替换、原始 XML 手术、修订跟踪、批注。
- **读取 / 提取**：[`read.md`](read.md)——纯文本导出、结构遍历、元数据、表格提取。
- **脚本**：[`scripts/`](scripts/)——上述所有流程使用的自包含 CLI 工具。
