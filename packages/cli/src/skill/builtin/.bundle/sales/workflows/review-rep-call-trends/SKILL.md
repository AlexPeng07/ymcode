---
name: review-rep-call-trends
description: 当用户希望了解某位销售或面向客户的代表的通话行为随时间如何变化时使用。产出以证据为支撑的趋势速览，包含改进、退步、稳定模式、辅导动作和值得重听的通话。 | call trends, coaching, rep behavior, improvement, regression
---

# 评审销售代表通话趋势


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

把有代表性的、按时间切分的通话样本转化为客观的辅导指引。本技能对比较早与较新的通话证据，识别真正发生的改进、退步和稳定模式。它只负责速览；不创建跟踪表、不发送反馈、不发布消息，也不保存产物。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

这些类别对本工作流尤为重要；仅当其他来源能实质改善抽样或解读时才使用它们。

- [Blocking] ~~Meeting Transcripts 用于按时间切分的通话搜索、摘要、转录时刻、说话人上下文、日期、公司和可点击的通话链接。它会阻塞默认的实时来源趋势路径；已在上下文中的明确较新/较早通话证据即可满足需求。
- ~~Knowledge & Files 用于用户提供或导出的转录、通话摘要、经理提供的通话集和既往辅导上下文

趋势类主张需要通话摘要或转录。经理笔记、CRM 结果和泛泛印象可以提供上下文，但不能替代较早与较新通话的对比证据。如果样本很小或存在偏差，返回有限的趋势速览，而不是过度概括。

## 参考资料加载

`SKILL.md` 负责常规的按时间切分趋势流程和输出格式。只有当参考资料的额外细节确有必要时才加载：

- 需要结构化输入归一化时，使用 [references/request-schema.yaml](references/request-schema.yaml)。
- 当紧凑的行为类别不足以给证据分类时（尤其是技术成功或会议技巧类信号），使用 [references/rubric.md](references/rubric.md)。

## 工作流指引

### 1. 确定代表与对比基准

- 如果目标代表或对比基准不清晰，通过 `ask_user_input()` 询问用户。对于“评审通话趋势”这类空泛调用，不要假设某位代表或时间窗口；提供：`My calls over the default trailing 90 days`、`A named rep over the default trailing 90 days` 和 `Supplied older/newer call sets or a custom window`。
- 如果用户只提到“我的通话趋势”而没有对比基准，在广泛检索之前提供同样的明确选择。不要从一次新的请求中推断代表性代表、对比窗口或趋势评审模式。
- 需要目标代表或清楚提供的目标通话集，以及对比基准：时间窗口、较早/较新集合、转录集、通话摘要或明确的辅导维度。
- 在用户选择“我的通话”之后，在可用时使用当前用户。对于模糊的“经理口吻”请求，在广泛检索之前索取代表的精确显示名或邮箱。
- 如果按参会人筛选的搜索返回零结果，尝试小幅且有据的变体：先只用名或姓，然后在上下文支持时尝试一个明显的昵称。如果仍返回零结果，就在所选的 ~~Meeting Transcripts 来源中索取代表的精确显示名。
- 在用户选择默认的 Trend Review 路径后，使用最近 90 天，切分为三个不重叠的时间片：0-30 天、31-60 天和 61-90 天。在搜索前把每个相对窗口转换为具体的绝对日期。
- 保留用户指定的动作类型、产品重点、账户、辅导维度或受众。如果提供的日期表述会实质改变样本，问一个简短的澄清问题。
- 如果用户选定通道后目标仍不明确，最多做三次窄范围来源读取，提供最多五个具体候选，并在更深入分析之前确认任何推断出的锚点。

### 2. 收集跨时间的摘要

- 从 ~~Meeting Transcripts 开始，分别搜索每个时间片。使用代表的精确邮箱或显示名，每个时间片约 25 条上限，并在支持时使用 `score_threshold=0`——或实际可行的最低阈值——以免样本偏向于只含“强”通话。
- 当用户点名某个重点（如发现、演示、续约、异议或技术排障）时，使用简短的匹配查询。否则使用空查询或中性查询，以免使样本产生偏差。
- 在可用时争取 30-60 通去重后的通话，并在摘要中体现通话类型和公司的多样性。如果某个时间片稀疏，将其扩大一次（约 30 天），并说明该调整。
- 如果有数百通通话，优先使用最近的通话，加上较小的较早基线，同时保持可见的通话类型和公司多样性。
- 先用摘要构建趋势视图：日期、公司、标题、话题、通话链接，以及仅用于获取的检索句柄。
- 不要仅凭一通近期通话或仅凭结果就声称改进或退步。

### 3. 对比有支撑的行为类别

