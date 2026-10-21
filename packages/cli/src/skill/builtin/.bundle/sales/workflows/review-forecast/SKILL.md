---
name: review-forecast
description: 当用户需要预测态势、预测准确性、commit、upside、预测电话准备，或针对某个销售代表账户簿、团队、周期、报表或点名交易集合做管道或交易风险评审时使用。产出可供管理者直接使用的预测汇总、风险态势、建议变更、证据缺口和后续动作。 | forecast review, commit, upside, pipeline risk, forecast call
---

# 评审预测


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

把 CRM 或导出的管道真相，转化为快速、可供管理者直接使用的预测速览。本技能负责汇总、风险态势、建议变更和后续动作；初次评审为只读，绝不更改预测类别、成交日期、CRM 记录、任务或消息。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

这些类别对本工作流尤为重要；仅当其他来源会实质改变某条首要建议时才使用它们。

- [Blocking] ~~CRM 用于权威的商机、金额、阶段、预测类别、成交日期、负责人、下一步、活动、报表和快照真相。除非 CRM 报表/导出、粘贴的快照，或链接的预测真相来源已在上下文中落地，否则它会阻塞。
- ~~Knowledge & Files 用于预测文档、经理笔记、收尾计划、交易台跟踪表、审批跟踪表和类别约定
- ~~Meeting Transcripts 用于会改变时间、利益相关方、紧迫性、异议或下一步置信度的近期客户证据
- ~~Email 用于客户互动、时间安排、未答复的请求，以及商业或采购进展
- ~~Internal Messaging 用于经理、交易台、法务、产品、审批、阻塞项和账户团队信号

将 ~~CRM 作为默认的预测真相。只有在无法使用 CRM 时，才把用户提供/导出的管道快照作为回退。笔记、消息和转录是支撑证据，不能替代缺失的商机真相。

## 参考资料加载

`SKILL.md` 负责常规的预测评审路径和输出形态。当结构化输入、态势/类别/金额枚举、对比输入或补充模式的归一化很重要时，使用 [references/request-schema.yaml](references/request-schema.yaml)。

## 工作流指引

### 1. 确定范围与预测约定

- 如果评审范围或预测真相路径不清晰，通过 `ask_user_input()` 询问用户。对于“评审预测”这类空泛调用，不要假设某个负责人账户簿或真相来源；提供：`My current forecast-period owner book from live CRM`、`A named team, owner, report, or pipeline view` 和 `A pasted/exported forecast snapshot or deal set`。
- 如果用户只提到“我的预测”而未定义来源，在构建汇总之前提供同样的明确选择。在用户选定范围和真相路径之前，不要检索更深的商机证据或渲染态势评审。
- 需要一个范围锚点：负责人/账户簿、团队、周期、点名的报表或管道视图、聚焦账户、聚焦商机，或提供的交易集合。
- 需要一个预测真相来源：~~CRM 数据、CRM 报表/导出、粘贴的管道表格、当前快照，或链接的预测上下文。如果都不存在，就停下并索取最小可用来源，而不是从轶事推断预测。
- 在渲染态势评审之前，先确定预测态势标准、类别约定和金额基准。先在提供的数据、~~CRM 元数据或 ~~Knowledge & Files 中寻找具体默认值。如果任何必需选择只是推断，就呈现带来源的默认值，并在产出态势评审之前请用户确认；只有当活跃对话线程或提供的来源清晰定义了全部三项时，才可不经确认继续。
- 不要超出有来源支撑的对话线程上下文、~~CRM 元数据、来自 ~~Knowledge & Files 的经理笔记或 RevOps 文档，或用户提供的指引，去解释公司专属的预测类别、阶段门槛或 Commit/Upside 惯例。
- 如果范围不明确，在提问前做一次有边界的候选梳理：最多三次来源读取，仅够提供最多五个具体选择。
- 只有在用户明确选择或确认之后才使用负责人范围。当用户点名账户或商机时，有意绕过负责人账户簿范围；当用户点名报表、团队或管道视图时，使用那个更窄的范围并说明它。
- 对于点名的团队、细分、账户簿或管道视图，优先使用标准的 ~~CRM 报表或筛选，并说明确切的筛选条件。例如，如果 Startups 预测由 `Sales_Coverage_Opp__c = 'Startups'` 表示，就先使用它，而不是跨负责人、账户和标记细分字段扩大范围。仅在用户要求、已知标准定义不完整，或它返回的结果稀薄得不合常理时才扩大范围；标注更宽的筛选条件，并且不要把它当作标准定义来对比。

### 2. 构建预测真值集

