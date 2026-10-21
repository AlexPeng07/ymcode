---
name: xlsx-official
description: "电子表格工具集。只要对话任意一侧的产物是工作簿文件——.xlsx、.xlsm、.xltx、.csv、.tsv——而用户希望生成、修改、清洗或读取该产物，就应使用本技能。典型触发：'build me a model'、'update this sheet'、'add a column'、'compute the totals as formulas'、'sanity-check this xlsx'、'export sheet 2 to CSV'、'render the workbook as PDF'、'the spreadsheet in ~/Downloads is a mess, fix it'。同样适用于财务模型、运营报表、数据清洗和模板填充。当工作簿只是素材，而真正的产出是 Word 文档、HTML 页面、可独立运行的 Python 脚本、Google Sheets 集成或入库管道时，请跳过本技能——在这些情况下，电子表格只是手段，而不是交付物。 | Trigger keywords: build me a model, update this sheet, add a column, compute totals as formulas, sanity-check an xlsx, export a sheet to CSV, render the workbook as PDF, fix a messy spreadsheet."
license: Apache-2.0 — see LICENSE for terms and third-party attributions
---

# XLSX 技能

一个 Apache-2.0 工具集，用于生成、编辑和读取 Microsoft Excel（`.xlsx`）文件。它完全基于公开的 [ECMA-376 / ISO/IEC 29500 (SpreadsheetML)](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) 规范从零编写，并构建在宽松许可的工具之上（`openpyxl` MIT、`pandas` BSD-3-Clause、`lxml` BSD-3-Clause、可选 `xlsxwriter` BSD-2-Clause、可选外部二进制 `soffice` MPL 2.0），因此可以不受限制地在商业项目中复用。

## 决策矩阵

| 场景 | 路径 | 先读 |
|-----------|------|------------|
| 依据提示词 / dataframe / 原始数值构建工作簿 | 用 `openpyxl` 创作（公式 + 格式），或用 `pandas` 处理批量数据 | [`create.md`](create.md) |
| 编辑既有 `.xlsx`——增加行、修补单元格、刷新公式 | 用 `openpyxl` 加载，保留公式与样式 | [`edit.md`](edit.md) |
| 只需读取数据（分析、ETL、快速 QA） | `pandas.read_excel` 加上 `openpyxl` 做结构检查 | [`read.md`](read.md) |
| 回写之前先清洗、聚合或转换表格数据 | pandas 管道，然后交回 openpyxl 做最终打磨 | [`analyze.md`](analyze.md) |
| 深度结构编辑（自定义 XML 部件、定义名称、不含 VBA 的手术） | 解包 → 编辑 XML → 重新打包 | [`edit.md`](edit.md) → *原始 XML 工作流* |
| 交付前重新计算公式值 | 通过 LibreOffice 运行 `scripts/bake.py` | 见下文 *QA* |

如果任务混合了其中几项，请按以下顺序执行：
**读取 → 规划 → 编辑/创建 → 重算 → 校验。**

## 一次性环境准备

> **内置运行时：** 当设置了环境变量 `MIMO_PYTHON` 时，跳过下面的 pip 安装——把每条命令中的 `python3`/`uv run` 替换为 `"$MIMO_PYTHON"`（例如 `"$MIMO_PYTHON" scripts/overview.py book.xlsx`）。openpyxl/pandas/lxml/xlsxwriter 已预装在该解释器中；pip 控制台脚本不可用，因此始终通过 `"$MIMO_PYTHON" -m <module>` 调用。内置的 LibreOffice（供 `bake.py`/`pdf_out.py` 使用）以 `MIMO_SOFFICE` 暴露并会自动识别。

```bash
python3 -m pip install --upgrade openpyxl pandas lxml
# Optional but recommended:
python3 -m pip install --upgrade xlsxwriter
# For formula recalc and PDF export:
#   macOS       brew install --cask libreoffice
#   Debian/Ubuntu apt-get install -y libreoffice
```

`scripts/` 下的每个脚本只使用标准库加上 `openpyxl` 和 `pandas`。没有任何专有依赖。

## 常用命令

