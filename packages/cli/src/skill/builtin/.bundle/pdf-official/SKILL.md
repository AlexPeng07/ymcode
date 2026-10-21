---
name: pdf-official
description: "当正在生成、打开、转换、填写或读取 PDF 文件时使用本技能。包括：从既有 PDF 中提取文本或表格；合并、切分、旋转、裁剪或添加水印；从头生成 PDF（报告、发票、证书）；填写 AcroForm 字段，或在不可填写的扫描表单上叠加文本；加密或解锁 PDF；对扫描文档运行 OCR；把页面渲染为 PNG/JPEG 做视觉分析。 | Trigger keywords: PDF, a filename ending in .pdf, turn this into a PDF report, AcroForm, form fields."
license: Apache-2.0 — see LICENSE for terms and third-party attributions
---

# PDF 技能

一个 Apache-2.0 工具集，用于读取、生成、转换和填写 PDF 文件。它基于宽松许可的开源库（pypdf、pdfplumber、pypdfium2、reportlab、pdf-lib、qpdf）从零编写，因此无需特别协议即可嵌入商业项目。

## 任务路由

根据请求的*动词*选择子指南。

| 任务 | 路径 | 阅读 |
|------|------|------|
| 从既有 PDF 中提取文本 / 表格 / 元数据 / 图片 | 提取 | [`extract.md`](extract.md) |
| 合并、切分、旋转、裁剪、加水印、加密或压缩 | 转换 | [`transform.md`](transform.md) |
| 构建尚不存在的 PDF（报告、发票、证书） | 生成 | [`compose.md`](compose.md) |
| 填写表单（AcroForm 或扫描件） | 交互 | [`interactive.md`](interactive.md) |
| 扫描件 / 纯图片 PDF（无可选文本） | 提取 → *OCR* | [`extract.md`](extract.md) §5 |

如果任务混合了其中几项，请遵循顺序：
**探测 → 规划 → 提取或生成 → 校验。**

每条路径都从探测开始。`scripts/survey.py` 返回页数、文件是否加密、是否包含 AcroForm，以及第 1 页看起来是否为扫描件。

## 首次安装

> **内置运行时：** 当设置了环境变量 `MIMO_PYTHON` 时，跳过下面的安装——把每条命令中的 `python3`/`uv run` 替换为 `"$MIMO_PYTHON"`（已预装 pypdf/pypdfium2/reportlab/Pillow；pip 控制台脚本不可用，请使用 `"$MIMO_PYTHON" -m <module>`）。内置的 qpdf 以 `MIMO_QPDF` 暴露（此处的脚本会自动识别）；可直接以 `"$MIMO_QPDF" --check file.pdf` 调用它。

纯 Python 路径（全部为 BSD / MIT / Apache）——覆盖 95% 的任务：

```bash
python3 -m pip install --upgrade pypdf pdfplumber pypdfium2 reportlab Pillow
```

只在确实需要时再添加这些外部二进制：

```bash
# qpdf — merge/split/encrypt/repair, Apache-2.0
brew install qpdf                # macOS
apt-get install -y qpdf          # Debian / Ubuntu

# Tesseract — OCR for scanned PDFs, Apache-2.0
brew install tesseract
python3 -m pip install pytesseract pdf2image
apt-get install -y tesseract-ocr

# Poppler — pdftotext / pdftoppm / pdfimages, GPL-2.0
# Optional. Only install if you accept a GPL dependency at CLI level.
brew install poppler
apt-get install -y poppler-utils
```

`scripts/` 下的每个脚本都使用 argparse。退出码：
`0` 正常 · `1` 运行时失败 · `2` 参数错误 · `3` 校验失败
（`apply_values.py` / `overlay_text.py`；`sanity_check.py` 以退出码 `1` 报告问题）。
任何单个脚本都可以直接搬到其他项目——没有任何脚本从共享框架导入。

## 一条命令完成分类