- 从标准 ~~CRM 报表/筛选或提供的导出开始。在输出中说明确切的范围、周期、来源、金额基准和数据新鲜度。
- 对于实时 ~~CRM，只做识别范围、金额、预测、阶段、负责人、成交日期、下一步、活动和风险字段所需的最小字段或 schema 发现。除非范围是“我的账户簿”或需要账户级字段，否则跳过当前用户和账户对象的发现。
- 对于常规的首次梳理，先收集范围内当前的开放交易并构建汇总，通常按预测类别、可选按阶段：交易数量、主要金额和预期预测金额。
- 仅对价值最高、风险最高、过时、发生实质变化或造成集中度的商机检视明细行。
- 仅在用户提供对比快照、有可用的点名快照/报表，或用户明确要求查看变动时，才收集先前快照的行。不要用宽泛的字段历史来暗示真实的预测变动。
- 如果当前与先前的覆盖度是部分的，直接标注这一点。
- 把 OpportunityHistory 或类似字段历史视为字段历史，而不是预测快照变动，除非存在真正的先前快照。
- 如果数据太稀薄、不足以支撑类别建议，就降级为仅风险的速览，并说明原因。

### 3. 仅在会改变结论之处补充有界证据

- 在汇总之后，对排名最靠前的一到三笔不确定或重要交易默认使用 `light` 补充。当用户要求仅基于预测数据的评审时使用 `none`；只有在要求深度评审，或缺失的支撑证据会实质改变某条高价值建议时，才使用 `standard`。
- 使用 ~~Meeting Transcripts 和 ~~Email 获取近期客户互动、紧迫性、利益相关方、异议、决策流程和时间信号。
- 使用 ~~Internal Messaging 和 ~~Knowledge & Files 获取阻塞项、审批、收尾计划缺口、法务/采购风险或经理上下文。
- 不要默认对每笔交易都做补充。当首要建议得到支撑时就停止；点名那些会实质改变置信度的缺失通道。
- 当必需的范围内锚点或预测约定尚未解决时，不要扩大补充范围；先解决或确认它。
- 不要让支撑通道覆盖 CRM 拥有的金额、阶段、预测类别、负责人、成交日期或商机状态。

### 4. 评估风险与建议态势

- 评估重要交易的下一步清晰度、时间可信度、利益相关方覆盖、决策流程可见度、紧迫性证明、近期互动和数据新鲜度。
- 标记有支撑的卫生信号，例如缺少下一步、活动过时、成交日期不清晰、利益相关方覆盖薄弱，以及类别/金额/阶段变化。
- 当过多态势取决于某笔交易、某个负责人、阶段、细分、产品或时间桶时，标记组合集中度。
- 使用简单的 `low`、`moderate` 和 `high` 风险标签。将有来源的事实与方向性推断分开。
- 只在证据支持时建议保持、降级、上调或跟进核查等态势。把无支撑的变更表述为问题或 `Needs confirmation`。
- 当提供了当前与先前快照时，增加一个简洁的 `What Changed` 小节。没有先前快照时，说明未评估真实变动，并仅在得到支持时使用当前状态示例，例如已入账的 Closed Won、Commit 集中度、过时的成交日期、缺少下一步，或大额 Closed Lost/流失行。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 更深入地检视某笔高风险或造成集中度的交易。
- 起草一份简洁的经理或预测电话摘要供评审。
- 创建可直接用于电子表格的汇总或风险跟进结构。
- 起草可供 CRM 使用的更正或下一步文本供评审。
- 检查是否已存在相匹配的每周自动化，针对同一范围和预测约定重跑本 `review-forecast` 技能；若不存在，提出创建一个，为销售人员或管理者提供每周预测风险速览。

应避免的后续步骤：
- 自动更改预测类别、成交日期、金额或 CRM 记录。

### 自动化建议防护

对于当前预测、变动或风险评审输出，当用户拥有可复用的负责人账户簿、团队、报表、管道视图、周期或交易集合，并且预测约定稳定时，每周预测风险简报就是首选的自动化建议。用销售语言表述其价值：在预测电话之前发现 commit 风险、upside 变动、过时的下一步、成交日期压力、集中度，以及需要管理者关注的交易。

自动化必须是对本技能的定时重跑，而不是另一套自定义管道摘要。创建或描述该自动化时，让提示词直接调用本技能，并保持相同的预测范围和约定：

```text
Use the Sales `review-forecast` skill.
Rerun it weekly for the same forecast scope and convention.
Return the standard Forecast Review output.

owner_name: "[owner name when used]"
owner_email: "[owner email when used]"
focus_accounts: [same focused accounts when used]
focus_opportunities: [same focused opportunities when used]
forecast_period: "[same period or rolling current period]"
forecast_posture_standard: "[defend_commit, identify_upside, or conservative_manager_ready]"
forecast_category_convention: "[same sourced or user-confirmed convention]"
amount_basis: "[carr_arr, acv, tcv, weighted_amount, or crm_primary_amount]"
enrichment_mode: "[none, light, or standard]"
```