```bash
# 1. Describe a workbook (sheets, dimensions, formula count, sample rows)
python scripts/overview.py input.xlsx

# 2. Recalculate every formula, then flag any residual #REF! / #DIV/0! / etc.
python scripts/bake.py output.xlsx               # default 30s LibreOffice timeout
python scripts/bake.py output.xlsx --timeout 60  # custom timeout

# 3. Validate ZIP integrity, XML well-formedness, and openpyxl load
python scripts/audit.py output.xlsx

# 4. Convert to CSV (one file per sheet, or a single sheet by name/index)
python scripts/csv_out.py input.xlsx out_dir/           # all sheets
python scripts/csv_out.py input.xlsx out.csv --sheet 0  # first sheet

# 5. Convert to PDF for visual QA (needs LibreOffice)
python scripts/pdf_out.py output.xlsx           # writes output.pdf next to it

# 6. Unpack an .xlsx into readable XML parts (for surgical edits)
python scripts/explode.py input.xlsx unpacked/

# 7. Repack an unpacked directory into a fresh .xlsx
python scripts/assemble.py unpacked/ output.xlsx
```

每个脚本都是一个短小、自包含的 Python 文件。阅读文件开头即可了解完整的 CLI 选项。

## 编写原则

Excel 是**实时计算面**，而不是静态表格渲染器。用户打开工作簿时，期望能改数字、看其他部分随之更新，并信任所见结果。请牢记这一点：

1. **使用公式，而不是硬编码值。** 用 `=SUM(...)` 计算合计，而不是把 Python `sum()` 的结果写进单元格。源数据变化时，工作簿必须能自行重算。
2. **把假设放在专门的输入单元格。** 让公式引用它们（`=B5*(1+$B$6)`），绝不要内联（`=B5*1.05`）。这是决定模型是否可用的最关键单一因素。
3. **每张表一个主题。** 输入放在一张表，计算放在另一张，输出再放一张。跨表引用（`Inputs!B5`）让依赖关系显式化。
4. **命名样式胜过临时格式。** 对于任何会被复用的东西（表头、合计、输入、错误标记），注册一次 `NamedStyle` 然后反复套用。
5. **冻结表头。** `sheet.freeze_panes = "A2"`（如果首列是行标签则用 `"B2"`）——每张会滚动的表都需要它。
6. **按列一次性设置数字格式。** 对每一列的数据区域循环套用 `cell.number_format`（`for row in ws.iter_rows(min_col=3, max_col=3): ...`）。注意：`column_dimensions['C'].number_format` **不能**可靠地格式化你之后写入的单元格——openpyxl 写入的单元格自带样式。
7. **绝不要依赖 openpyxl 计算公式。** 它只保存字符串 `"=SUM(...)"` 以及（如果文件此前被打开过）缓存的旧值。新写入的公式在 LibreOffice 或 Excel 重算之前没有缓存值。

## 数字格式速查表

| 类型 | 格式字符串 | 显示效果 |
|------|---------------|---------|
| 带千分位的整数 | `#,##0` | `1,234` |
| 货币（美元，隐藏零） | `$#,##0;($#,##0);"-"` | `$1,234` / `($1,234)` / `-` |
| 货币（两位小数） | `$#,##0.00` | `$1,234.56` |
| 百分比（一位小数） | `0.0%` | `12.3%` |
| 倍数 | `0.00"x"` | `1.35x` |
| 年份按文本 | `0` | `2026`（无千分位） |
| 短日期 | `yyyy-mm-dd` | `2026-07-04` |
| 长日期 | `dddd, mmmm d, yyyy` | `Saturday, July 4, 2026` |
| 科学计数 | `0.00E+00` | `1.23E+04` |

财务场景中负数用括号；科学或工程场景中用前置负号。

## 颜色与样式约定

没有通用标准，但如果用户未指定，这套配色对内部财务或运营模型是安全的：

| 用途 | 取值 | 理由 |
|------------------------|-------------------|-----------|
| 表头文字 | `#1F1F1F` 置于 `#F2F2F2` 填充之上 | 高对比度，适合打印 |
| 输入（用户可改） | 蓝色 `#0033CC` | 与公式在视觉上区分 |
| 公式（计算结果） | 黑色 `#1F1F1F` | 默认阅读色 |
| 同工作簿链接 | 绿色 `#116611` | “来自本文件的其他位置” |
| 跨文件链接 | 红色 `#B22222` | “脆弱——指向本文件之外” |
| 待复核的假设 | `#FFF2CC` 填充 | 黄色高亮，黑白打印仍可读 |
| 错误 / 警告 | `#FFC7CE` 填充、`#9C0006` 文字 | Excel 内置的“差”样式 |

