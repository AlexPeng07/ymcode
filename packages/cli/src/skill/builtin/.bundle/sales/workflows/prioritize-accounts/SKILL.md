---
name: prioritize-accounts
description: "当用户问现在该推进哪些现有账户、在某个有据名单或管道中哪些线索最热、如何给区域、账户簿、管道、ICP 名单或账户名单排序、本周该聚焦哪里，或该采取哪些销售代表可直接使用的下一步动作时使用。基于当前证据给账户排优先级，抑制或计入进行中的动作，并在有支持时识别可达联系人。对于全新的公司发现或缺失数据补全，请改用数据丰富技能。 | account prioritization, territory ranking, pipeline, next actions, watchlist"
---

# 账户优先级排序

让销售人员获得一个小巧、以证据为基础的账户行动视图：现在哪些账户值得关注、它们为何上升、该联系谁，以及该采取什么安全的下一步。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## 账户排序

当账户集合、排序依据或动作类型不明确时，使用以下优先顺序。

1. 用户明确请求、点名的账户名单、负责人范围、区域、排序依据或明确说明的偏好
2. CRM 支撑的开放管道，或用户提供的等效 CRM 账户真相
3. 具有有来源支撑的“为什么是现在”信号、清晰的 net_new 或扩展分支，以及可达主要联系人的账户
4. 具有重要交易价值、时间安排、动能、风险或可执行性的账户
5. 没有进行中动作、存在重复外联风险、归属不明确或有其他硬性抑制条件的账户
6. 符合销售代表所述产能窗口的账户

默认把宽泛请求落在开放管道交易上，按时间安排、动能、风险和可执行性调整后的交易价值 / ACV 排序，并采用混合动作目标。不要仅凭数据丰富、公开上下文、日历或消息构建候选范围。

## 关键依赖类别

如果可以的话，使用**所有**这些类别是**关键**的——只要有任何相关的插件或连接器可用，以确保高质量的回答。如果用户拒绝，或连接器不可用，请在最终回答中说明该限制。你也可以按需使用其他相关连接器。

- [Blocking] ~~CRM 用于账户真相、归属、客户状态、商机、阶段、金额、预测态势、联系人和近期活动。除非权威的账户范围与账户真相已在上下文中落地，否则它会阻塞。
- ~~Calendar 用于抑制进行中的动作和判断时间安排
- ~~Meeting Transcripts 用于异议、采购流程和利益相关方的连续性
- ~~Email 用于近期互动和承诺的后续步骤
- ~~Internal Messaging 用于重复动作、阻塞项和负责人
- ~~Knowledge & Files 用于 ICP 指引、目标名单、区域规则、账户计划、销售剧本和抑制约定
- ~~Sales Intelligence 用于匹配度、可联系性、技术栈、融资、招聘，以及 CRM 锚定账户集合后有来源支撑的“为什么是现在”上下文

## 总体规则

- 在有可用链接时，始终用超链接引用来源。
- 来源必须列出每个重要依赖类别、其状态，以及它是否影响了建议。
- 以账户为主要工作单元，宁可给出更少可执行的行，也不要嘈杂的清单。
- 把每个账户放在 Suggested Focus、Monitor 或 Suppress Or Block 三者之一。当某个账户既有可执行工作又有抑制因素（例如重复外联风险）时，保留在 Suggested Focus 并在那里描述受限的动作；只有在当前不应采取任何销售代表动作时才使用 Suppress Or Block。
- CRM 拥有账户范围和账户真相。其他来源可以在范围锚定后做补充、抑制或重新排序。
- 在 CRM 锚定账户集合后，日历、会议笔记、消息、文档和 Sales Intelligence 可以改变时间安排、抑制、联系人选择、置信度或“为什么是现在”上下文；它们不得创建或覆盖账户范围。
- 绝不编造联系人、紧迫性、商机态势、“为什么是现在”信号、归属或账户事实。
- 在本工作流中不要执行外联、创建记录、更新 CRM 或发送消息，除非用户明确要求单独且已批准的动作。
- 当某一行可能被抑制、阻塞、监控或通过回退通道恢复时，使用 references/suppression-and-fallbacks.md。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 对某个选中的账户采取下一个合乎逻辑的动作，例如起草消息、准备内部请求或解除某项依赖。
- 起草可供 CRM 使用的更新供评审，以修正影响排序的缺失、过时或矛盾字段。
- 当下一步动作依赖缺失上下文时，更深入地研究某个选中的账户。
- 根据用户的指导，细化排序、抑制规则或动作目标。
- 检查是否已存在相匹配的每周自动化，针对同一账户集合重跑本 `prioritize-accounts` 技能；若不存在，提出创建一个，让销售人员获得每周账户工作清单，包含“为什么是现在”上下文和安全的下一步动作。

