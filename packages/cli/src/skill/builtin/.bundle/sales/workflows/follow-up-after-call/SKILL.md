---
name: follow-up-after-call
description: "在完成客户、潜客、合作伙伴或重要内部销售通话、发现会、演示或对话之后使用，包括用户提供或上传转录、笔记、录音摘要或其他有据证据的情形。就后续动作给出建议、评估、资格判断、纪要，并产出可直接供销售人员使用的后续动作与草稿。 | call follow-up, post-call recap, meeting notes, action items, CRM next step"
---

# 通话后跟进


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

把有据可依的通话证据转化为销售人员可直接使用的跟进包，保留真实说过的内容、让归属可见，并提供可立即使用的文案。本技能负责通话后的综合与草稿；它不发送、不发布、不创建邮件草稿，也不更新 CRM。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

这些类别对本工作流尤为重要；仅当其他来源能实质改善交付包时才使用它们。

- [Blocking] ~~Meeting Transcripts 用于主转录、有据笔记、参与者用语、决策、承诺、异议和来源链接。它会阻塞默认的实时来源跟进路径；已在上下文中的明确有据通话证据即可满足需求。
- ~~Calendar 用于识别近期通话、参会人、时间安排和即将到来的相关会议
- ~~CRM 用于账户、商机、联系人、负责人和可供 CRM 使用的下一步上下文
- ~~Email 用于面向客户的讨论串上下文，当通话证据或承诺的跟进存在于其中时
- ~~Internal Messaging 用于内部账户上下文，以及团队纪要的安全建议去处
- ~~Knowledge & Files 用于导出的转录、通话笔记、账户笔记和跟进资产

有据的通话证据是必需的。CRM、日历、文件和消息可以充实交付包，但不能替代转录、有据笔记，或记录了该通话的客户往来讨论串。如果证据缺失、过时或相互冲突，说明限制，而不是重建这次通话。

## 参考资料加载

`SKILL.md` 负责常规的证据优先流程、聊天优先的草稿行为和输出包。只有当参考资料的额外细节会改变决策时才加载：

- 当需要归一化结构化输入、相对通话日期、会议录音标识符或回退证据路径时，使用 [references/request-schema.yaml](references/request-schema.yaml)。
- 当商机排序或内部去处是否安全不明确时，使用 [references/opportunity-and-channel-selection.md](references/opportunity-and-channel-selection.md)。

## 工作流指引

### 1. 确定通话与证据

- 如果用户提供了转录、笔记、链接或清楚标识的通话，就从那里开始。
- 如果通话确定路径不清晰，通过 `ask_user_input()` 询问用户。对于“跟进我的通话”这类空泛调用，不要假设某场会议；提供：
  - `Use my most appropriate recent grounded call`
  - `Use a call, account, attendee, or date I specify`
  - `Use transcript or notes I provide`
- 对于“我最近的通话”“今天的通话”“今天早些时候”“昨天”“上周”“我最合适的近期会议”，或未给出来源的点名账户，把该措辞视为可检索的锚点：在 ~~Calendar 和 ~~Meeting Transcripts 中搜索最窄的近期窗口，然后通过 `ask_user_input()` 提供最多五个具体候选。在用户选定之前，不要检索更深的上下文或起草交付包。
- 当通话或账户锚点不明确时，最多做三次来源读取以产出具体候选；在用户选择之前不要做广泛的数据丰富。
- 把类似公司名的歧义名称、合作伙伴名称和账户简称视为可能的账户锚点。当 ~~CRM 可用且账户身份会影响检索哪次通话时，使用有边界的 ~~CRM 查询来消除账户歧义，然后再依赖较弱的账户上下文；它绝不能替代有据的通话证据。
- 如果只剩下一个看似合理的有据候选，在起草前通过 `ask_user_input()` 请用户确认。如果找不到任何有据证据，就索取转录、笔记或具体通话，而不是根据周围的账户上下文生成纪要。
- 把粘贴的笔记、上传文件和用户链接的材料视为有效的工作证据；在无法核实的情况下将其标注为用户提供。

### 2. 只收集有用的补充信息

