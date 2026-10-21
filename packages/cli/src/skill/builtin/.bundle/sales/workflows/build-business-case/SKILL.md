---
name: build-business-case
description: 评审商业提案，并构建以客户为主导的商业论证、ROI 或价值模型、定价或投资理由、高管摘要，以及围绕客户、工作流、举措或决策的、可直接面向客户的价值叙事。 | business case, ROI model, value story, executive summary, pricing rationale
---

# 构建商业论证

把参差不齐的账户证据，转化为以客户为主导、对决策有用的价值论证。本技能负责商业论证的逻辑与草稿；它不是通用的产品定位、演示设计流程或回写流程。

从客户出发，而不是从产品出发。每次运行都遵循以下链条：

`customer context -> account-native anchor -> workflow -> use case -> value drivers -> metrics -> quantified impact -> narrative -> public research when useful`

如果证据不足以支撑可信的计算，就产出一份清晰标注的结构性论证，以及使其达到财务可用所需的最小验证计划。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

仅使用能实质性改善论证的通道。

- [Blocking] ~~CRM 用于权威的账户、商机、负责人、阶段、金额、成交时间、联系人和商业上下文。除非权威的账户与商业上下文已落地，否则它阻塞针对具体客户/账户的论证；通用场景类论证可以在没有它的情况下继续。
- ~~Meeting Transcripts 用于发现证据、利益相关方用语、工作流痛点、异议、量化主张、决策和验证缺口
- ~~Knowledge & Files 用于账户计划、来源包、发现笔记、既往价值论证、论据和账户原生指标
- ~~Sales Intelligence 仅在能补齐某个具体证据缺口时使用公司、匹配度、利益相关方或市场上下文

仅在公开研究能锐化战略优先级、高管措辞、经营压力或“为什么是现在”时才使用它。优先采用公司自述、投资者、监管等一手来源。绝不让公开或补充信息取代客户确认的痛点、工作流指标、决策流程或 CRM 拥有的真相。

## 参考资料加载

`SKILL.md` 负责常规的以客户为主导的流程、证据顺序、防护规则和默认交付包。只有当参考资料的额外细节确有必要时才加载：

- 当输入参差不齐、用户指定了输出模式，或完整的必需内容契约很重要时，使用 [references/input-and-output.md](references/input-and-output.md)。
- 当复杂论证需要展开的“客户到价值”序列与示例时，使用 [references/workflow.md](references/workflow.md)。
- 当量化、置信度标注、证据冲突或价值桶逻辑需要更多细节时，使用 [references/value-model-and-evidence.md](references/value-model-and-evidence.md)。
- 仅在需要格式化产物、精确的演示/输出要求或行为测试时，使用 [references/output-and-presentation.md](references/output-and-presentation.md)。

## 工作流指引

### 1. 确定客户与决策锚点

- 需要有客户/账户/场景，以及工作流、举措、痛点、指标目标或决策背景。当粘贴的笔记、链接、导出内容或一个锚定清晰的对话线程已足够时，可据此继续。
- 如果推断出的必需锚点存在歧义，最多使用三次来源读取做一次有边界的尝试，给出最多五个具体候选，并在大规模数据丰富之前请用户选择。
- 把类似公司名的名称视为可能的账户锚点。当 ~~CRM 可用时，先解析账户与匹配的商机，再依赖间接上下文。
- 如果客户与工作流都太弱、无法形成稳定假设，只问最小的澄清问题。

### 2. 先找到账户原生锚点

- 从用户提供的指标、笔记、链接或导出内容开始。否则在广泛搜索之前，先寻找信噪比最高的账户原生产物：精确匹配的 ~~Knowledge & Files 查询，例如 `[customer] business case`、`value case`、`ROI`、`pilot target` 或 `expansion path`；然后是匹配的 ~~CRM 商机；再是相关的 ~~Meeting Transcripts。
- 先获取最强的锚点。高信号锚点包含客户名称、工作流、决策受众、商业利害、指标、紧迫性或注意事项。
- 仅用相邻来源来验证重要缺口，例如工作流痛点、审批路径、预算归属、时间、风险或面向客户的后续动作。
- 保留来自账户原生证据的商业锚点，包括试点金额、扩展路径、目标价值、预算区间、成交时间和付费试点条款。如果 CRM 信息稀薄，保留带来源的事实，并单独点明 CRM 缺口。
  - 示例：`Known from ~~Knowledge & Files source pack: SGD 420K pilot target and SGD 1.8M expansion path. Missing from ~~CRM: opportunity stage, owner, and close date.`
- 当核心论证已得到支撑时就停止第一遍；不要仅因还有更多来源就继续低产出的搜索。
- 对于点名的上市公司，做一次聚焦的公开一手来源梳理，除非用户禁用它，或账户原生锚点已经回答了重要的“为什么是现在”问题。用它来锐化战略优先级和高管措辞，绝不用它拖延首个有用论证，也不要用它替代账户原生的证明。

### 3. 构建客户价值逻辑

