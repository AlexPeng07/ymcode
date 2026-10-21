---
name: get-context
description: "用于澄清产品与结果的设计简报必经关卡。在构思、image-to-code 构建、改版或产品 UI 工作前使用，以澄清缺失的产品信息，并在继续之前复述简报。 | Trigger keywords: design brief, clarify product, get context, play back brief."
---

# 获取上下文

在要求设计、构建、原型、克隆、改版、扩展或生成产品 UI 方向的产品设计请求开始时运行本技能。

使用提问模式澄清以下内容：

- 正在设计、改版或扩展的是什么产品、站点、功能、工作流、组件或界面
- 该功能、变更、应用或网站应帮助用户完成什么

不要重复询问已回答的问题。当两者都明确时，用一条简洁说明复述简报与默认值，指出下一个工作流，并在同一轮继续。复述不是请求批准。用户可随时修正风格、范围或交互性。

硬性边界：当设计目标或预期的用户结果仍缺失时，不要实现 UI、搭建原型、启动服务器或创建文件。

## 关键覆盖规则

- 继续之前，先参考插件路由 [$index](../index/SKILL.md)。
- 遵循 [$critical-overrides](../../references/critical-overrides.md)。

## 用户上下文

开始之前，加载 [$user-context](../user-context/SKILL.md)，并在本地 shell 可用时运行其预检脚本。

在相关时，使用已保存的产品 URL、Figma 文件、截图、参考图片、代码库路径、Storybook、tokens、设计系统、品牌资源、组件引用、浏览器偏好与分享目标作为依据材料。

不要检查每个已保存的参考。只检查当前任务所需的内容。

## 交接给下一个工作流

1. 当下一个工作流已明确时，在发送简报复述之前先阅读该技能。不要只提及一个你尚未阅读的技能。

2. 在执行 `$ideate`、`$url-to-code` 或 `$image-to-code` 之前，用一条简洁且用户可见的说明复述最小简报及任何默认值。

3. 如果目标和预期的用户结果明确，在同一轮继续进入下一个工作流。不要等待明确确认。如果用户提供反馈，纳入反馈并修正方向。

4. 在开始一项涉及面较大的应用、原型、克隆、改版或构建之前，发送一条简短的预期设定说明并继续。示例：

```text
This kind of build usually takes about 10-15 minutes, and ambitious ones can take longer. Good moment to grab coffee or tend to something else; I’ll keep moving and bring the prototype back when it is ready.
```

对于微小的静态改动、快速审计、简单研究、仅设置或仅分享的请求，不要发送此说明。

完成意味着设计目标与预期的用户结果已明确、默认值已复述，且任何已确定的下一个技能已阅读。