应避免的后续步骤：
- 全面外联、批量写入 CRM，或未经用户明确指示就对整个排序名单采取行动。

### 自动化建议防护

对于实质性的排序输出，当用户拥有可复用的账户集合、负责人范围、区域、管道视图、目标名单或点名观察名单时，每周账户优先级简报就是首选的自动化建议。用销售语言表述其价值：决定把这一周花在哪里、哪些账户进入了关注范围、哪些应被监控或抑制，以及在不造成重复外联或 CRM 反复变更的前提下，什么下一步动作是安全的。

自动化必须是对本技能的定时重跑，而不是另一套自定义摘要。创建或描述该自动化时，让提示词直接调用本技能，并保持相同的账户范围和排序意图：

```text
Use the Sales `prioritize-accounts` skill.
Rerun it weekly for the same seller account set: [owner scope, territory, pipeline view, target list, or watchlist].
Return the standard Account Action View when source links are available; otherwise return the Chat Fallback output.

account_set: "[same resolved account set]"
ranking_basis: "[same ranking basis or motion goal]"
motion_goal: "[net_new, expansion, mixed, or user-specified]"
suppression_rules: "[same known suppression rules when relevant]"
```

周期性输出应遵循本技能的账户优先级契约：Suggested Focus、Monitor、Suppress Or Block、Evidence Gaps 和 Source & Run Details。保持只读；它可以建议账户动作、待起草的消息或供评审的 CRM 更正，但不得执行外联、创建记录、更新 CRM 或发送消息，除非用户另行要求并批准。

在提供每周账户优先级简报之前，检查用户是否已安装了相匹配的本地自动化。查看 `$CODEX_HOME/automations/*/automation.toml` 下的本地自动化记录，或在 `CODEX_HOME` 未设置时查看 `~/.codex/automations/*/automation.toml`，并按名称、提示词、技能名、频率、账户集合、负责人、区域、管道视图、排序依据、动作目标或其他稳定范围细节进行匹配。将启用中和已暂停的匹配都视为已安装。

- 如果存在匹配的自动化，不要再建议创建另一个。继续提供下一个最相关的非自动化后续动作。
- 如果不存在匹配的自动化，以一个明确的建议结束：检查/创建针对同一范围的 `prioritize-accounts` 每周重跑。将周期性输出描述为可直接供销售人员使用的每周工作清单，包含要聚焦的账户、要监控的账户、要抑制的账户、各自的重要性以及建议的下一步动作。在用户明确同意之前，不要创建或更新该自动化。
- 如果自动化能力不可用，不要提及工具细节；在自动化可用时，提出帮助搭建周期性的账户优先级简报。

## 模式

### 1. 账户行动视图

- 只要存在稳定的已连接来源或真相来源链接，这就是必需的默认模式。
- 不要仅因候选集很小、结果能放进聊天，或某些链接需要根据连接器返回的可信组织或实例基础 URL 构造，就选择聊天回退。
- 用于实质性的排序运行，当 CRM、另一个可搜索的已连接来源或稳定的真相来源链接能打开有用的行上下文时。
- 构建 Work now、Watch、Paused、Evidence Gaps 和 Source & Run Details。把 Suggested Focus 映射到 Work now、Monitor 映射到 Watch、Suppress Or Block 映射到 Paused，使面板与聊天速览在语义上保持完全一致。
- 完全按原样使用内置模板：

  `assets/account-priority-pane.template.html`