- 尽可能在较早和较新的时间片上对比相同的类别。
- 使用核心类别：开场/议程、发现深度、资格判断/优先级、定位/叙事、异议处理、后续步骤与共同行动计划、技术准确性、清晰度/简洁度、高管风范，以及倾听/轮流发言。
- 当通话偏技术或解决方案导向时，使用评分细则中额外的类别：问题框定、诊断/排障、方案设计/权衡，以及技术加商业利益相关方的管理。
- 优先选择三到六个证据最清晰的类别。把混合证据标记为 Inconsistent，而不是强行给出趋势。
- 只有时间对比支持方向性变化时，才称之为 Improved 或 Regressed。对重复出现但没有明显变化的模式使用 Stable。

### 4. 获取一小批验证样本

- 仅在摘要存在歧义、趋势需要验证，或某个具体辅导时刻会有帮助时，才获取完整上下文。
- 通常检视一到两通近期强通话、一到两通近期有摩擦的通话，以及一到两通较早的基线通话。
- 记录两到六个简短时刻：发生了什么、为何重要、类别、可读的标题/日期/公司上下文，以及实时链接。
- 保持引述简短，并用完整内容来验证——而不是替代——摘要层面的样本。

### 5. 把趋势转化为行动

- 把每项改进、退步和稳定模式都关联到所对比时间片的证据。
- 为未来两周精确推荐三项辅导动作。每项动作都需要一项要练习的技能、一个 if/then 打法、一次五到十分钟的练习，以及可在后续通话中观察的检查点。
- 挑选三到八通值得重听的通话，优先选择最能解释辅导重点的近期和基线示例。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 深入某一个改进、退步或不一致的行为类别。
- 把前三项动作转化为两周练习计划或辅导备忘供评审。
- 为某一项辅导重点对比一个有界的同侪范例集。
- 挑选并总结最值得重听的通话。
- 为同一代表、范围和对比基准设置未来的趋势刷新。

应避免的后续步骤：
- 从稀薄证据中做出绩效判断，或自动发送反馈。

## 模式

- Trend Review —— 默认的滚动窗口分析。
- Focused Trend Review —— 用于点名的动作类型、类别、账户集合，或提供的较早/较新通话。
- Limited Trend Readout —— 当某个时间片、转录深度或样本均衡度不足以支撑有把握的变动主张时使用。

## 输出格式

按顺序返回以下章节。

```md
# Rep Call Trends: [Target Rep]

## Coverage

- **Target rep:** [Name]
- **Window analyzed:** [Absolute start] -> [Absolute end]
- **Time slices:** [Older / middle / recent absolute ranges]
- **Calls reviewed:** [N summaries], [M full fetches]
- **Sample shape / limits:** [Mix, sparse slice, or confidence note]

## What Improved

- **[Behavior change]** — [Evidence from older vs newer readable call context + inline links] — [Why it matters]

## What Regressed / Risk Signals

- **[Behavior change]** — [Evidence from older vs newer readable call context + inline links] — [Why it matters]

## What Stayed Consistent

- **[Stable or inconsistent pattern]** — [Evidence + inline links]

## Top 3 Coaching Actions: Next 2 Weeks

1. **Practice:** [Skill]
   - **If / then:** [In-the-moment play]
   - **Quick drill:** [5-10 minute drill]
   - **Look for next:** [Observable signal]

## Calls to Re-Listen

- [Readable date, company, title + inline link] — [Why this call matters]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 示例提示

- `Review a rep's call trends.`
- `Review Jamie's call trends over the last month.`
- `Compare this rep's recent discovery calls to their earlier calls and flag changes.`
- `Find improvement and regression patterns across this rep's demo calls.`

## 规则

- 不要编造通话、行为、结果、指标、引述、日期、公司或链接。
- 每项改进或退步主张都必须对比较早与较新的证据，并引用至少一个可读的通话链接；不要把轶事变成趋势。
- 优先依据明确的结构、问题、摘要、异议和后续步骤，而不是推测性解读。不要推断意图或性格。
- 用可读的标题/日期/公司上下文和紧凑的行内编号 Markdown 链接引用，例如 `2026-03-24, ExampleCorp, Pilot & Pricing [1](https://example.com/call/123)`。优先使用实时转录或通话 URL；绝不暴露原始连接器 id。
- 当一条陈述有多通通话支撑时，行内追加多个编号链接。
- 保持片段简短，通常同一来源不超过 25 个引述词。
- 如果某通有用的通话没有稳定链接，就使用可读上下文并说明无可用直接链接。

## 失败处理

如果目标或对比基准无法确定，说明最小的缺失输入，并在可用时提供具体候选。如果样本稀疏或不均衡，产出有限速览，点名哪些变动主张缺乏支撑，并建议能提升置信度的最小额外通话集或窗口。
