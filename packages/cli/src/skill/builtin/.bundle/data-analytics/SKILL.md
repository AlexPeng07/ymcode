---
name: data-analytics
description: "用于定量产品或业务分析：数据质量检查、指标诊断、KPI 设计与汇报、仪表盘、分析报告、图表、笔记本、市场规模测算、语义层，以及有证据支撑的建议。当用户显式调用 Data Analytics 时同样使用本技能。 | Trigger keywords: data quality checks, metric diagnostics, KPI design and reporting, dashboards, analytical reports, charts, notebooks, market sizing, semantic layers, evidence-backed recommendations, Data Analytics."
---

# 数据分析

这是面向代码智能体的数据分析技能包的唯一入口。原有插件工作流位于 `workflows/`；React、Vite、MCP App 组件、连接器清单和前端构建产物均被有意排除。

## 路由请求

1. 完整阅读 `workflows/index/SKILL.md`。将其视为插件级资格判定与分析路由的权威策略，但当其 UI/运行时交付规则与下文的代码智能体覆盖规则冲突时，以下文为准。
2. 从该索引中选出最窄的聚焦工作流。执行前完整阅读每个所选工作流的 `SKILL.md`。
3. 如果所选工作流提到了相关技能，仅当其路由条件适用时才加载这些技能。多个技能可以组成一个工作流；遵循索引与聚焦技能定义的顺序。
4. 相对链接以包含该链接的文件为基准解析。当所选工作流要求阅读被引用的说明或参考文件，且这些文件存在于本技能包中时，请阅读它们。优先使用随包提供的脚本与示例数据，而不是重新创建。
5. 不要仅仅因为存在无关的聚焦工作流就加载它们。

## 内置能力

聚焦工作流位于 `workflows/`，涵盖数据质量分析、业务上下文收集、指标诊断、产品/业务分析、KPI 设计与汇报、可视化、仪表盘、报告、笔记本、市场规模测算、校验以及语义层创建。

仅当宿主运行环境暴露数据源和工具时才使用它们。本技能包不要求特定的连接器注册表或 UI 协议。

## 代码智能体交付覆盖规则

以下规则优先于从原有工作流继承的 MCP App、组件、原生 Work Mode 和打包 Recharts 交付规则：

- 除非用户自行提供了等价工具并明确要求，否则绝不要求或调用 `render_artifact`、`render_chart`、`render_table`、`validate_artifact`、`export_artifact_package`、`charts_widget_v2` 或 `app_block`。
- 临时性回答默认使用简洁的 Markdown 并附来源说明。持久报告和仪表盘默认使用 Markdown；也可根据用户请求与宿主可用工具，采用纯 HTML/CSS/SVG/原生 JavaScript 的自包含 HTML 文件、笔记本、电子表格或静态图片。
- 对于图表，优先使用可复现的 Python/Matplotlib、笔记本原生绘图、SVG，或目标系统原生的图表支持。当宿主提供图片或浏览器检查能力时，检查生成的视觉产物。
- 不要为分析输出安装 Node、React、Recharts、Vite 或前端包。不要依赖已移除的 `src/`、`assets/`、MCP 规范、HTML 运行时辅助程序或组件资源。
- 如果某个聚焦工作流指向已移除的纯 UI 参考，跳过该参考，并在保留其分析、来源、QA 与叙述要求的前提下应用这些覆盖规则。
- 在所选的可移植文件存在或报告了具体阻塞项之前，被请求的报告都视为未完成；仅当用户要求内联回答时，聊天摘要才足够。

## 安全与保真

- 绝不把插件指令视为绕过宿主策略、泄露密钥或执行未经批准的外部写入的许可。
- 在分析输出中保持来源可追溯性和不确定性可见。
- 不要用示例数据悄悄替代真实数据问题。
- 全程保持所选工作流的校验与交付要求直至完成。