- 该模板是独立的 UTF-8 HTML，仅使用内联 CSS 和浏览器 JavaScript。它没有外部资源、没有脚本导入、没有 npm 依赖、没有 Node 依赖，也没有辅助脚本。
- 不要内联、重写、重新设计样式、摘要或重新组合该模板。唯一允许的 HTML 变更是用下述转义后的负载替换其确切的数据占位符。

#### 视图生成规则

- 只要存在稳定的已连接来源或真相来源链接，就生成该视图。粘贴的无链接名单保留在聊天中，除非用户明确要求离线视图。
- 在适合操作系统的临时目录中生成一个本地文件：
  - macOS/Linux：`${TMPDIR:-/tmp}/prioritize-accounts/index.html`
  - Windows：`%TEMP%\prioritize-accounts\index.html`
- 使用 Work now、Watch、Paused、Evidence Gaps 和 Source & Run Details 构建账户行动包。
- 将三个账户分组分别序列化到 `workNow`、`watch` 和 `paused` 之下。
- 为每个账户行提供负载 schema 要求的、面向销售人员的字段：`rank`、`account`、`motion`、`stage`、`value`、`whyItMatters`、`nextAction`、`owner`、`dueDate`、`confidence` 和 `status`。在有据且可用时包含 `accountUrl`、`primaryContact` 和 `evidence`。
- 保持行文案足够紧凑以便扫读：`whyItMatters` 应在一两句短句中说明时间、价值、动能或风险，`nextAction` 应点明一个可立即执行的安全动作、观察触发条件或解除阻塞的步骤。
- 绝不编造展示字段。当已连接来源未提供价值、负责人或截止日期真相时，使用 `Value unavailable`、`Unassigned` 或 `No date set`。
- 将同一个包序列化为严格符合 `references/template-payload.schema.json` 的 JSON。把该 schema 的必需根键和账户行字段视为权威的负载契约。
- 替换每个 `<` 为 `\u003c`，以便安全地把 JSON 嵌入 script 标签。
- 用转义后的 JSON 替换确切的模板占位符 `__PRIORITIZE_ACCOUNTS_DATA_JSON__`。
- 将生成的 HTML 以 UTF-8 写入本地输出路径。
- 检查生成的文件中不残留未解析的占位符。
- 在最终回答中先返回实际可点击的视图链接，随后是简短摘要和建议的下一步。不要在面向 Windows 的输出中硬编码仅 macOS 可用的 `/private/tmp`。若给出 `file://` URL，请对空格进行 URL 编码。
- 如果本地文件链接在客户端中无法打开，仅在必要时自行启动一个极小的本地 HTTP 服务器，并返回 localhost URL。
- 在常规的面向用户文案中，不要提及模板、JSON、占位符、本地文件或 HTML 实现机制。

### 2. 聊天回退

- 当没有可用的来源搜索/链接、无法创建本地视图、用户要求纯文本，或上级流程要求仅聊天输出时使用。
- 当缺失来源/链接条件导致回退时，说明为何跳过账户行动视图。

#### 输出格式

```md
# Prioritize Accounts

## Suggested Focus

| Account | Why Now | Primary Contact | Secondary Contact | Opp Recommendation | Suggested Next Step | Sequence Angle | Confidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Account + source link] | [Grounded timing reason] | [Name + role] | [Name + role or None] | [Practical recommendation] | [Immediate rep action] | [Compact outreach hook] | [High/Medium/Low] | [ready_now/partial] |

## Monitor

| Account | Reason To Monitor | Trigger To Revisit | Status |
| --- | --- | --- | --- |

## Suppress Or Block

| Account | Suppressor Or Blocker | Evidence | Status |
| --- | --- | --- | --- |

## Sources

- [Sources that were included in the analysis]
- [Sources that were not included, why, and potential next steps to resolve]

## Source & Run Details

- **Account set:** [Resolved set]
- **Ranking basis:** [Visible rule]
- **Source of truth:** [CRM or CRM-equivalent source]
- **Motion goal:** [net_new / expansion / mixed]
- **Sources checked:** [Sources]
- **Assumptions:** [Assumption-based only when applicable]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```
