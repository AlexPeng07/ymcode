---
name: analyze-account-signals
description: 当用户想了解某个账户发生了什么变化、监控某个负责人组合或观察名单，或根据近期证据给需要关注的账户排序时使用。产出以证据为支撑的账户简报或有界观察名单摘要，并附建议动作。 | account signals, what changed, watchlist, portfolio monitor, account brief
---

# 分析账户信号


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

把最新的账户证据转化为简洁视图：发生了什么变化、为何重要、下一步该做什么。本技能负责只读的账户简报或有界观察名单摘要；它不创建任务、不发布摘要、不存储监控状态，也不写入 CRM 更新。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

这些类别对本工作流尤为重要；仅当其他来源能实质改善信号叙述时才使用它们。

- [Blocking] ~~CRM 用于权威的账户身份、负责人、商机、阶段、金额、活动、客户健康和账户状态真相。除非足够完整的账户真相已在上下文中落地，否则它会阻塞默认的账户信号速览。
- ~~Meeting Transcripts 用于近期客户用语、决策、承诺、异议、后续事项和利益相关方动向
- ~~Email 用于面向客户的推进、未答复的请求、语气变化、附件和承诺的后续步骤
- ~~Internal Messaging 用于内部协调、阻塞项、利益相关方对齐和升级信号
- ~~Knowledge & Files 用于账户计划、笔记、简报、实施文档和既往账户上下文
- ~~Calendar 用于近期或即将到来的客户会议、承诺，以及大型组合的范围裁剪

将 ~~CRM 作为默认的账户锚点。只有在无法使用 CRM 时，才把足够的用户提供/导出账户真相作为回退。沟通、文件和日历证据用于解释近期性和动向；它们不会覆盖 CRM 拥有的账户或商机字段。

## 参考资料加载

`SKILL.md` 负责常规的模式划分、有界检索和输出形态。只有当参考资料的额外细节会改变决策时才加载：

- 当结构化输入、旧版别名、选择器优先级或机器可读输出形态很重要时，使用 [references/request-schema.yaml](references/request-schema.yaml)。
- 当信号分类、置信度、时效性、排序、变化状态或展示标签不明确时，使用 [references/signal-taxonomy.md](references/signal-taxonomy.md)。

## 工作流指引

### 1. 选择模式与范围

- 如果模式不清晰，通过 `ask_user_input()` 询问用户。对于“帮我分析账户信号”这类空泛调用，不要假设是 Adhoc Account Brief 或 Monitor Summary；提供：
  - `Adhoc Account Brief for one account`
  - `Monitor Summary for accounts I own in CRM`
  - `Monitor Summary for a watchlist, owner, or territory`
- 对于一个点名的账户，或“[某账户]发生了什么变化？”这类请求，使用 `Adhoc Account Brief`。如果用户选择了 Adhoc 但未提供账户、域名或 CRM id，就搜索、排序，并通过 `ask_user_input()` 提供最多五个具体账户候选。在用户选定之前，不要检索更深的证据或起草简报。
- 对于负责人、区域、组合、观察名单、每日监控，或“哪些账户需要关注？”这类请求，使用 `Monitor Summary`。如果用户选择了 Monitor 但未提供观察名单、负责人、区域或组合，提供：
  - `Accounts I own in CRM`
  - `A named owner or territory`
  - `A watchlist or account list I provide`
  在用户选定范围之前，不要扩大到某个代表性销售人员，也不要检索更深的证据。
- Adhoc 要求恰好一个账户。Monitor 要求观察名单、负责人、区域、组合或足够详细的账户名单。
- 除非用户提供其他窗口，默认取最近 14 天。保留用户提供的关注领域，例如扩展、流失、上线阻碍或利益相关方动向。
- 接受 `sfdc_account_id` 作为 `crm_account_id` 的旧版别名。当结构化输入与提示措辞冲突时，以结构化输入为真相来源，并说明解析出的范围。
- 模式与范围确定后，如果锚点不明确，在提问前做一次有边界的候选梳理：在可用时从 ~~CRM 开始，最多三次来源读取，并提供最多五个具体候选。
- 如果用户对当前对话中给出的具体候选回复 `okay`，就从这些候选中挑一个合适的近期、看起来重要或高信号的账户，而不是跳过。当看不到合适的账户、负责人组合或观察名单时，问一个简洁的澄清问题。

### 2. 界定并解析账户范围

