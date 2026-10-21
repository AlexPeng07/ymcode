---
name: plan-deal-strategy
description: 当用户需要针对某一活跃交易、续约、谈判、采购流程，或针对某个报价或产品的初始销售动作制定策略时使用。构建有据可依的交易地图或实用的销售计划，包含异议、次序、态势和排定优先级的后续动作。对于多账户、当天的客户通话队列，请改用 prepare-for-meeting。 | deal strategy, negotiation, buying committee, procurement risk, next actions
---

# 规划交易策略


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

把活跃交易的证据或清楚提供的报价上下文，转化为推进销售或塑造初始销售动作的实用策略。本技能负责交易地图、采购委员会、谈判态势、异议、次序和行动计划；它不是首次通话准备、以数据为先的潜客开发或回写流程。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

这些类别对本工作流尤为重要；仅当其他来源能实质改善策略时才使用它们。

- [Blocking] ~~CRM 用于权威的账户与商机身份、阶段、金额、成交日期、负责人、联系人和近期活动。除非已足够有据的交易真相已在上下文中，否则它会阻塞默认的活跃交易策略路径。
- ~~Meeting Transcripts 用于利益相关方用语、异议、承诺、决策、采购信号和通话连续性
- ~~Email 用于面向客户的推进、审批、谈判、法务/采购往来和未答复的请求
- ~~Internal Messaging 用于内部阻塞项、负责人对齐、升级路径和执行风险
- ~~Knowledge & Files 用于账户计划、共同行动计划、实施文档、风险日志和策略产物
- ~~Calendar 用于即将到来的决策论坛、高管会议、采购/法务里程碑和时间压力
- ~~Sales Intelligence 仅在交易已锚定后能锐化对利益相关方或公司的假设时使用

保持 ~~CRM 对 CRM 拥有的交易真相具有权威性。支撑来源会锐化风险、利益相关方、时间和动作；它们不会凭空创造或覆盖阶段、金额、负责人、成交日期或活跃交易的存在。

## 参考资料加载

`SKILL.md` 负责常规的交易策略流程和输出包。只有当参考资料的额外细节确有必要时才加载：

- 当需要结构化输入、旧版别名、模式枚举、阶段提示、时间窗口边界或种子证据归一化时，使用 [references/request-schema.yaml](references/request-schema.yaml)。
- 当风险类型、严重度、可能性、置信度、优先级或缓解字段不明确时，使用 [references/risk-rubric.md](references/risk-rubric.md)。

## 工作流指引

### 1. 资格判断并选择模式

- 仅当存在活跃账户、商机、续约、采购流程，或发现之后足够详细的交易上下文时才使用。
- 收集足够证据以识别当前的交易动作，以及至少一个阻塞项、利益相关方问题或下一步需求。如果锚点充分但证据稀薄，产出低置信度的材料包并明确列出缺口，而不是编造细节。
- 如果请求是首次通话准备且此前证据很少，在存在会议锚点时路由到 `prepare-for-meeting`；否则索取基础账户上下文，并提供轻量的手工准备。
- 默认使用 `Full Strategy Pack`。如果用户只要求某一件产物，就使用对应的局部模式，并把调查范围限定在该产物内。

### 2. 确定交易锚点

- 从用户点名的账户、商机、续约、举措、链接或笔记开始。
- 接受 `sfdc_account_id` 作为 `crm_account_id` 的旧版别名。
- 在可用时，先用 ~~CRM 识别账户，以及最匹配所点名产品、解决方案、续约、利益相关方、时间和近期活动的商机。
- 如果用户要求交易策略但没有提供账户、商机、续约、举措、链接或笔记，先用 ~~CRM 搜索、排序，并通过 `ask_user_input()` 提供最多五个具体的当前商机候选。对于“为我最合适的当前商机规划交易策略”这类空泛调用，不要假设目标；提供由连接器支撑的候选，并在广泛丰富或起草之前请用户选择。
- 从所选商机名称、产品或解决方案术语、活动标题和用户措辞构建一小组别名。用它来验证相关的会议、讨论串和文档，并排除同账户但属于不同交易动作的产物。
- 如果仍有多个可能的交易，最多做三次来源读取，通过 `ask_user_input()` 提供最多五个具体候选，然后请用户在广泛丰富之前选择。如果只剩一个推断出的候选，在广泛丰富或起草之前通过 `ask_user_input()` 请用户确认。
- 如果 CRM 不可用但用户提供的证据足够，继续并在结果中明确 CRM 缺口。不要把同账户但属于其他商机的证据当作所选交易动作的证明。

### 3. 按通道收集证据

- 使用所选账户和交易动作的别名，在 ~~Meeting Transcripts、~~Email、~~Internal Messaging、~~Knowledge & Files 和 ~~Calendar 中查找相关的近期证据。
- 优先使用最窄的相关窗口；除非用户提供其他窗口，默认取最近 90 天。
- 不要求用户事先提供转录、讨论串或文档链接；使用所选账户和交易动作的别名去发现相关产物。
- 阅读到足以支撑当前动作、利益相关方态势、采购风险和下一步动作即可。如果第一个同账户产物属于另一个交易动作，在有下一个定向结果时继续；否则跳过它、标注缺口，或请用户选择。
- 将每条通道记录为可用、不可用、为空、过时、冲突或仅用户提供。在核心策略得到支撑后就停止；不要为不可用的来源真相追逐间接替代品。

### 4. 构建策略

