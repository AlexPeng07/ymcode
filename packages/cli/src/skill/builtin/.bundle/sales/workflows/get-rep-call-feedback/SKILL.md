---
name: get-rep-call-feedback
description: 当用户希望针对某位销售代表的通话获得有证据支撑的辅导时使用，尤其是通过与同侪范例对比，识别可复用的最佳实践、具体的提升时刻和下次通话可用的实用话术。 | rep coaching, call feedback, peer benchmarking, best practices
---

# 获取销售代表通话反馈


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

把有据可依的通话证据转化为针对某位销售代表的实用辅导。本技能将目标代表与相关的同侪范例进行对比，提炼可复用的动作，并把它们映射到目标代表可改进的具体时刻。它只负责辅导速览；不创建评分卡、不发送反馈、不发布消息，也不保存辅导产物。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

这些类别对本工作流尤为重要；仅当其他来源能实质改善通话选取或辅导上下文时才使用它们。

- [Blocking] ~~Meeting Transcripts 用于搜索目标与同侪通话、摘要、转录时刻、说话人上下文、日期、公司和可点击的通话链接。它会阻塞默认的实时来源反馈路径；已在上下文中的明确类转录通话证据即可满足需求。
- ~~Knowledge & Files 用于用户提供或导出的转录、通话笔记、经理示例和既往辅导上下文

行为类主张需要类转录通话证据。经理笔记、CRM 结果和泛泛印象可以塑造关注点，但不能替代实际观察到的通话证据。如果实时转录不可用，就从足够详细的粘贴或导出材料继续，并标注覆盖度限制。

## 参考资料加载

`SKILL.md` 负责常规的对标辅导循环和输出格式。只有当参考资料的额外细节确有必要时才加载：

- 当日期窗口转换、参会人筛选限制、阈值回退或稀疏结果恢复需要更多细节时，使用 [references/call-transcripts-connector-playbook.md](references/call-transcripts-connector-playbook.md)。
- 需要结构化输入归一化时，使用 [references/request-schema.yaml](references/request-schema.yaml)。
- 当证据质量参差不齐时，使用 [references/source-priority.md](references/source-priority.md)。
- 当检查必需章节或下游兼容性时，使用 [references/output-contract.md](references/output-contract.md)。

## 术语

- **MAP：** 共同行动计划（mutual action plan），客户与销售方共享的计划，包含负责人、里程碑和日期。

## 工作流指引

### 1. 确定目标与对比集合

- 如果既没有明确的对标目标/对比集合，也没有聚焦辅导的锚点，通过 `ask_user_input()` 询问用户。对于“给我一些通话反馈”这类空泛调用，不要假设目标代表、同侪集合或辅导重点；提供：`My calls compared with two relevant peers`、`A named rep compared with named peers` 和 `Focused coaching on a supplied call set or theme`。
- 如果用户只提到“我最近的通话”，没有同侪基准或聚焦辅导锚点，在收集更深证据之前提供同样的明确选择。不要从一次新的请求中推断代表性销售代表、同侪集合或反馈模式。
- 需要目标代表或清楚提供的目标通话集，以及类转录通话证据。
- 对于对标反馈，优先使用用户点名的同侪代表。如果未指定同侪，仅在用户明确要求该对比时才使用点名的顶尖表现者；否则要求至少两位同侪，或在有界搜索之后提供从来源推导的候选。
- 当用户提供明确的辅导主题、通话类型、产品重点、账户、时间窗口、受众或要求的深度时予以接受。不要强加可选范围。
- 仅当用户要求、数据集的动作或产品混杂程度足以让对比失真，或需要聚焦一个有据领域以找到更好的范例时，才使用产品重点。从用户的措辞或通话证据中选择一个领域，或用户指定的一小组；绝不要运行仅含占位符的产品搜索。
- 如果用户选定通道后，必需的目标、同侪集合或提供的通话集锚点仍不明确，最多做三次窄范围来源读取，提供最多五个具体候选，并在收集更深证据之前确认任何推断出的锚点。
- 如果用户提供了转录、对标反馈的清晰目标/同侪/窗口，或清晰的目标或通话集加聚焦辅导锚点，就直接继续，不要额外做设置性盘问。

### 2. 构建公平的通话样本

- 从 ~~Meeting Transcripts 开始。用代表的精确邮箱或显示名搜索，并在检索前把相对窗口转换为绝对日期。
- 默认目标代表取过去 30 天、同侪取过去 60 天，除非用户提供窗口；除非另有要求，双方使用相同的用户指定窗口。
- 目标至少 15 通目标通话，同侪通话总计至少 15 通。仅当要求严格的逐一同侪对标时，才为每位同侪分别取约 15 通。
- 当这些维度可见时，让目标与同侪的组合同在动作类型、细分、产品重点和话题上可比。不要把以发现会为主和以采购会为主的样本直接对比而不指出这种不匹配。
- 先搜索摘要。围绕该代表加上所要求的动作或主题，做几次有界的查询变体；仅在可能改善样本时才降低阈值或扩大窗口。
- 如果用户提供了公司或账户，把它纳入查询文本和任何可用的结构化筛选；不要仅依赖结构化筛选。
- 如果有界尝试后仍未达到目标，就产出一份有限的反馈备忘，说明数量不足，并点名能提升置信度的下一次搜索，而不是用填充内容凑数。

