---
name: ideate
description: "根据产品设计简报生成基于图像的备选方案、混搭或新设计方向。当用户要求设计变体、视觉探索、混搭或基于所提供上下文的图像生成方案时使用。 | Trigger keywords: ideate, design variants, visual exploration, remix, image generation."
---

# 构思

你的任务是为用户的想法生成设计概念。

遵循 [$index](../index/SKILL.md) 中共享的产品设计路由指导。

## 关键覆盖规则

- 继续之前，先参考插件路由 [$index](../index/SKILL.md)。
- 遵循 [$critical-overrides](../../references/critical-overrides.md)。

## 用户上下文

开始之前，加载 [$user-context](../user-context/SKILL.md)，并在本地 shell 可用时运行其预检脚本。

将提供的产品 URL、Figma 文件、截图、参考图片、代码库路径、Storybook、tokens、设计系统、品牌资源、组件引用、浏览器偏好与分享目标附加到 Image Gen 生成中，使其与设计简报对齐。

不要检查每个已保存的参考。只检查当前任务所需的内容。

## 工作流

在 `$get-context` 满足最低限度的设计简报要求之前，不要生成图像。

生成图像之前：

1. 理解简报。

- 确定目标：组件、界面、功能/工作流或宽泛的产品想法。
- 确定目标用户、产品界面与目标。
- 保留用户的硬性约束。
- 如果最低限度的设计简报未满足，运行 `get-context`。

2. 确定上下文。

- 使用提供的文件、截图、链接与可见参考。
- 在本地工作区中，查找附近的设计文档与其他本地视觉上下文。
- 检查可能的设计上下文文件夹，例如 `user-context`、`storybook/`、`.storybook/`、`design-system/`、`design-systems/`、`tokens/`、`components/`、`app/` 以及已生成原型的根目录。
- 在现有项目中，生成前先查找现有产品截图、相似流程、Storybook 捕获、设计 tokens 与组件引用。如果现有应用无法访问，询问用户能否提供与他们正在构建的界面相似的示例界面。确保将设计语言与 tokens 加入 Image Gen 提示词。

3. 直接检查参考。

- 生成前查看截图、图片、Figma 画板、应用界面或其他视觉参考。
- 不要仅凭文件名推断。
- 如果指定的本地路径或参考不可见，停止并请用户确认路径、上传文件、启动本地应用或指向正确的工作区。

4. 确定变化模式。

- 如果存在有用的本地设计上下文且用户未要求新风格，保持在现有方向内。
- 如果不存在有用的设计上下文，或用户要求宽泛探索，则同时变化概念与视觉系统。
- 对于特定组件或现有界面，先变化结构、交互、层级与强调，再变化品牌风格。
- 对于宽泛的产品想法，探索三个有实质差异的产品方向。

5. 在 Image Gen 之前选择目标尺寸。

- 选择最符合用户请求与任何所提供视觉参考的尺寸。
- 移动应用：`390 x 844`。
- 平板应用：`834 x 1194`。
- 桌面应用、仪表盘、后台或 SaaS：`1440 x 1024`。
- 落地页或营销页：宽度 `1440`，可滚动。
- 模态框、面板、小组件或组件：容器的自然尺寸。
- 提供的截图、Figma 画板、mockup 或参考图片：当用户希望从该视觉继续时，匹配其尺寸与宽高比。
- 避免拥挤。让设计干净地适配所选尺寸，使用真实的间距、可读的字号，且不裁剪内容。
- 在每个 Image Gen 提示词中包含所选尺寸。

6. 检查访问缺口。

- 如果连接器、参考或文件因认证、权限、登录过期、缺少 scope、结果可疑地为空或本地状态不可用而无法访问，停止。
- 清晰说明缺口，并询问是排查访问问题还是在不使用该来源的情况下继续。
- 不要在默默忽略指定参考的情况下生成图像。

7. 将用户提供的图片与 mock 连同你的设计简报一起附加到 Image Gen 调用中。

8. 生成 3 个独立选项，它们在信息层级、布局策略、交互模型或产品定位上各有不同。

必须遵循的规则：

- 使用下面的 Image Gen 提示词。
- 使用内置的 Image Gen 工具。
- 除非用户另行指定数量，恰好生成三张独立图片。
- 独立发起每次 Image Gen 调用。不要用 `Promise.all` 批量发起 Image Gen 调用，不要将它们收集为有序数组，也不要按请求顺序回放。
- 每个选项必须是独立的 Image Gen 结果。不要将多个想法放进一张图片。
- 生成前为每个方向取一个独特、描述性的名称，但不要称其为 `option 1`、`option 2` 或 `option 3`，也不要在 Image Gen 提示词中放入计划的数字标签。并行结果到达的顺序可能与请求顺序不同。
- 仅在 Image Gen 结果出现在会话中之后才给选项编号。唯一权威的选项顺序是这些生成图片结果在当前会话中的显示顺序。忽略计划的概念顺序、原始请求链、提示词提交顺序、`Promise.all` 结果顺序、批次顺序、数组索引、重试顺序与假定完成顺序。
- 所有结果返回后，按显示顺序将每个可见选项编号绑定到对应结果。不要在最终选择消息中命名或描述这些选项。
- 在可用时，将提供的截图、文件、应用捕获、Figma 参考与视觉源材料作为情绪板灵感附加。
- 在可用时，将现有产品截图、相似流程、Storybook 捕获、设计 tokens 与组件引用作为依据材料附加。
- 当 mock 数据包含日期或时效性信息时，确定确切的当前日期，并将其包含在每个 Image Gen 提示词中。可见日期以该锚点为基准推导；保留用户或来源设计要求的日期。
- 如果有截图、图片或视觉文件可用，将实际图片附加到 Image Gen 调用。不要依赖对其的文字描述。
- 仅当 Image Gen 调用实际收到该图片或可读的本地图片路径时，才声称已附加视觉参考。
- 如果无法附加图片，明确说明，并询问是否以纯文字方向继续。
- 在每张图片中保留简报的硬性约束。
- 生成选项后，在任何构建工作开始前停下来等待用户选择。
- 当用户之后选择选项 `N` 时，以最近一次构思集中第 N 个显示的生成图片结果为准，而不是原始计划的概念顺序。如果无法确定确切的显示结果，不要凭猜测构建；请用户指明概念或重新附加/选择图片。
- 选定的选项是 `$image-to-code` 的视觉目标。