```bash
scripts/survey.py path/to/file.pdf --pretty
```

示例输出：

```json
{
  "path": "/abs/path/file.pdf",
  "page_count": 12,
  "is_locked": false,
  "form_field_count": 34,
  "looks_scanned": false,
  "metadata": {"Title": "...", "Author": "...", "Producer": "..."}
}
```

按标志位路由：

- `is_locked: true` → 先解锁（`qpdf --password=… --decrypt`）。几乎所有读取库都会拒绝锁定文件。
- `form_field_count > 0` → 走 [`interactive.md`](interactive.md) §1 的控件路径。
- `form_field_count == 0` 且你需要填写它 → 走 [`interactive.md`](interactive.md) §2 的叠加路径。
- `looks_scanned: true` → 跳过 pypdf 文本提取，直接走 OCR
  （[`extract.md`](extract.md) §5）。

## 哪个任务用哪个库

| 任务 | 首选 | 理由 | 备选 |
|------|-----------|--------|----------|
| 纯文本 | `pdftotext -layout` | 最快，保留分栏 | `pypdf` |
| 带位置的文本 | `pdfplumber` | 字符级 bbox | `pypdfium2.get_text` |
| 表格 | `pdfplumber` | 可调 `table_settings` | 用 pandas 而非手工 CSV |
| 页面 → 图像 | `pypdfium2` | Apache/BSD，无 GPL | `pdftoppm` (GPL) |
| 合并 / 切分 / 旋转 | `pypdf` | 纯 Python | `qpdf --pages`（超大文件更快） |
| 加密 / 修复 / 线性化 | `qpdf` | 能处理损坏的输入 | pypdf（仅基础加密） |
| 从零生成 | `reportlab` | 成熟，BSD | Node 中的 `pdf-lib` |
| 填写 AcroForm | `pypdf.update_page_form_field_values` | 保留控件外观 | Node 中的 `pdf-lib` |
| 在不可填写表单上叠加 | reportlab + `pypdf.merge_page` | 双层合并，见 interactive.md | — |

## 常见坑

1. **PDF 的原点在左下角**，图像的原点在左上角。每一个“差几个点”的 bug 都是这两套坐标系之一用错了。坐标转换集中在一处：[`interactive.md`](interactive.md) §2.c。
2. **对扫描件，`pypdf.extract_text()` 什么都返回不了。** 这不是 bug——本来就没有文本流。使用 `looks_scanned` 标志并路由到 OCR。
3. **Unicode 下标 / 上标在 reportlab 中会渲染成黑色矩形**，因为 Helvetica/Times/Courier 不包含这些字形。请在 `Paragraph` 中使用 `<sub>` / `<super>` XML，或直接在 canvas 上手动移动笔位。
   见 [`compose.md`](compose.md) §5。
4. **字体从未注册时，CJK 文本会渲染成黑方块。**
   reportlab 不会查询操作系统字体系统；字体名/路径写错（思源黑体、PingFang，或在未安装的机器上引用 Noto）再加上被吞掉的异常，就会静默回退到 Helvetica——而 Helvetica 没有 CJK 字形。请按 [`compose.md`](compose.md) §4 中的阶梯顺序（`resolve_cjk_font()`）解析字体；
   最终回退是内置 CID 字体，绝不使用 Helvetica。
5. **XFA 表单不是 AcroForm。** 如果一个 PDF 在 Adobe Reader 中明显有控件，而 `probe_fields.py` 返回 `[]`，那它就是 XFA——请先在 Acrobat 中将其扁平化。
6. **pypdf 中的 `writer.encrypt(pw)` 默认使用 RC4**。要使用真正的 AES-256，请传入 `algorithm="AES-256"`，或使用 `qpdf --encrypt … 256 --`。

## 下一步

从路由表中打开对应的子指南，并从头到尾走一遍。
每个子指南底部都有一节校验（Validation），说明如何确认结果。
