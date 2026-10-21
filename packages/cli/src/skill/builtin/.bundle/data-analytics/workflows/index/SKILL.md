---
name: index
description: "将宽泛的数据分析请求路由到合适的定量分析、可视化、仪表盘、报告、笔记本、KPI、市场规模测算、校验或语义层工作流。 | Trigger keywords: data analytics, quantitative analysis, visualization, dashboard, report, notebook, KPI, market sizing, validation, semantic layer."
---

# 数据分析路由

当显式调用 Data Analytics，或请求需要结构化记录、定量证据、指标，或有证据支撑的产品/业务决策时，使用本工作流。不要用于普通行文起草、文件格式转换，或不需要数据解读的定性描述。

## 选择聚焦工作流

- 指标发生变化、未达标或与预期不符：阅读 `../metric-diagnostics/SKILL.md`。
- 产品/业务决策、优先级排序、分群、发布或实验建议：阅读 `../product-business-analysis/SKILL.md`。
- 数据集、仪表盘、来源、join、新鲜度、粒度或指标可信度问题：阅读 `../analyze-data-quality/SKILL.md`。
- KPI 框架、权威定义、目标、驱动因子或护栏设计：阅读 `../design-kpis/SKILL.md`。
- KPI 状态更新、WBR、MBR、QBR 或运营读数：阅读 `../kpi-reporting/SKILL.md`。
- 仪表盘或监控视图：阅读 `../build-dashboard/SKILL.md`。
- 持久的分析报告：阅读 `../build-report/SKILL.md`。
- 图表或定量图形：阅读 `../visualize-data/SKILL.md`。
- 可复现的 SQL/Python 笔记本：阅读 `../jupyter-notebooks/SKILL.md`。
- TAM、SAM、SOM、细分市场或机会规模测算：阅读 `../market-sizing/SKILL.md`。
- 分享前审阅分析：阅读 `../validate-data/SKILL.md`。
- 创建、修复或保存可复用的数据上下文或语义层：阅读 `../create-data-context/SKILL.md`。
- 缺少业务定义、归属人、变更背景或决策框架：在主工作流之前阅读 `../gather-business-context/SKILL.md`。

完整加载每个所选工作流。适用时遵循其相关技能规则。一个任务可以组合多个工作流；请使用以下通常顺序：

1. 收集缺失的业务上下文。
2. 校验数据源质量与指标定义。
3. 执行聚焦分析。
4. 校验结论。
5. 可视化或创建所要求的持久产物。

## 数据源访问

使用代码智能体运行环境已经可用的最佳数据源：本地文件、上传的数据、粘贴的结果、数据库、数据仓库、BI 系统、产品分析工具、笔记本、文档或可调用的连接器。工具可用性由宿主决定，而不是由本技能决定。

当没有可用数据源时：

- 索取最小可用的产物：CSV/XLSX 文件、查询结果、schema、指标定义、仪表盘导出、截图或粘贴的表格。
- 仅可将 `assets/demo-product-growth.csv` 作为明确标注的合成演示提供。绝不要用示例数据回答真实数据问题。
- 不要编造记录、度量值、数据源访问权限或查询结果。

如果可用数据源之间的冲突会改变答案，请指出该冲突并使用数据质量工作流。否则选择最权威、最新的数据源并继续。

## 可移植输出策略

本技能包面向通用代码智能体，不依赖 React、MCP Apps、组件或专有渲染界面。

- 内联回答：简洁的 Markdown，包含发现、证据、注意事项和后续行动。
- 报告：默认使用 Markdown；仅当宿主能够创建并验证时，才使用自包含的纯 HTML、PDF、DOCX 或其他所要求的格式。
- 图表：使用可复现的 Python/Matplotlib、笔记本原生绘图、SVG 或目标系统原生的图表工具。
- 仪表盘：优先使用自包含的纯 HTML/JavaScript 产物；适合执行 Python 时可用 Streamlit；或使用用户选定的现有 BI 平台。
- 笔记本：保持 SQL/Python 可复现，并让假设可见。

保留数据源名称、指标定义、粒度、时间窗口、过滤器、单位与不确定性。绝不暴露凭证、密钥、隐藏推理或不必要的个人数据。