- 按以下顺序优先采用有据证据：~~Meeting Transcripts 转录；可检索的会议录音转录；其他导出的转录；粘贴的转录或有据笔记；~~Knowledge & Files 会议笔记；最后才把 ~~Email 讨论串或消息作为补偿通道。
- 直接获取用户提供的通话或转录句柄。否则用账户加日期或时间范围、以及最多两个会议主题词进行搜索，然后获取最佳匹配。
- 将补充的真相来源、通话笔记或转录链接与主证据并排保留，而不是替换主证据。
- 对于外部账户通话，在可用时使用 ~~CRM 解析相关账户或商机，并锐化姓名、商业上下文和一句话的 CRM 下一步。
- 当时间安排会改变下一步时，检查 ~~Calendar 中是否有相关的即将到来会议。仅在能补充承诺动作、阻塞项、负责人、链接或去处上下文时，才使用 ~~Email、~~Internal Messaging 和 ~~Knowledge & Files。
- 如果转录明确提到某个可能影响跟进的会议或文件，就用确切的标题和可用日期在 ~~Calendar 或 ~~Knowledge & Files 中做一次定向查找。找到就附上链接；否则说明在所检查的来源/窗口内未找到，而不是声称不存在这样的会议或文件。
- 一旦交付包有据可依，且最有价值的账户/时间上下文已覆盖，就停止；点名缺失的补充信息，而不是继续广泛搜索。

### 3. 归类通话并提取承诺

- 判断该通话是面向外部客户/合作伙伴，还是内部通话。对外邮件文案和 CRM 文本仅适用于外部通话。
- 提取决策、承诺、请求、异议、阻塞项、负责人和日期。当证据无法确定时，使用 `Unknown` 或 `TBD`。
- 如果有多个 CRM 商机都可能，选择与通话主题、参会人、产品、时间安排和近期活动相匹配的那个。如果没有可信的，就让 CRM 那句话保持通用，并追加 `(paste into the relevant opp)`。
- 当商机意图、候选排序或最安全的内部渠道不明显时，使用 [references/opportunity-and-channel-selection.md](references/opportunity-and-channel-selection.md)。

### 4. 在聊天中起草

- 默认在聊天中返回交付包，即使有可用的邮件或内部渠道。
- 不要在本工作流中创建邮件草稿、发送外联、发布内部消息或写入 CRM。
- 将逐字的邮件与内部消息文案保留在 Markdown 引用块中，便于销售人员审阅和复制。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 根据用户的指导，细化对外邮件、内部纪要、CRM 语句或行动清单。
- 当用户明确要求时，创建经过评审的邮件草稿，或发布经过评审的内部纪要。
- 把经过评审的纪要和行动项添加到现有的会议笔记，或创建新的跟进笔记。
- 准备可供 CRM 使用的更新供评审。
- 检查是否已有相匹配的自动化，若不存在则提出创建一个；若已存在，提出审阅或调整它。

应避免的后续步骤：
- 在用户评审并明确要求之前发送、发布或更新 CRM。

### 自动化建议防护

始终把跟进自动化作为输出末尾的下一步建议，除非已存在相匹配的自动化。如果输出识别出自然的时间锚点，例如下一次会议、跟进日期、客户决策日期或约定的回访，就在建议中使用该时间；否则提出帮助选择触发条件或频率。把自动化表述为本技能的定时重跑，而不是自定义摘要：它应尽可能使用相同的通话/账户锚点，并返回标准的跟进包，包含纪要、行动项、对外文案、可供 CRM 使用的文本和内部纪要。

在以自动化建议结束之前，检查是否已存在相匹配的本地自动化，位于 `$CODEX_HOME/automations/*/automation.toml` 下，或在 `CODEX_HOME` 未设置时位于 `~/.codex/automations/*/automation.toml` 下。按提示词、技能名、账户、会议标题、参会人、商机、触发时间或其他稳定范围细节进行匹配。将启用中和已暂停的匹配都视为已安装。

- 如果存在匹配的自动化，提出审阅或调整它，而不是再创建一个。
- 如果不存在匹配的自动化，以一个明确的创建建议结束，把输出描述为在下次通话之后或约定的跟进时间产出的、可直接供销售人员使用的跟进包。在用户明确同意之前，不要创建或更新该自动化。
- 如果自动化能力不可用，避免提及工具细节，只需提出在自动化可用时帮助搭建周期性或定时的跟进检查。

