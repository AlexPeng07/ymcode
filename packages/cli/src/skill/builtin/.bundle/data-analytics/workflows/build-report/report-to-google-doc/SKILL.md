---
name: report-to-google-doc
description: "窄范围的转换技能。仅当用户明确要求把现有的本地或 blob 托管的 HTML 分析报告转换为 Google Doc、DOCX 或可分享文档时调用。 | Trigger keywords: HTML report to Google Doc, DOCX, shareable document, Google Drive upload."
---

# 报告转 Google Doc

仅当用户明确需要从现有 HTML 分析报告得到可分享的 Google Drive 文档时，使用本技能。源文件必须是 HTML 报告：本地文件、已下载的 blob 托管报告，或由 `$build-report` 的 HTML 模式或等价的本地可移植报告来源产出的报告。

预期路径是 HTML -> DOCX -> 上传到 Drive。Drive 以 DOCX 作为底层格式的查看器文件（而非原生 Google Docs MIME 类型）承载上传内容是可以接受的。不要使用旧的 Google Docs 批量更新请求路径。

## 工作流

1. 定位 HTML 报告。

   使用绝对本地路径。如果用户提供的是远程报告，先下载它，再把本地 HTML 文件传给辅助脚本。如果文件是登录页、重定向页或极小的存根，停止并获取真实报告。

2. 运行随包提供的辅助脚本。

   ```bash
   python3 <REPORT_TO_GOOGLE_DOC_SKILL_DIR>/scripts/report_to_google_doc_plan.py \
     /absolute/path/to/report.html \
     --out-dir /tmp/report_to_google_doc_plan
   ```

   正常路径下省略 `--render-workers`。只有在本地对同一类报告做过基准测试后，才传入 worker 数量。如果缺少依赖，使用安装了 `beautifulsoup4`、`pillow` 和 `python-docx` 的本地虚拟环境；`cairosvg` 或无头 Playwright 是可选渲染器。

3. 检查辅助脚本的输出。

   必需的输出：

   - `skeleton.txt`：带稳定占位符的源文本
   - `manifest.json`：解析出的标题、表格、标注块、列表、样式、链接以及渲染视觉清单
   - `preflight_checks.json`：源、宽度、DOCX 与渲染图片检查
   - `report.docx`：生成的本地 Word 文档
   - `docx_upload_plan.json`：精简的上传说明
   - `placeholder_queries.json`：源映射调试标签

   在 `preflight_checks.json` 的 `status: "passed"` 且错误数为零之前，不要上传。警告必须修复，或在交付说明中明确指出。

4. 上传 DOCX。

   ```json
   mcp__codex_apps__google_drive._upload_file({
     "file_uri": "/tmp/report_to_google_doc_plan/report.docx",
     "file_name": "Report Name.docx",
     "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
   })
   ```

   将返回的 Drive URL 视为交付物。不要试图强制转换为原生 Google Docs，也不要回退到 `_batch_update_document`。

5. 校验上传结果。

   确认上传文件可读且非空。将上传文本与源清单对照：标题、章节标题、执行摘要或结论标注、注意事项、建议、来源说明和来源链接。在可用时检查本地 `report.docx` 的结构：标题数量、列表、表格、超链接关系和图片关系应与 `manifest.json` 一致。

6. 交付链接。

   返回 Drive/Docs URL，并在有用时返回本地 DOCX 路径或源 HTML 路径。仅连接器调用成功还不够；只有在上传文件和本地 DOCX 结构都已对照源报告检查之后，交付才算完成。将常规检查和 preflight 细节保留在支撑产物中。不要在面向用户的交付说明中列出内部检查，除非某项检查失败、不可用或产生了与用户相关的注意事项。

## 标准

- 保留 HTML 报告中的每个章节、头条主张、指标卡、指标定义、来源说明、图表要点、建议、注意事项和链接。
- 保留语义化格式：标题、段落、内联加粗/强调、内联代码、正/负向颜色、链接、列表、标注块、指标卡网格、表格、注释、图注和图表。
- 尽可能使用 DOCX 原生结构：标题、段落、表格、项目符号/编号列表、链接、内联图片、段落底纹、表格单元格底纹和文本样式。
- 保持报告文本列可读。表格、图表、渲染的表格网格、截图和视觉块不得超过 DOCX 页面的文本宽度。
- 将图表保留为内联图片，由源视觉或其同数据 SVG 回退渲染，并与文本和表格保持相同的左边缘对齐。缺少条形、缺少图例色块或全黑/全白标记的图表即使 DOCX 中包含图片对象，也无法通过校验。
- 保留多列报告块。仅由带标题的小表格组成的双列网格，可以保留为限制在文本宽度内的双列渲染图片；包含叙述文字、胶囊标签、标注块或非表格面板的混合双列块，应原生保留这些内容，而不是丢弃。
- 不要暴露被有意从脱敏报告中省略的客户级细节或敏感链接。
- 不要写入 Google Docs 批量更新产物，例如 `seed_requests.json`、`remote_write_plan.json` 或 `all_requests*.json`。

## 修复

当校验暴露出转换问题时，使用以下修复方法：

| 问题 | 修复 |
| --- | --- |
| 标题为常规字重 | 修正 DOCX 写入器的标题样式，或对文本显式加粗。 |
| 标题或小标题后出现空行 | 删除占位空段落；骨架在标题之后应输出 `\n` 而非 `\n\n`。 |
| 正文段落间距过大 | 删除字面上的空段落，并设置适度的样式间距。 |
| 表格/图片过宽 | 将表格列宽或图片宽度设为 DOCX 文本列宽。 |
| 图表有标签但缺少条形 | 内联 SVG 的 class 样式，或在插入前使用无头截图。 |
| 双列表格组被压平 | 将该网格视为一个布局块，并保留小表格的标题。 |
| 执行摘要、指标卡或章节缺失 | 上传前修正解析器的清单。 |
| 图表与表格重叠 | 将图片插入到表格之后的独立段落中。 |
| 图表重复 | 删除多余的图片；只保留一份与源顺序一致的副本。 |
| 内联加粗/代码/颜色丢失 | 修正 DOCX 写入器中 manifest 的范围切分。 |
| 来源链接显示原始 URL | 使用原生带链接的标签，或使用 HTML 链接文本的原生项目符号替换。 |

## 本地检查

```bash
python3 -m py_compile <REPORT_TO_GOOGLE_DOC_SKILL_DIR>/scripts/report_to_google_doc_plan.py
python3 <REPORT_TO_GOOGLE_DOC_SKILL_DIR>/scripts/report_to_google_doc_plan.py \
  /absolute/path/to/report.html \
  --out-dir /tmp/report_to_google_doc_plan_smoke
jq '.status, .summary' /tmp/report_to_google_doc_plan_smoke/preflight_checks.json
test -f /tmp/report_to_google_doc_plan_smoke/report.docx
test -f /tmp/report_to_google_doc_plan_smoke/docx_upload_plan.json
git diff --check -- plugins/data-analytics/skills/build-report/report-to-google-doc
```
