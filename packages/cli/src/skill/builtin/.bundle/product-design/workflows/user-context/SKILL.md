---
name: user-context
description: "加载或管理产品设计已保存的用户上下文。当用户要求设置产品设计、开始使用、入门引导、保存产品或设计来源、查看产品设计记住了什么、更新已保存的上下文或记住产品设计偏好时使用。示例包括产品 URL、Figma 文件、截图、参考图片、代码库路径、Storybook、tokens、设计系统、品牌资源以及通用的产品/设计笔记。 | Trigger keywords: user context, setup Product Design, save design sources, remember preferences, Figma, Storybook, design tokens."
---

# 用户上下文

用户上下文保存设计师常用的产品与设计参考，使后续产品设计工作从正确的来源开始。

当用户要求以下事项时使用本技能：

- 设置产品设计
- 开始使用产品设计
- 完成产品设计入门引导
- 保存产品或设计来源
- 查看产品设计记住了什么
- 更新已保存的产品或设计上下文
- 记住某项产品设计偏好
- 设置我的插件

## 关键覆盖规则

- 继续之前，先参考插件路由 [$index](../index/SKILL.md)。
- 遵循 [$critical-overrides](../../references/critical-overrides.md)。
- 在提供入门引导或为后续会话保存上下文之前，确认本地 shell 可用、`$CODEX_HOME` 可解析，且 `$CODEX_HOME/state/plugins/product-design/` 存在且可写，或可在可写的父目录中创建。如果 `user-context.md` 已存在，也要确认其可写。
- 如果任何检查无法完成或失败，则持久化上下文不可用。不要提供已保存上下文的入门引导，也不要声称新上下文已保存供后续会话使用。如果用户要求保存某些内容，请说明它可用于当前会话，但无法保存供后续会话使用。

## 已保存的用户上下文

如果 `user-context.md` 存在，默认使用它。

使用已保存的产品 URL、Figma 文件、截图、参考图片、代码库路径、Storybook、tokens、设计系统、品牌资源、组件引用、浏览器偏好与分享目标，为产品设计工作提供依据。

除非用户另有要求，构思、原型、审计、克隆与评审都应与已保存的产品上下文保持一致。

当工作流需要视觉依据时，在 ImageGen、构思、原型、审计与评审工作中附上或包含相关的已保存截图、参考图片、tokens、设计语言与组件引用。

## 状态文件

已保存的上下文位于：

```text
$CODEX_HOME/state/plugins/product-design/user-context.md
```

已保存的截图与参考图片位于其旁边：

```text
$CODEX_HOME/state/plugins/product-design/assets/
```

如果该文件不存在，照常继续；除非用户要求设置产品设计、保存上下文，或当前任务因缺少产品/设计上下文而受阻。

## 预检

当任一产品设计工作流需要已保存的上下文时，运行：

```bash
python3 scripts/user_context_preflight.py
```

将返回的已保存条目作为任务的起始上下文。

如果脚本报告不存在已保存的上下文，除非需要设置上下文，否则从当前用户提示词继续。

预检期间不要浏览、打开或检查每个已保存的参考。只检查当前任务所需的已保存参考。

## 设置

当用户要求设置产品设计、询问产品设计能记住什么、询问产品设计对其产品了解什么，或提供要保存的产品/设计参考时，使用 [references/onboarding.md](references/onboarding.md)。

对于仅设置的请求，说明产品设计能记住什么，并索取有用的来源。

根据用户的请求调整上下文收集方式。首次设置与更新现有上下文不同。

设置期间不要检查工作区、安装依赖、搭建原型、生成图像、运行审计或开始实现。

在用户提供要保存的参考后，运行：

```bash
python3 scripts/init_user_context.py
```

然后将这些参考添加到创建的 `user-context.md` 中。

## 保存

保存有用且持久的产品设计上下文：

- 产品 URL
- Figma 文件
- 截图与参考图片
- 代码库路径
- Storybook 与组件文档
- 设计 tokens 与主题来源
- 品牌、logo、图标、插画、图像与资源来源
- 偏好的浏览器、捕获工具与分享目标
- 能让后续产品设计工作更准确的团队约定

当用户提供要保存的截图或参考图片时，将它们复制到 `user-context.md` 旁边的 `assets/`，并在已保存条目中链接它们。

为每张保存的图片取一个清晰、描述性的文件名，说明图片内容。使用后续产品设计运行无需打开文件即可理解的名称。

良好的图片命名示例：

```text
assets/chatgpt-settings-modal-dark-mode.png
assets/payment-sheet-mobile-error-state.png
assets/product-dashboard-sidebar-navigation.png
assets/storybook-primary-button-states.png
assets/brand-logo-lockup-purple-gradient.png
assets/onboarding-flow-welcome-step.png
assets/checkout-confirmation-screen.png
assets/account-menu-open-state.png
```

不要保存密钥、凭证、API key、私有 token、复制的客户数据或任何不应持久化的内容。

使用以下结构：

```md
# {Category}

- Description: {what this category is and when future Product Design runs should use it}

## Saved Links And Context

{Saved reference or fact}
- Date Added: YYYY-MM-DD.
- File: assets/{clear-descriptive-name}.png
- Useful Context: {what this reference represents}
- Future Use: {how future Product Design work should use it}
```

仅当已保存条目具有本地图片文件时才包含 `File:`。

当某个类别尚无已保存参考时，严格使用：

```md
status: not provided
```

保持已保存上下文的精简。优先保存少量高价值参考，而不是把所有可能的 URL 或文件一股脑堆进去。

## 读取

- 不要将 `status: not provided` 视为事实。
- 在本地 shell 可用时，通过 `scripts/user_context_preflight.py` 读取。
- 将已保存的上下文作为默认依据，然后只检查当前任务所需的内容。