- 对于 Adhoc，通过稳定的 CRM id、精确名称/域名，或足够详细的用户提供账户上下文解析出一个账户。
- 对于 Monitor，如果有明确的观察名单，就把它作为完整范围。否则在 ~~CRM 中使用所要求的负责人/区域/组合做一次有界的第一遍。
- 对于按负责人限定的 Monitor，优先使用主要负责人范围；仅在提供方指示还有更多结果时继续分页，直到收集到 50 个账户。
- 如果主要负责人查询返回零个账户，且用户明确要求账户团队、区域、角色、协作人或与 GTM 关联的覆盖范围，就用所选 ~~CRM 应用支持的筛选和同样的上限重试一次。
- 如果更宽的重试超时或失败，在有主要负责人结果时继续使用这些结果；否则索取观察名单或更窄的负责人范围。
- Monitor 最多保留 50 个账户。如果解析出的范围更大，就用 ~~Calendar 中未来 14 天内即将到来的外部客户会议缩减到最多 50 个；如果这样仍无法缩减，请用户提供更窄的范围，而不是任意截取。
- 优先使用精确的名称/域名匹配；当仍有多个可能账户时，不要盲目相信排序第一的解析结果。

### 3. 收集有界近期证据

- 对每个选中的账户，先收集主要的 ~~CRM 真相和用户提供的上下文。使用 ~~Knowledge & Files 获取能解释当前工作流的账户计划或笔记。
- 对于 Adhoc，或当主要证据稀薄时，按以下顺序按需选择性深入：~~Email、~~Knowledge & Files、~~Meeting Transcripts、~~Internal Messaging，最后是 ~~Calendar。
- 对于 Monitor，先完成跨账户集合的有界主流程，再深入单个账户。仅对可能存在重要变化、歧义或高价值风险/机会的账户深入。
- 仅并行执行相互独立的账户查询，同时进行的上限为 10 个。把批量超时或 schema 错误视为调用形态失败，而不是来源不可用的证据；在可用时按稳定账户 id 重试失败的账户一次，然后将其标记为不可用，并用存活下来的账户继续。
- 当近期的叙述得到支撑时就停止。如果检查了某个近期性来源但没有匹配，且该缺失会实质影响置信度，就写明 `checked/no match`。

### 4. 归一化、打分并解读信号

- 把证据归一化为 `references/signal-taxonomy.md` 中的固定分类；除非用户明确扩展该工作流，不要发明新的信号标签。
- 对每个信号保留类型、摘要、来源、时效性、置信度、证据、引用和建议动作。
- 对描述同一事件的多个来源去重。相互印证会提高置信度；薄弱、过时、矛盾或无支撑的证据会降低置信度，并常常成为一条证据缺口。
- 区分可执行的账户风险与仅属卫生问题的上下文，例如归属缺口、缺失的路由字段或含糊的关联；仅当卫生问题会影响监控置信度或建议动作时才呈现它。
- 对于 Adhoc，按对账户叙述的重要性排序信号：先风险/机会，再依赖，最后支撑性上下文。
- 对于 Monitor，对新鲜、高置信度、与行动相关的变化排序。优先考虑流失或留存风险以及扩展机会；降低过时或推测性信号的权重，并压缩没有重要变化的账户。
- 为每个排序账户给出 High、Medium 或 Low 的关注度分数，以及方向性态势：Expansion ready、Expansion blocked、Retention risk 或 Execution risk。

### 5. 将证据与解读分开

- 把可点击的来源链接放在其所支撑的主张附近。对于 CRM，使用连接器提供的记录 URL；仅当可信的连接器元数据暴露了实例基础 URL 时，才用 id 构造 URL。当不存在稳定链接时使用纯文本来源标注，并且不要把裸露的记录 id 当作主要行动路径暴露。
- 让原始证据与策略性解读保持可见的分离。每个建议动作都必须能追溯到某个信号或证据项。
- 如果 CRM 和手工账户真相都不可用，说明近期性锚点不可用，并且不要暗示结果是最新的。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 深入某个账户，或补齐最小的关键证据缺口。
- 基于这些信号起草一份简洁的内部账户团队更新。
- 当证据指向活跃动作或即将到来的对话时，把所选账户交给交易策略或会议准备。
- 检查是否已存在相匹配的每日或每周自动化，针对同一监控范围重跑本 `analyze-account-signals` 技能；若不存在，提出创建一个，重跑该技能并标出哪些账户需要关注、为何重要，以及最佳的下一个销售动作。
- 当缺失或过时字段正在影响置信度时，起草可供 CRM 使用的更新供评审。

应避免的后续步骤：
- 自动创建任务、发布更新或写入 CRM 变更。

### 自动化建议防护

对于 `Monitor Summary` 输出，当用户提供了可复用的范围（例如观察名单、负责人、区域或组合），且摘要能从每日或每周刷新中获益时，周期性的销售人员账户观察就是首选的下一步。用销售语言表述其价值：在被遗漏之前捕捉管道变动、扩展信号、留存风险、停滞的下一步、利益相关方变化、即将到来的客户会议和账户团队阻塞项。

自动化必须是对本技能的定时重跑，而不是另一套自定义摘要。创建或描述该自动化时，让提示词直接调用本技能，并尽可能保持本技能接受的相同归一化请求形态：

