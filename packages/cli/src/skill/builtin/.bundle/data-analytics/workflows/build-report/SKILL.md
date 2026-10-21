---
name: build-report
description: "构建持久的分析报告：结论优先的叙述、有证据支撑的发现、图表或表格、注意事项、建议以及数据源背景。 | Trigger keywords: analytical report, durable report, answer-first narrative, executive summary, key findings, caveats, sources."
---

# 构建分析报告

当用户需要持久报告而不是临时回答时，使用本工作流。先运行相应的分析工作流；本工作流负责面向读者的结构、证据摆放、视觉/表格摆放、注意事项、来源、QA 与交付。

## 选择一种交付格式

尊重用户明确指定的格式。否则使用：

1. Markdown，作为最可移植的代码智能体交付物。
2. 当精炼、浏览器可读的报告有用且宿主能渲染或检查时，使用自包含的纯 HTML。
3. 仅当被要求，或目标场景明确需要，且宿主提供合适的创建与校验工具时，才使用 PDF、DOCX、幻灯片或其他格式。

不要安装或依赖 React、Recharts、Vite、MCP Apps 或组件运行时。HTML 必须使用语义化 HTML/CSS，可使用内联 SVG 或少量原生 JavaScript 交互。在没有 JavaScript 时也必须保持可读。

## 构建报告

1. 从可用上下文确认受众、决策、范围、对比窗口和所要求的格式。只有当缺失选择会实质性改变结果时才提问。
2. 校验分析证据。明确保留指标定义、粒度、时间范围、过滤器、单位、排除项和数据源新鲜度。
3. 结论先行。在方法论细节之前陈述最重要的结论及其决策含义。
4. 构建连贯的叙述，而不是堆砌图表或查询结果。
5. 只包含支持某项发现的视觉元素和表格。创建图表时阅读 `../visualize-data/SKILL.md`。
6. 区分已核实的事实、可能的解释、假设、局限和未决问题。
7. 提供与证据挂钩的建议，包含预期影响、负责人或下一步行动，以及适当的可度量跟进。
8. 添加来源章节，在已知时指明真实的数据源系统、表/视图、数据集、文件、文档、查询和访问日期。绝不编造来源。

## 推荐结构

```markdown
# [Short reader-facing title]

## Executive summary
[Answer, magnitude, and decision implication]

## Key findings
[Evidence-backed findings with charts or tables]

## Recommendations
[Prioritized actions and expected outcomes]

## Risks and limitations
[Data gaps, assumptions, uncertainty, and interpretation limits]

## Sources and methodology
[Definitions, scope, source details, and reproducibility notes]
```

根据受众调整标题，但保留结论优先的逻辑。

## QA 与交付

- 根据已核对的证据重新计算头条数值和对比。
- 检查每项主张都有支撑，每张图表都与其源数据一致。
- 检查标题、标签、单位、分母、日期范围和排序。
- 对于 HTML/PDF/DOCX/幻灯片，在宿主支持时渲染或检查实际产物；修复截断、空白图表、溢出、低对比度和不可读的表格。
- 确保报告不包含凭证、本地临时路径、占位来源或内部实现噪音。
- 返回主要产物路径，以及仅相关的支撑笔记本、SQL、数据或图表文件。

如果用户只要求内联简报，或明确表示不要文件/产物，则在聊天中以同样结论优先的结构简洁交付。