### 3. 找同侪范例与目标时刻

- 搜索具体时刻，而不只是会议标签：议程控制、发现、价值框定、异议处理、利益相关方地图、定价、安全、采购、后续步骤或共同行动计划。
- 优先选择在多通通话中重复出现的同侪动作，或一通明确相关的通话中的若干强时刻。
- 只获取验证该模式、展示有用时刻所需的通话。对每通获取的通话，保留可读的标题/日期/公司上下文、动作类型、实时链接、仅供内部检索使用的连接器专属重新获取句柄，以及三到八个观察到的时刻。
- 在内部把证据标记为 Peer exemplar、Target strength 或 Target opportunity。
- 对每个目标改进机会，确定确切的时刻、与之匹配的同侪动作，以及该代表下次可以使用的具体话术。

### 4. 在没有评分卡的情况下综合辅导建议

- 不要创建正式的评分细则、评级、排名或评分卡。
- 把重复出现的同侪行为转化为简短的最佳实践清单：同侪做了什么、为什么有效、一到三个支撑性同侪示例，以及在转录支持时的一句可借鉴话术。
- 把这些实践映射到具体的目标时刻：“在这通目标通话里，当这件事发生时，用这个同侪动作；可以这样说。”
- 通常给出五到十个可借鉴的同侪时刻，以及五到十个具体的目标提升点；当证据不足以支撑这么多时，减少数量。
- 让优势与提升点并列可见，使输出对辅导有用，而不只是批评。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 把辅导聚焦到一项技能、一种动作类型、一个账户或一个通话时刻。
- 基于观察到的机会，增加一份实用的 30 天练习计划。
- 起草一份简洁的经理对代表或自我辅导备忘供评审。
- 当能提升置信度或找到更好范例时，对比另一个有界通话集。
- 评审后，把借鉴清单转化为可复用的辅导文档。

应避免的后续步骤：
- 创建评分卡、推断绩效或性格，或自动发送反馈。

## 模式

- Benchmarked Feedback —— 当有目标与同侪证据时默认使用。
- Focused Coaching —— 当用户点名一个主题、动作类型、账户或小通话集时使用。
- Limited Feedback —— 当同侪证据、转录深度或可比样本量稀薄时使用；清晰区分有支撑的观察与覆盖缺口。

## 输出格式

按顺序返回以下章节。

```md
# Call Feedback: [Target Rep]

## TL;DR

- [3-6 evidence-backed coaching takeaways]

## Dataset Coverage

- **Target calls reviewed:** [N; goal >=15]
- **Peer calls reviewed:** [N total; peers included; goal >=15]
- **Coverage window:** [Absolute target window] / [Absolute peer window]
- **Comparable mix:** [Motion, segment, product focus, or mismatch]
- **Confidence / limits:** [Shortfall, missing transcripts, or none material]

## Peer Exemplars: Stealable Moves

### [Behavior]

- **What they do:** [Observable move]
- **Why it works:** [Observable effect]
- **Examples:** [Readable call context + short excerpt + inline call link]
- **Stealable line:** “[Only transcript-supported language]”

## Target Rep: Specific Upgrade Opportunities

### [Upgrade]

- **Moment observed:** [Readable target call context + short excerpt + inline call link]
- **Peer exemplar move:** [Readable peer context + short excerpt + inline call link]
- **Apply it like this:** [Specific behavior and suggested language]

## Next-Call Steal Sheet

- [10-15 practical behaviors or example lines]

## Optional 30-Day Practice Plan

[Include only when requested.]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 示例提示

- `Give feedback on a rep's calls.`
- `Give feedback on Jamie's last three discovery calls.`
- `Compare this rep's demo calls with strong peer examples and suggest coaching points.`
- `Review these transcripts for talk-listen balance, qualification, and next-step clarity.`

## 规则

- 把每条辅导主张都建立在通话片段、转录时刻或重复出现的可观察模式上；绝不编造通话内容、结果、参会人、指标或交易上下文。
- 用可读的标题/日期/公司上下文和紧凑的行内编号 Markdown 链接引用示例。优先使用实时转录或通话 URL；绝不暴露原始连接器 id。
- 保持片段简短，通常一到三行，且同一来源不超过 25 个引述词。
- 仅当通话组合同样可比时才使用同侪示例；当不可比时说明不匹配并降低置信度。
- 如果某通有用的通话没有稳定链接，就使用可读上下文并说明无可用直接链接。
- 让建议基于行为且可立即使用。不要从稀薄证据中推断意图、性格或绩效。

## 失败处理

如果目标、同侪集合或通话证据无法确定，说明最小的缺失输入，并在可用时提供具体候选。如果证据稀疏，返回有限备忘，包含有支撑的观察、明确的覆盖缺口，以及能改善它的下一次有界搜索。