- 在点明销售方能力之前，先说清客户目标、经营压力、相关买方或团队、约束以及实际工作流。
- 用商业语言描述工作流：参与者、步骤、交接、瓶颈、工具、KPI，以及理想状态是什么样的。
- 优先选择一到三个用例。对每个用例，说明工作流问题、为何现在重要、谁关心、支撑证据以及仍待验证之处。
- 将每个用例映射到最少的适用价值桶：`Enhanced Productivity`、`Cost Reduction`、`Risk Reduction`、`Revenue Acceleration` 和 `Time to Market`。
- 让因果链显式可见：工作流变化 -> 运营效果 -> 业务成果 -> 指标。

### 4. 只量化证据支持的内容

- 将重要主张和输入标注为 `Known`、`Inferred`、`Assumed` 或 `Missing`。
- 当来源冲突时，使用以下证据顺序：客户提供的指标；产品遥测或使用数据；发现或转录证据；~~CRM、~~Knowledge & Files 或内部账户笔记；公开一手材料；类似赢单或方向性基准。
- 对于财务可用的论证，展示公式、输入、来源/标注、低/基准/高三档情景、注意事项和置信度。有用的公式模式包括：
  - 生产力：`users x tasks per period x time saved per task x labor cost x adoption rate`
  - 成本：`current cost baseline - future cost baseline`
  - 风险：`incidents avoided x average cost per incident x confidence factor`
  - 营收：`impacted revenue pool x improvement rate x confidence factor`
  - 上市时间：`cycle-time reduction x value of earlier release or deployment`
- 如果缺少必需输入，就让计算保持结构化：展示公式、标出缺失输入、说明能给出的方向性判断，并列出使其达到财务可用所需的最小问题集。

### 5. 起草对决策有用的交付包

- 将运营影响转化为客户的业务成果，然后解释为什么销售方方案适配该工作流与买方需求。
- 将公开的战略背景与账户原生的证明分开。类似赢单只能作为假设的支撑，绝不能当作该客户的证明。
- 在有可用链接时，用可点击链接引用重要主张；只有在没有稳定链接时才使用纯文本来源标注。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 根据用户的指导改进论证，或补齐最小的关键验证缺口。
- 产出一份可直接面向客户的高管摘要或价值叙事供评审。
- 产出一份拥护者话术或内部账户团队备忘录供评审。
- 构建价值模型表格或可直接用于电子表格的模型结构。
- 内容评审后，将论证转化为简洁的会议预读材料或决策文档。

应避免的后续步骤：
- 在用户评审内容并明确要求之前，保存、分享、发布、创建文档或更新系统。

## 模式

- `Default Package` —— 下方完整的商业论证。
- `Structural Case` —— 当客户与工作流清晰、但缺少可信的量化输入时使用。
- `Finance-Ready Case` —— 当带来源的输入能够支撑公式和低/基准/高三档情景时使用。
- `Focused Output` —— 当用户只要求高管摘要、ROI 表格、客户可用叙事、差异化要点或验证问题时使用；附带简洁的证据状态与缺口。

## 输出格式

默认交付包使用以下结构。

```md
# Business Case: [Customer / Initiative]

## Executive Summary
[Customer objective, why now, priority workflow/use cases, likely value story, seller fit, and confidence.]

## Strategic Initiatives
- [Known/Inferred/Assumed/Missing: initiative + source]

## Key Challenges
- [Customer or workflow challenge + evidence label/source]

## Priority Workflows
- **[Workflow]:** [Actors, bottleneck, KPI, and why it matters]

## Priority Use Cases
1. **[Use case]** — [Problem, buyer/team, why now, evidence, validation gap]

## Value Hypothesis by Use Case
| Use Case | Value Bucket | Causal Chain | Evidence Posture | Confidence |
| --- | --- | --- | --- | --- |
| [Use case] | [Exact bucket] | [Change -> effect -> outcome -> metric] | [Known/Inferred/Assumed/Missing] | [High/Medium/Low] |

## Metrics and Assumptions
| Metric / Input | Value | Label | Source | Why It Matters |
| --- | --- | --- | --- | --- |
| [Input] | [Value or Missing] | [Known/Inferred/Assumed/Missing] | [Link/label] | [Formula role] |

## ROI or Value View
| Use Case | Formula | Low | Base | High | Caveats |
| --- | --- | --- | --- | --- | --- |
| [Use case] | [Formula] | [Value/Structural] | [Value/Structural] | [Value/Structural] | [Gap/confidence] |

## Solution Differentiators
- [Differentiator tied to workflow, buyer need, and expected business effect]

## Proof Points or Analogous Wins
- **Account-native proof:** [Evidence or Missing]
- **Analogous / public support:** [Evidence, clearly not customer proof]

## Caveats and Open Questions
- [Most important validation gap and smallest next collection step]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 规则

- 不要编造客户数字、买方、工作流负责人、工具、审批、商业条款、ROI 或来源链接。
- 不要把公开的战略措辞、基准或类似赢单，变成客户已确认的影响。
- 不要用漂亮的文字掩盖缺失数据；说明该论证是结构性的还是财务可用的，以及原因。
- 优先选择一到三个用例，以及解释该决策所需的最少价值桶。
- 保持本工作流只读。除非用户在后续步骤中明确要求，不要发布、发送、分享、创建文档或更新 CRM。

## 失败处理

如果不存在可信的客户/工作流锚点，说明阻塞点，并请求最小的缺失输入。如果可选通道不可用，就用最强的有据证据继续，并让由此产生的置信度限制清晰可见。
