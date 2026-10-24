---
name: deep-research
description: "使用并行子代理和内置工具（WebSearch/WebFetch + 免费 API，无需密钥）对任意主题做深度研究。当用户要求带引用的多来源彻底调研时使用，例如「深度调研X」「deep research」「帮我全面研究一下」「多方求证」「写一份调研报告」。不适用于简单查证（一次 WebSearch 即可），也不适用于学术文献综述（请改用 auto-research 技能）。 | Deep multi-source investigation with a cited report; not for simple lookups or academic literature surveys. | Trigger keywords: deep research, 深度调研, 全面研究, 多方求证, 调研报告."
---

# Deep Research

编排并行研究子代理，然后撰写一份连贯、带引用的报告。研究是并行的；写作是单点的——绝不让多个智能体分头撰写报告章节。

## 第 0 步 — 始终先做

1. 通过 Bash 运行 `date +%Y-%m-%d`。绝不要根据训练数据假定当前年份。
2. 分类：
   - 1-2 次搜索就能回答？→ 停下，直接用 WebSearch。不要使用本技能。
   - 枚举任务（N 个条目 × M 个字段，例如「对比 20 个框架」）？→ 仍用本技能，但采用面向表格的分解（每批条目一个子代理）。
   - 开放式调研？→ 继续往下。
3. 选择深度（默认 **standard**；用户可用「quick」「exhaustive」等说法覆盖）：

| 模式 | 子代理数（第 1 轮） | 最多追问轮次 | 来源目标 |
|---|---|---|---|
| quick | 2-3 | 0 | 8+ |
| standard | 3-5 | 1 | 15+ |
| deep | 5-8 | 2 | 25+ |

这些是硬性预算。反思（阶段 4）可以花掉它们，但绝不能超出。

## 工作区

所有状态都落盘在 `./research/<slug>/`——绝不只留在上下文中（要能扛过上下文压缩）：

```
research/<slug>/
├── brief.md         # research brief — the single contract for all phases
├── findings/        # F1.md, F2.md ... one per sub-agent, structured evidence
└── REPORT.md        # final deliverable
```

恢复会话时：重读 `brief.md` + 列出 `findings/`，跳过已完成的视角，继续推进。

## 阶段 1 — 界定范围

最多提一轮澄清问题（AskUserQuestion），且仅在确实含糊时：受众、时间范围、地区、待决决策。如果用户说「直接开跑」或意图清晰，跳过提问，把假设写进 brief。

然后编写 `brief.md`：精炼后的问题、范围边界（包含/排除）、假设、深度模式、今天的日期。后续每个阶段都以这份 brief（而非原始对话）为衡量基准。

## 阶段 2 — 规划

把 brief 分解为 3-8 个**相互独立**的研究视角。按需从这些透镜取材：核心事实/定义 · 最新进展（近 12 个月）· 定量数据/基准 · 反方论证与失败案例 · 实践者经验（论坛、issue）· 学术工作 · 关键玩家/替代方案。

把这些视角列在 `brief.md` 的 `## Angles` 下。深度模式或有争议的话题，在消耗预算前把视角清单给用户快速确认。

## 阶段 3 — 并行研究

在**一条消息中**为每个视角各派生一个子代理（并行）。每个提示词都基于 [reference/subagent-prompt.md](reference/subagent-prompt.md) 中锁定的模板构造——逐字复现，只替换 `{variables}`。每个子代理：

- 只研究一个视角，使用 WebSearch/WebFetch 以及 [reference/sources.md](reference/sources.md) 中的免费端点
- 把结构化发现写入 `findings/F<n>.md`（每条包含 论断 / 引文 / URL / 日期 / 置信度）
- 只向你返回 3-5 行摘要——原始页面内容绝不能进入你的上下文

如果某个子代理失败或返回的结果单薄，记录后继续；不要阻塞其他视角。

## 阶段 4 — 反思（缺口检查）

阅读所有 `findings/*.md`。对照 `brief.md` 自问：brief 的哪些部分没有证据？哪些重要论断只依赖单一来源？来源在哪些地方互相冲突？

- 发现缺口且追问预算仍有剩余 → 用增量查询派生定向子代理（同一模板，更窄的视角）。每剩余一轮重复一次。
- 预算耗尽或覆盖已足够 → 继续。记录未解决的缺口；它们会进入报告的「Open questions」。

## 阶段 5 — 写作（单点）

你独自一遍写完 `REPORT.md`，遵循 [reference/report.md](reference/report.md)。核心规则：

- 每条非显而易见的论断都带行内引用 `[n]` 并映射到 Sources 章节；引用 URL 只能来自 findings 文件——绝不能凭记忆。
- 来源冲突时，呈现双方并附日期；优先更新且为一手的来源。
- 用 `[single source]` 标记单一来源的论断，用 `[speculative]` 标记推测。
- 结尾包含：Open questions · Sources（编号，附访问日期）。

深度模式下，定稿前先做一次批判性通读：以怀疑审稿人的身份重读报告（有无无支撑的论断？数据是否陈旧？缺少反方观点？），并就地修正。

最后，给用户 5-10 行的关键结论摘要和报告路径。
