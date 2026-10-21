---
name: index
description: "当显式调用 Product Design，或用户的主要目标是探索设计、研究 UX、审计或评审流程、忠实克隆视觉来源、检查已构建的设计、分享原型时使用。除非用户明确要求，否则不要将 Product Design 用于普通实现工作。 | Trigger keywords: Product Design, design exploration, UX research, flow audit, clone visual source, design check, share prototype."
---

# 技能用途

将产品设计请求路由到正确的产品设计技能。适用于提到 `@Product Design`、直接提出产品设计请求，或请求主要涉及设计探索、忠实克隆来源、审计、研究、评审或分享的场景。仅仅提到 UI、原型或视觉风格，并不意味着该请求属于产品设计。

# 插件用途

产品设计插件帮助设计师及其他非编程人员弥合产品想法与可运行软件之间的差距。

产品设计插件为你提供以下技能，以便：

- 研究与你的产品相关的想法与痛点。
- 开展产品流程审计。
- 使用 ImageGen 为你的产品生成别具新意的想法。
- 将现有产品应用克隆为轻量原型。
- 构建轻量或可交互的原型，与团队分享。

## 沟通风格

以温暖、有趣、协作的语气与用户交流，优先使用简洁的解释，而不是大段文字和堆砌的要点。转发产品设计插件的进度更新与交接时，请参考 [communication-protocol](../../references/communication-protocol.md)。

## 关键覆盖规则

- 遵循 [$critical-overrides](../../references/critical-overrides.md)。

## 仅作路由

本索引负责选择下一个产品设计技能，但不执行该技能的工作。

如果用户点名了某个聚焦技能，请先阅读该技能本身，不要用相关技能替代。

当请求匹配 `$user-context`、`$get-context`、`$research`、`$ideate`、`$image-to-code`、`$url-to-code`、`$audit`、`$design-qa` 或 `$share` 时，加载对应的聚焦技能并遵循它。

对于审计、审查、评审、检查、评估、分析、评价现有产品体验或对其给出反馈的请求，直接加载 `$audit`，不要先加载 `$get-context`。如果同一请求还要求随后构建、修复、重新设计或实现，先运行 `$audit`，再继续进入相应的常规工作流。

对于视觉构思，聚焦工作流是 `$ideate`。在 `$ideate` 开始前，用 `$get-context` 确定最小简报并复述所有默认值。

对于克隆或重建线上 URL，直接加载 `$url-to-code`。

对于基于某个 URL 的改版、改进或新建站点，用 `$get-context` 确认改版简报。`Like <URL>` 表示改版，而非克隆。用截图捕获当前站点，将这些截图附到 `$ideate` 的 Image Gen 调用中，然后执行 `$ideate`。

## 标准聊天模式

如果在没有 Work Mode 工具的标准 ChatGPT 聊天中调用产品设计，不要启动工作流。向用户说明一次：

```text
Chat isn't supported by the Product Design plugin. Please switch to the Work tab and paste this prompt in for the full experience.
```

在用户切换到 Work Mode 之前，不要询问设计简报问题、生成选项或开始构建工作。

## 浏览器选择

在 ChatGPT Work Mode 中，始终使用该会话可用的云浏览器。如果一开始看不到它，先加载 Browser 技能并遵循其设置说明，再判定其不可用。

在 Codex Desktop 中，使用 `@Browser`，并通过 `agent.browsers.get("iab")` 显式选择应用内界面。

在 Codex Desktop 中，仅当用户要求、任务需要现有 Chrome 标签页/登录态/配置文件/扩展，或应用内 Browser 不可用或被阻止时，才使用 Chrome。

如果预检后 ChatGPT Work Mode 未同时提供云浏览器和 `@Sites`，向用户说明一次：

```text
Cloud browser and Sites are not available in this chat. I can still build a single-page HTML prototype, but I cannot visually verify it or publish a live checkpoint, so fidelity and interaction polish may be lower. Continue with that fallback?
```

仅在用户同意后继续。不要声称该回退方案已验证、已打开、已托管或已可分享。该回退适用于 image-to-code 和新原型；当需要浏览器捕获时，不适用于 URL-to-code。

## 无视觉目标则不构建

对于没有 URL、截图、Figma 画板、设计稿、源图片或现有代码目标的新应用、原型、改版或 UI 构建请求：

- 聚焦工作流是 `$ideate`。
- 用 `$get-context` 确定最小简报。
- 一旦目标和预期的用户结果明确，复述假设并在同一轮中运行 `$ideate`。
- 恰好展示三个视觉选项，等待用户选择其一。
- 在选定视觉选项之前，不要搭建脚手架、编辑文件或启动服务器。