## 反馈循环

如果用户在看过选项后给出反馈，依据该反馈生成修订后的选项。

如果用户选定某个选项并给出反馈，在构建前依据该反馈生成修订后的选项。

如果用户喜欢多个选项的部分内容，将这些选择组合成新的 Image Gen 设计，并在构建前展示。

## Image Gen 提示词

根据当前设计简报调整此提示词，附加任何可用的图片参考，然后发送给 Image Gen：

```text
Create realistic, production-quality UI designs with clear hierarchy, strong typography, intentional imagery, and purposeful spacing.

Design a focused primary screen, not a feature inventory. The product may support many workflows, but this frame should show the hero use case, one clear primary action, and only one or two supporting actions or content areas. Do not add cards, panels, tabs, badges, metrics, filters, or navigation items merely to advertise every feature. Let the rest of the product exist off-screen. Prefer strong hierarchy and generous whitespace; if the screen feels crammed, remove UI.

### Target Dimensions

Pick the dimensions that best match the user's request and any provided visual reference.

Default to a desktop web-app frame unless the user or reference clearly calls for mobile, tablet, or another format.

 - Mobile app: `390 x 844`
 - Tablet app: `834 x 1194`
 - Desktop app, dashboard, admin, or SaaS: `1440 x 1024`
 - Landing or marketing page: `1440` wide and scrollable
 - Modal, panel, widget, or component: natural container size
 - Provided screenshot, Figma frame, mockup, or reference image: match its dimensions and aspect ratio when the user wants to continue from that visual

Use a natural viewport ratio for the intended surface. Never stretch, squash, or warp the generated screen, imagery, typography, or UI elements to fill the canvas. If the composition does not fit naturally, recompose or simplify the layout instead.

Avoid crowding. Make the design fit the chosen dimensions cleanly, with realistic spacing, readable type, and no clipped content.

### Layout

When deciding how to lay elements out on the page, this should be your priority order for tools to differentiate sections:

1. Use spacing, grouping, alignment, typography, and hierarchy on the same product surface.
2. Use simple dividers or row separators.
3. Use a subtle surface tint only when the base surface is not enough.
4. Use borders only when separation still is not clear.
5. Use shadows/elevation last, and sparingly.

Don'ts:
 - Do not default to a centered "app card" (the whole UI is in a card on the page) on top of a contrasting page background. Use the base page surface first unless the source product or user explicitly asks for a contained app panel.
 - Do not put cards inside cards. Do not make every major section a card. Do not make each list item its own card unless each item is truly a standalone object. A normal list should usually read as one grouped surface with lightweight row separation.
 - Do not make up extraneous features. Add only the things essential to accomplish what the prototype's goal is. Don't make up more features just to fill out a UI.

### Typography

 - Anchor UI typography to readable product sizes. Body text should usually sit between 14px and 16px, with the rest of the type scale built around that baseline.
 - Keep long-form text to a comfortable line length, generally no more than 65 characters per line.
 - Use no more than 2 fonts in a UI. You can use any font available in the project, or fonts provided free on Google Fonts. Pick the font that is best for the goal of the product and that matches with its intended look and feel.

### Presentation

 - Do not add browser or device chrome around the mockup.
 - Do not put multiple ideas into a single image generation.
 - Vary each idea as much as possible while adhering to the constraints given entirely.

### Data Freshness

When the design includes dates or time-sensitive mock data, use the supplied current date as the anchor. Weekly views must show the real containing week with correct weekday/date pairs. Feeds, charts, notifications, and recent activity must use plausible chronological dates relative to today. Mark today when useful. Preserve dates required by the brief or source design.
```

## 输出

等待所有 Image Gen 调用返回后，再发送请用户选择的最终消息。

在每个所请求的生成图片在主聊天中恰好可见一次之前，不要发送最终选择消息。

如果可见的 Image Gen 输出少于请求数量，重试缺失的生成。不要发送选择消息。

按返回的 Image Gen 输出在对话上下文中出现的顺序编号：

- 第一个 Image Gen 输出 = 选项 1
- 第二个 Image Gen 输出 = 选项 2
- 第三个 Image Gen 输出 = 选项 3

忽略计划的概念顺序、原始请求链、请求顺序、`Promise.all` 结果顺序、批次顺序、数组索引、重试顺序与工具提交顺序。

不要命名或描述这些选项。对于默认的三张图片，只发送：

`Which option should I build: 1, 2, or 3? Or tell me what you'd like to refine or personalize first.`

仅当用户请求不同数量时才调整数字。

如果用户选择某个数字，在路由到 `$image-to-code` 之前确认所选选项，例如：`Building option 2!` 映射明确时不要请求确认。

完成意味着已生成所请求数量的独立图片，并已请用户选择其一。