## 模式

### 1. 完整跟进包

当用户要求通话后跟进时的默认模式。按顺序返回以下每个章节。

### 2. 聚焦草稿

当用户只要求邮件、内部纪要、CRM 备注或提取下一步时使用。仍要以通话证据为基础；返回所请求的章节，加上简洁的 `Call Summary`、重要缺口和状态行。

## 输出格式

常规交付包使用加粗的章节标签，而不是顶层标题。

```md
**Call Summary**

- **Primary evidence:** [Clickable transcript/notes link or source label]
- **TL;DR:** [2-4 grounded bullets]
- **Context / Goal:** [Why the call happened]
- **Key Points:** [Important customer/internal signals]
- **Decisions / Commitments:** [What was agreed]
- **Risks / Blockers:** [What could slow follow-through]

**Next Steps**

**Customer**
- [ ] [Action] — [Owner or Unknown] — [Due date or TBD] — [Notes]

**Seller**
- [ ] [Action] — [Owner or Unknown] — [Due date or TBD] — [Notes]

**External Comms**

Subject options (recommended first):
1. [Subject]
2. [Subject]
3. [Subject]

Recommended subject: [Subject]

> Hi <FirstName>,
>
> [150-220 word grounded follow-up email]
>
> Best,
> [Seller]

Draft link: Not created; copy drafted in chat only.

**CRM Next Steps**

[Exactly one sentence with call date, seller action, customer action, and outcome/success criterion.]

**Internal Follow-Up**

Suggested destination: [Safe internal channel/link, or “No verified internal channel found”]

> **[Meeting title]**
>
> [One concise summary paragraph]
>
> **Attendees:** [Names or Unknown]
>
> **Key Notes**
> - [Grounded note]
>
> **Decisions**
> - [Decision or None confirmed]
>
> **Action Items**
> - [Action] — [Owner or TBD] — [Due date or TBD]
>
> **Open Questions / Risks**
> - [Question or risk]
>
> **Source**
> - [Clickable call-notes/transcript link, or no useful link available]

No email draft, Slack post, or CRM update was created.

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 输出规则

- 偏向决策、风险、后续步骤、采购流程、采购事项、技术阻塞项和利益相关方的动向。
- 对于内部通话，在 `External Comms` 和 `CRM Next Steps` 两部分下都原样写 `Not applicable: this was an internal call.`；不要起草对外文案。
- 保持对外邮件简洁、对客户安全，且不含敏感的内部用语。绝不编造收件人、承诺、定价、日期或草稿链接。
- 将 CRM 文本严格限制为一句话。对于未确定的商机，追加 `(paste into the relevant opp)`。
- 仅当某个内部去处看起来是内部且相关时才建议它。如果渠道安全性不明确，说明发布前需先核实；绝不编造渠道 URL。
- 在声明不存在已验证的内部去处之前，当该来源可用时，先在 ~~Internal Messaging 中针对账户、会议标题或工作流搜索一次。
- 在有可用链接时使用有用的可点击来源链接，并点名会实质降低置信度的来源缺口。
- 默认提供一份合并的内部纪要；仅当用户要求，或已核实渠道的惯例要求时，才拆分为顶层消息加讨论串。
- 当所选应用支持时，对参会人和负责人使用原生 @ 提及；否则使用可读姓名。
- 内部草稿不要使用 `##` 标题。其开头的摘要应点明发布路径、业务影响、决策点或主要跟进主题，且不要重复 TL;DR。
- 保持内部纪要简洁、去重、面向团队；包含负责人或 `TBD`，而不是暗示归属。
- 除非用户明确要求不同的状态格式，否则在 `Internal Follow-Up` 之后始终附上上面的纯文本状态行。

## 失败处理

如果通话无法有据可依，用一行说明阻塞点，说明需要什么证据，并只返回安全的局部材料，例如候选通话或空白的填写结构。如果可选的补充信息不可用，仍产出有据的交付包，并标注缺失的通道。