只要文件已有模板，就覆盖这些约定——精确匹配模板。

## QA 检查清单——宣布完成前务必执行

**假设一定有问题。** Excel 会悄无声息地打开损坏的文件：游离的 `#REF!`、差一行的区域、悄悄算出 `0` 的公式。请显式验证。

1. **重新计算公式。** openpyxl 不会计算公式——由 LibreOffice 计算。
   ```bash
   python scripts/bake.py output.xlsx
   ```
   读取 JSON 输出。只有 `status: "clean"` 且 `error_count: 0` 才是可接受的结果。

2. **结构校验。**
   ```bash
   python scripts/audit.py output.xlsx
   ```
   确认 ZIP 结构完好、所有 XML 部件都能解析、openpyxl 能对文件完成往返读写。

3. **抽查数值。** 重算后用 `data_only=True` 加载，读取你预期非零的单元格：
   ```python
   from openpyxl import load_workbook
   wb = load_workbook('output.xlsx', data_only=True)
   assert wb['Summary']['B10'].value == expected_total
   ```

4. **视觉检查。** 渲染为 PDF，检查首末两张工作表：
   - 列宽保持默认，导致列被裁切。
   - 数字显示为 `########`（列宽不足以容纳该格式）。
   - 公式显示为文本（缺少前导 `=`，或多了前导单引号）。
   - 每页重复表头、为大表设置打印区域。
   ```bash
   python scripts/pdf_out.py output.xlsx
   ```

任何一项不通过，修复后重新运行。不要掩盖问题。

## 常见公式陷阱

- **`#DIV/0!`**——防御性地包裹除法：`=IF(B2=0,0,A2/B2)` 或 `=IFERROR(A2/B2, 0)`。优先用 `IF`，这样真正的零仍然可见；只对必须始终为数值的场景使用 `IFERROR`。
- **`#REF!`**——单元格引用指向了已删除的行/列。请按当前坐标重建公式；不要只是删掉出问题的单元格。
- **`#VALUE!`**——本应是数字的位置出现了文本，通常来自数据列中混入的标签。写入前先用 pandas 检查该列的 dtype。
- **`#NAME?`**——公式使用了 Excel 无法识别的函数名。常见原因：拼写错误（`=SUMM(...)`）、区域设置相关的分隔符（`;` 与 `,`），或在旧版 Excel 中使用 `FILTER` 之类的动态数组函数。
- **`#N/A`**——通常来自 `VLOOKUP` / `XLOOKUP` / `MATCH` 找不到键。当预期可能未命中时，用 `IFNA(..., default)` 包裹。
- **跨表引用拼写错误。** `Sheet1!A1` 可用；`Sheet 1!A1` 需要加引号：`'Sheet 1'!A1`。openpyxl 两者都接受——Excel 则要求加引号。

## 不在范围内

- **`.xls`（Excel 97-2003 二进制格式）。** 请先转换为 `.xlsx`：
  `soffice --headless --convert-to xlsx old.xls`。
- **VBA / 宏 / `.xlsm`。** 本技能不生成也不执行宏。
- **受密码保护或加密的工作簿。** openpyxl 无法读取加密文件；请先通过 Excel/LibreOffice 解除保护。
- **实时 Excel 自动化。** 若需 COM（Windows）或 AppleScript（macOS）集成，请使用专门的自动化库——本工具集是文件进 / 文件出的。

## 各细节的位置

- **从零创建**：[`create.md`](create.md)——工作簿、工作表、公式、格式、命名样式、图表、图片、冻结窗格、打印设置。
- **编辑 / 模板**：[`edit.md`](edit.md)——修补单元格、追加行、插入列、保留公式与样式、为深度 XML 手术而解包/重打包、定义名称、数据验证。
- **读取 / 提取**：[`read.md`](read.md)——pandas 读取、结构检查、公式提取、转换为 CSV / TSV / PDF。
- **数据分析**：[`analyze.md`](analyze.md)——pandas 管道、重塑、groupby、连接，然后交回 openpyxl 生成最终可写入的产物。
- **脚本**：[`scripts/`](scripts/)——贯穿全流程使用的 CLI 工具。