```text
Use the Sales `analyze-account-signals` skill in `Monitor Summary` mode.
Rerun it for the same seller account scope: [watchlist, owner, territory, portfolio, or CRM filter].
Return the standard Monitor Summary output.

mode: "monitor"
owner_id: "[owner id when used]"
owner_email: "[owner email when used]"
watchlist_accounts: [same watchlist when used]
time_window: "[same or agreed recency window, default 14d]"
focus_areas: [same focus areas such as expansion, churn, rollout blockers, stakeholder movement]
output_style: "inbox_summary"
```

对于无法用 `owner_id`、`owner_email` 或 `watchlist_accounts` 表达的区域或组合范围，将稳定范围保留在自然语言提示文本中，让本技能按其常规的 Monitor Summary 指引解析账户范围。

周期性输出应遵循本技能的 `Monitor Summary` 格式：需要关注的排序账户、重要变化、运行元数据，以及无重大变化的处理。保持只读；它可以建议下一步销售动作，但不得创建任务、发布摘要、在自动化之外存储监控状态或写入 CRM 更新，除非用户另行要求并批准。

在提供周期性监控之前，检查用户是否已安装了相匹配的本地自动化。查看 `$CODEX_HOME/automations/*/automation.toml` 下的本地自动化记录，或在 `CODEX_HOME` 未设置时查看 `~/.codex/automations/*/automation.toml`，并按名称、提示词、技能名、模式、账户集合、负责人、区域、组合或其他稳定范围细节进行匹配。将启用中和已暂停的匹配都视为已安装。

- 如果存在匹配的自动化，不要再建议创建另一个。继续提供下一个最相关的非自动化后续动作。
- 如果不存在匹配的自动化，以一个明确的建议结束：检查/创建针对同一范围的 `analyze-account-signals` 每日或每周重跑。将周期性输出描述为一份简短、可直接供销售人员使用的摘要，说明需要关注的账户、各自在商业上的重要性，以及建议的下一步动作。在用户明确同意之前，不要创建或更新该自动化。
- 如果自动化能力不可用，不要提及工具细节；在自动化可用时，提出帮助搭建周期性检查。

## 模式

- `Adhoc Account Brief` —— 单个账户，默认的简报输出。
- `Monitor Summary` —— 有界的观察名单/负责人/组合视图，默认的收件箱式输出。

## 输出格式

### Adhoc Account Brief（单账户简报）

```md
# Account Snapshot

- **Account:** [Linked account when available]
- **Time Window:** [Window]
- **Current Posture:** [1-2 grounded lines]

## Key Recent Signals

- **[Plain-English signal label]** — [What changed] · [Fresh/Recent/Stale] · [High/Medium/Low confidence] · [Source link/label]

## Strategic Interpretation

- [What the signals likely mean for land, expand, retention, or execution risk; label inference]

## Recommended Actions

1. [Action] — [Evidence or signal link] — [Expected outcome]

## Open Questions / Missing Evidence

- [Unknown or gap] — [smallest follow-up evidence that would reduce uncertainty]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### Monitor Summary（监控摘要）

```md
# Ranked Accounts Requiring Attention

| Account | What Changed | Why It Matters | Attention | Posture | Suggested Action | Confidence / Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| [Linked account] | [Delta] | [Impact] | [High/Medium/Low] | [Posture] | [Action] | [Link/label] |

## Material Deltas

| Date | Account | Signal | Status | Delta Summary | Impact | Next Step | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Date] | [Account] | [Label] | [New/Updated/Worsened/Resolved] | [Delta] | [Impact] | [Action] | [Confidence] |

## Run Metadata

- **Time Window:** [Window]
- **Data Freshness Cutoff:** [Cutoff or limitation]
- **Scope:** [Universe, checked count, ranked count]
- **Delta Since Last Run:** [Only when prior-run context exists]

## No Major Delta

[Include only when useful.]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 规则

- 不要编造账户、负责人、商机、指标、信号、日期、链接或建议动作。
- 不要使用公开网络/新闻研究、外部数据丰富或任务跟踪器，除非用户明确扩展该工作流并提供了相关来源。
- 不要在本工作流中创建任务、帖子、摘要、CRM 更新或其他回写。
- 在面向用户的输出中使用通俗语言的展示标签，而不是原始的分类标记。
- 把无支撑的主张改写为问题、风险或证据缺口，而不是断言。
- 如果某次监控运行没有重要变化，就简洁说明，而不是用填充内容撑起排序。

## 失败处理

如果账户解析失败，说明缺少或含糊的是哪个标识符，并请求最小的澄清。如果可选来源失败，就用最强的有据证据继续，并点名重要缺口。如果 Monitor 范围无法安全缩减到 50 个或更少的账户，请用户提供观察清单或更窄的范围。
