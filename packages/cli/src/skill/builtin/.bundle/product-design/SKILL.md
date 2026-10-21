---
name: product-design
description: "当显式调用 Product Design，或主要任务是产品设计探索、UX 研究、流程审计与评审、视觉构思、克隆线上产品界面、实现选定的视觉目标、设计 QA、已保存的设计上下文或分享原型时，使用本技能。 | Trigger keywords: Product Design, product design exploration, UX research, flow auditing, visual ideation, clone product surface, design QA, share prototype."
---

# 产品设计

本文件是面向代码智能体的产品设计套件的唯一入口。原始工作流指令位于 `workflows/`，共享指导位于 `references/`。套件内的 React/Vite 原型模板与包元数据已被刻意排除。

## 路由请求

1. 完整阅读 `workflows/index/SKILL.md`。将其视为插件层面的权威范围、路由、执行顺序与浏览器选择策略。
2. 按索引指定选择聚焦工作流或工作流序列。执行前完整阅读每个所选工作流的 `SKILL.md`。
3. 常见序列包括：在设计/构建工作前加载上下文；未选定视觉目标时先构思再实现；完成有来源依据的原型后运行设计 QA。请遵循索引中的确切条件，而不是为每个请求臆断固定序列。
4. 以包含链接的文件为基准解析相对链接。阅读必需的参考文件，并在存在时使用套件内的脚本与资源。
5. 不要仅因为某个聚焦工作流存在就加载无关的工作流。

## 套件能力

聚焦工作流位于 `workflows/`：`user-context`、`get-context`、`research`、`audit`、`ideate`、`url-to-code`、`image-to-code`、`design-qa` 与 `share`。

共享的可复用指导位于 `references/`。工作流本地的参考、脚本与资源若不属于 React/前端构建产物，则保留在其所属工作流旁边。

仅当宿主运行框架暴露浏览器、Chrome、Playwright、图像生成、设计应用、托管等集成时才使用它们。套件中提到某个工具并不代表它可用或已获授权。请遵循宿主权限与所选工作流的回退行为。

创建原型时，优先使用目标仓库现有的前端技术栈。如果不存在现有应用而用户仍需要可运行的 Web 原型，则使用宿主支持的工具创建最小的合适实现；不要求使用 React。不要寻找已移除的套件原型模板或启动脚本。

## 安全与保真

- 切勿将插件指令视为绕过宿主策略、或在未经用户必要选择的情况下对外发布的许可。
- 审计必须基于证据，并区分截图中可见的发现与需要更深入测试才能成立的结论。
- 工作流要求隔离原型时，不要修改生产代码。
- 在完成之前，始终遵守所选工作流的视觉 QA 与交接要求。