对于无法用负责人、账户或商机字段表达的团队、报表或管道视图范围，将稳定范围保留在自然语言提示文本中，让本技能按其常规工作流指引解析预测真值集。

周期性输出应遵循本技能的 Forecast Review 格式：评审范围、整体预测态势、关键变动、最高风险交易、建议变更、证据缺口和后续动作。保持只读；它可以建议核查、更正或供评审的 CRM 可用文本，但不得更改预测类别、成交日期、金额、CRM 记录、任务或消息，除非用户另行要求并批准。

在提供每周预测简报之前，检查用户是否已安装了相匹配的本地自动化。查看 `$CODEX_HOME/automations/*/automation.toml` 下的本地自动化记录，或在 `CODEX_HOME` 未设置时查看 `~/.codex/automations/*/automation.toml`，并按名称、提示词、技能名、频率、负责人账户簿、团队、报表、管道视图、预测周期、金额基准、类别约定或其他稳定范围细节进行匹配。将启用中和已暂停的匹配都视为已安装。

- 如果存在匹配的自动化，不要再建议创建另一个。继续提供下一个最相关的非自动化后续动作。
- 如果不存在匹配的自动化，以一个明确的建议结束：检查/创建针对同一范围的 `review-forecast` 每周重跑。将周期性输出描述为可供管理者直接使用的每周预测简报，覆盖风险、upside、过时的下一步、集中度和建议的核查项。在用户明确同意之前，不要创建或更新该自动化。
- 如果自动化能力不可用，不要提及工具细节；在自动化可用时，提出帮助搭建周期性的预测风险简报。

## 模式

- `Current Forecast Review` —— 默认；当前汇总、主要风险、建议和动作。
- `Movement Review` —— 当存在先前快照或明确的对比来源时使用；补充真实变动。
- `Risk-Only Review` —— 当预测真相足以判断风险、但不足以支撑态势变更时使用。
- `Focused Deal Review` —— 用于点名的账户或商机，而不是整个账户簿。

## 输出格式

按顺序返回以下章节。

```md
# Forecast Review: [Scope]

## Review Scope

- **Scope:** [Owner, team, report, period, or deal set]
- **Forecast truth:** [Live CRM, export, pasted data, or linked source]
- **Amount basis:** [CARR/ARR, ACV, TCV, weighted amount, or CRM primary amount]
- **Category convention:** [Sourced convention or user-confirmed interpretation]
- **Data freshness:** [Date/time or limitation]

## Overall Forecast Posture

[Manager-ready posture summary]

| Forecast Category | Deal Count | Primary Amount | Expected Amount | Confidence |
| --- | ---: | ---: | ---: | --- |
| [Category] | [Count] | [Amount] | [Amount] | [High/Medium/Low] |

## Key Movements

- [True movement backed by a prior snapshot, or “True movement not evaluated; no prior snapshot was available.”]

## Highest-Risk Deals

| Deal | Amount | Current Posture | Risk | Why | Recommended Check or Change | Source |
| --- | ---: | --- | --- | --- | --- | --- |
| [Deal] | [Amount] | [Category] | [Low/Moderate/High] | [Evidence] | [Action or posture] | [Link/label] |

## Recommendation Changes

- **[Deal]:** [Keep / Downgrade / Upside / Needs confirmation] — [grounded reason and confidence]

## Evidence Gaps

- [Gap] — [impact on confidence] — [smallest next collection step]

## Follow-Up Actions

1. [Action] — [Owner or suggested owner] — [Due or TBD] — [Expected outcome] — [Source]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 规则

- 不要编造商机、金额、阶段、成交日期、负责人、预测类别、客户互动、变动或链接。
- 说明评审使用的是实时 CRM 真相、导出的/报表数据、粘贴的管道数据，还是其他用户提供的来源。
- 只有在有先前快照或明确对比来源时才包含真实变动；否则保留 `Key Movements` 并说明限制。
- 把不确定的建议标注为 `Likely`、`Possible` 或 `Needs confirmation`；避免虚假的精确。
- 保持初次评审只读。仅在要求时才起草下游的经理笔记、可供 CRM 使用的文本、电子表格结构或风险跟进；绝不在没有单独明确批准步骤的情况下写入或发送。

## 失败处理

如果范围或预测真相无法确定，说明阻塞点，在可用时提供具体候选，并索取最小的缺失来源或约定。如果可选证据不可用，就基于预测真值集继续，并让置信度限制清晰可见。