- 构建简洁的交易地图：举措、目标成果、动作/时间线、活跃工作流、在有证据时会影响交易执行的近期账户或服务上下文、阻塞项和依赖。
- 从有证据的人和角色构建采购委员会。使用角色 `economic_buyer`、`decision_maker`、`champion`、`influencer`、`blocker`、`procurement`、`legal`、`security` 或 `unknown`；立场 `supportive`、`neutral`、`skeptical`、`blocking` 或 `unknown`；影响力 `high`、`medium`、`low` 或 `unknown`。对推断出的角色、立场或影响力标注 `Inference:`。
- 构建采购风险，包含严重度、可能性、置信度、负责人或建议负责人、缓解措施、时间和来源。当分类或优先级不明确时，加载 `references/risk-rubric.md`。
- 默认产出 5-7 个高信号动作。每个动作都需要负责人或建议负责人、截止日期或 `TBD`、预期结果、关联的风险/利益相关方，以及来源。

### 5. 将证据与推断分开

- 在有可用来源链接时行内引用；只有在没有稳定链接时才使用纯文本来源标注。
- 不要把会议加入 URL、通用房间 URL 或不透明的连接器 id 作为证据链接。
- 如果证据冲突，降低置信度并补充一条证据缺口，而不是强行得出结论。
- 仅在直接有证据时才使用确切日期和已确认的客户端负责人。否则使用相对时间、`TBD` 或 `Suggested owner:`；当置信度低或证据稀薄时，避免精确到日的截止日期。
- 仅在交易锚定后、能锐化对公司或利益相关方假设时，才使用公开或用户提供的市场上下文。将其视为支撑性上下文，绝不是硬性依赖，也不能覆盖账户/交易真相。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 将排定优先级的动作转化为共同行动计划或执行跟踪表。
- 围绕风险最高的决策，准备下一次客户、合作伙伴或内部会议。
- 起草针对具体利益相关方的邮件或 Slack 话术供评审。
- 起草可供 CRM 使用的商机更新供评审。
- 在证据仍然稀薄之处，深入某一个阻塞项、利益相关方或采购风险。

应避免的后续步骤：
- 未单独明确请求就发送消息、更新 CRM 或创建下游产物。

## 模式

- `Full Strategy Pack` —— 默认；返回下方每个章节。
- `Deal Map Only` —— 返回交易快照、交易地图、证据缺口和推断说明。
- `Buying Committee Only` —— 返回交易快照、采购委员会地图、证据缺口和推断说明。
- `Procurement Risk Only` —— 返回交易快照、采购风险登记表、证据缺口和推断说明。
- `Next Actions Only` —— 返回交易快照、排定优先级的后续动作、证据缺口和推断说明。

## 输出格式

对于完整的策略包，按以下确切顺序返回章节。

```md
# Deal Strategy: [Account / Opportunity]

## Deal Snapshot

- **Account:** [Name + source]
- **Opportunity:** [Name or Unknown]
- **Stage:** [CRM-backed value or Unknown]
- **Close Date:** [Evidenced date or Unknown]
- **Time Window:** [Window]
- **Run Mode:** [Mode]
- **Coverage Summary:** [Available, unavailable, empty, stale, or user-provided-only lanes]

## Deal Map

- **Initiative:** [Business initiative]
- **Target Outcome:** [Customer/business outcome]
- **Current Motion:** [Stage, timeline posture, and deal movement]
- **Active Workstreams:** [3-6 grounded bullets]
- **Top Blockers or Dependencies:** [Up to 5 grounded bullets]

## Buying Committee Map

| Stakeholder | Title | Org | Role | Stance | Influence | Last Signal | Confidence | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Name] | [Title] | [Org] | [Role] | [Stance] | [Influence] | [Signal] | [High/Medium/Low] | [Link/label] |

## Procurement Risk Register

| Risk ID | Risk Summary | Risk Type | Severity | Likelihood | Owner or Suggested Owner | Mitigation | Target Date | Confidence | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | [Risk] | [Type] | [High/Medium/Low] | [High/Medium/Low] | [Owner] | [Step] | [Date/TBD] | [High/Medium/Low] | [Link/label] |

## Prioritized Next Actions

1. **Action:** [Concrete action]
   - **Owner or Suggested Owner:** [Owner]
   - **Due:** [Date, relative timing, or TBD]
   - **Linked Risk IDs:** [IDs or None]
   - **Linked Stakeholders:** [Names or None]
   - **Expected Outcome:** [Outcome]
   - **Source:** [Link/label]

## Evidence Gaps

- **Gap:** [Material missing/conflicting evidence]
  - **Impact:** [How confidence or execution is affected]
  - **Smallest Next Collection Step:** [Most efficient way to close it]

## Inference Notes

- Inference: [Claim inferred rather than directly stated, with basis]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 规则

- 不要编造利益相关方、审批、阻塞项、负责人、承诺、金额、阶段、成交日期或确切日期。
- 将事实与推断分开；省略空的推断说明，而不是用填充内容凑数。
- 宁可给出更少但有力的动作，也不要泛泛的建议，并优先处理最可能阻碍签署或导致时间滑落的风险。
- 在常规输出中使用人类可读的 Title Case 标签；只有当用户要求 JSON 或 YAML 时才使用机器可读的键。
- 保持本工作流只读。除非用户在后续步骤中明确要求，不要更新 CRM、发送消息、发布纪要或创建下游产物。
- 如果证据稀薄但交易锚点充分，产出带明确缺口的低置信度材料包，而不是停下。

## 失败处理

如果不存在可信的活跃交易锚点，说明阻塞点，在可用时提供具体候选，并索取最小的缺失输入。如果可选通道不可用，就用最强的有据证据继续，并让由此产生的置信度限制清晰可见。
