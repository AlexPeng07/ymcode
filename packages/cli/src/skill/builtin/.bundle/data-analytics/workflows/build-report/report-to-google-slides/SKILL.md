---
name: report-to-google-slides
description: "窄范围的转换技能。仅当用户明确要求把现有的 HTML 分析报告转换为原生 Google Slides 演示文稿时调用。 | Trigger keywords: HTML report to Google Slides, deck, PPTX import, native Google Slides."
---

# 报告转 Google Slides

仅当用户明确拥有现成的 HTML 分析报告并希望得到 Google Slides 交付物时，使用本技能。输出应当是一套演示文稿，而不是粘贴的报告。随手翻阅幻灯片的利益相关方应能在不打开源报告的情况下理解结论、证据、注意事项和建议的后续行动。

本技能消费本地可移植报告，最好是自包含 HTML。如果只有其他格式可用作源，先用同一份证据创建等价的本地 HTML 或结构化报告。

## 工作流

1. 定位本地 HTML 报告。

   使用绝对文件路径。如果用户提供的是远程报告，先在本技能之外下载它。如果本地文件是登录页、重定向页或极小的存根，停止并在继续之前获取真实报告。

2. 运行辅助脚本。

   ```bash
   python3 <REPORT_TO_GOOGLE_SLIDES_SKILL_DIR>/scripts/report_to_google_slides.py \
     <LOCAL_HTML_REPORT_PATH> \
     --out-dir /tmp/report_to_google_slides
   ```

3. 检查本地输出。

   必需的输出：

   - `deck.pptx`：可编辑的本地 PowerPoint 文件
   - `manifest.json`：解析出的源清单与覆盖计数
   - `deck_plan.json`：逐页计划，含命名的元素
   - `preflight_checks.json`：本地质量检查与通过/失败状态
   - `assets/`：渲染出的图表图片

   在 `preflight_checks.json` 的 `status: "passed"` 之前，不要导入 PPTX。随后运行 `unzip -t <out-dir>/deck.pptx`。

4. 在 Google Slides 中导入并验证。

   使用 `mcp__codex_apps__google_drive._import_presentation` 并传入 `upload_mode="native_google_slides"` 来导入 `deck.pptx`。尽可能对每一页使用 `_get_presentation_outline` 和 `_get_slide_thumbnail` 验证导入结果。至少检查封面、一个图表页、一个表格页，以及注意事项/来源页。

5. 交付前修复。

   如果缩略图显示文字被截断、图表缺失、对比度低、图片空白或尺寸别扭，修改辅助脚本的输出或源假设，并在交付演示文稿 URL 之前重新生成。

6. 交付演示文稿。

   返回 Google Slides URL，并在有用时返回本地 PPTX 路径或源 HTML 路径。将常规检查、preflight、缩略图检查与导入检查的细节保留在支撑产物中。不要在面向用户的交付说明中列出内部检查，除非某项检查失败、不可用或产生了与用户相关的注意事项。

## 标准

- 保留报告中对决策至关重要的信息：头条主张、执行摘要、主要发现、指标定义、重要图表、决策关键的表格、建议、影响、注意事项、假设、新鲜度说明以及来源/出处说明。
- 将报告行文翻译为幻灯片原生的表达。以要点开头，每页只讲一个主要观点，把支撑细节放入简洁的标注块、项目符号、表格、图表注释或演讲者备注。
- 先精简文案，再缩小字号。
- 当源报告区分毛额指标读数、净额/增量读数、因果主张和注意事项时，在幻灯片中也要让这些视角保持可见的区分。
- 尽可能使用可编辑文本和原生 PPTX 表格。使用原生 PPTX 项目符号；不要用键入的短横线伪造项目符号。
- 将源图表保留为证据图片。不要截取整个 HTML 报告，也不要粘贴整段报告章节。
- 支持图表证据以行内 SVG、无障碍表格或内嵌图片形式提供的自包含 HTML 报告；在构建演示文稿之前，先将它们渲染为本地图表证据图片。
- 除非报告中有更强的分组对比，否则每张证据幻灯片只放一张图表。
- 保持表格幻灯片清晰可读。如果完整表格过于密集，把主要对比留在演示文稿中，将额外细节移到演讲者备注或来源幻灯片。
- 来源说明应可见但不喧宾夺主。

## 视觉体系

辅助脚本从 HTML 报告的 CSS 和图表调色板中推导颜色与层级，然后应用克制的分析型演示布局。它不遵循外部演示文稿文件或公司专属品牌。