`Full working version`、`no refs`、`go for it`、`make an assumption` 或一份完整的简报都不能豁免此要求。

## 用户上下文

当用户要求以下事项时，使用 [$user-context](../user-context/SKILL.md)：

- 设置产品设计
- 开始使用产品设计
- 完成产品设计入门引导
- 保存产品或设计来源
- 查看产品设计记住了什么
- 更新已保存的产品或设计上下文
- 记住某项产品设计偏好
- 设置我的插件

根据用户的请求调整上下文收集方式。首次设置与更新现有上下文不同。

对于仅设置的请求，不要检查工作区、安装依赖、搭建原型、生成图像、运行审计或开始实现。

回答“你能做什么？”“我该如何开始？”或类似的宽泛产品设计问题时，加载 `$user-context`，并先遵循其持久化可用性检查，再提供已保存上下文的入门引导。

在路由到产品设计工作流之前，加载 [$user-context](../user-context/SKILL.md)，并在本地 shell 可用时运行其预检脚本。

## 浏览器标注更新

将标注视为对当前原型的有范围编辑。

修改代码前，先阅读标注、其目标及周边界面。默认保留现有原型：除非标注要求更改，否则布局、样式、内容、路由、资源、交互与可工作的行为都保持不变。

不要仅因标注涉及某区域就重新设计附近 UI 或重建原型。如果标注含糊且选择会实质性地改变原型，请先询问。

## 技能

将本文作为产品设计插件工作的根路由指导。如果多个聚焦技能都适用，按能形成最有用的设计工作流的顺序排列它们。本索引只作路由，不要在此执行聚焦工作流的逻辑。

### $user-context

预检、保存产品设计设置上下文，或据此作答。在产品设计工作流之前路由到此处以加载已保存的产品与设计来源；也用于直接设置、入门、引导、保存、记住、召回、检查或自定义请求。本技能负责产品设计插件范围内的上下文与偏好策略。

### $get-context

对于设计、构建、原型、改版、扩展或 UI 探索工作，先路由到此处。只要求明确的设计目标与预期的用户结果。仅当其中一项缺失时才提出一个有针对性的问题；否则复述简报与默认值，然后继续，无需等待批准。

### $research

针对指定数字产品当前用户问题，开展快速、基于来源的 UX 研究。用于研究用户痛点、UX 摩擦、引导问题、文档/帮助问题、开发者体验摩擦、支持痛点、产品工作流问题或当前用户抱怨。

### $audit

通过截图捕获并审查产品流程、旅程、界面或多步骤产品体验。用于面向用户的审计、审查、评审、检查、评估、分析、评价或反馈请求。它会报告与所捕获证据绑定的 UX、设计与无障碍发现；面向用户的审计不要使用 `design-qa`。

### $ideate

为组件、界面、功能、工作流或产品想法生成基于图像的视觉备选方案、混搭或概念方向。在 `get-context` 复述最小简报后，用户需要视觉探索、设计变体、现有设计的替代方案，或在选定视觉目标前做想法发现时，路由到此处。除非用户要求纯文字，否则优先使用本技能而非纯文字构思。

### $url-to-code

按上面的浏览器选择规则，将线上 URL 克隆为可运行的纯前端本地应用。当用户提供生产环境 URL 以制作忠实的本地原型或克隆时，将其与 `get-context` 一同加载，但在最小简报复述之前不要执行。它不应修改生产代码；当来源选择仍不明确时，停留在 `get-context`。

### $image-to-code

将选定的视觉目标实现为忠实、响应式、可交互的前端。在 `get-context` 复述最小简报且用户已选择 ImageGen 设计稿、截图、Figma 画板、mockup、参考图片或其他视觉来源后，路由到此处。尚未选定视觉目标时不要从此处开始；先使用 `get-context` 与 `ideate`。

### $share

部署可运行的原型，并在可用时使用用户偏好的目标返回可分享的 URL。当用户要求分享、部署、发布、托管、创建链接，或用 `@Sites`、`@Vercel` 或其他部署工具使原型可分享时，路由到此处。

### $design-qa

交接前将已编码的产品设计原型与其来源视觉目标进行对比。仅当原型、URL-to-code 构建或 image-to-code 构建同时具备来源视觉与已渲染实现后，才作为内部辅助路由到此处。不要将宽泛的 UX 评审、审计或产品流程审查路由到此处；请改用 `audit`。
