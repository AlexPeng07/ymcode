---
name: find-customer-quotes
description: "当用户需要客户或潜客的原话引述、客户之声证据、主题验证、异议证据、产品摩擦示例，或针对某产品领域、用例或销售叙事的支撑材料时使用。使用明确的说话人置信度与出处规则，从转录、通话笔记、提供的类转录录音或导出文件，以及其他有据可依的通话材料中检索。 | customer quotes, voice of customer, verbatim, objection evidence, theme validation, transcript"
---

# 查找客户引述


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

从类转录证据中提取高置信度的客户或潜客原话。本技能负责引述的发现、验证、筛选与可读的出处说明；它不是通话分析、转述生成、法务审查或发布流程。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

使用能支撑所需引述集的最窄证据通道。

- [Blocking] ~~Meeting Transcripts 用于转录搜索、获取的转录文本、说话人标签、参与者、日期、公司和来源链接。它会阻塞默认的实时来源引述提取路径；已在上下文中的明确类转录材料即可满足需求。
- ~~CRM 仅用于账户身份、客户/潜客状态，以及能收窄转录搜索的公司或细分筛选条件
- ~~Knowledge & Files 用于已上传或导出的转录，以及保留直接用语和说话人上下文的有据通话笔记

类转录证据是必需的。~~CRM、账户摘要、公开研究、内部笔记和记忆可以缩小范围，但绝不是引述证据。如果不存在实时或用户提供的类转录材料，请索取转录导出文件、粘贴的转录文本、带文字的录音导出，或有据的通话笔记。

## 参考资料加载

`SKILL.md` 负责常规的转录优先路径、阈值和可读输出。当转录解析存在歧义、说话人角色置信度难以判断、引述排序或去重需要完整规则、用户要求 JSON，或失败处理需要确切的响应形态时，使用 [references/extraction-and-output.md](references/extraction-and-output.md)。

## 术语

- **引述候选：** 可能有用的逐字片段，但在被视为客户证据之前仍需检查说话人、上下文和用法。
- **客户置信度：** 对说话人确实是客户或潜客（而非内部同事、合作伙伴或未知说话人）的置信程度。
- **回退证据：** 相关的非客户或置信度较低的材料，可解释某个缺口，但不应作为客户引述呈现。
- **安全用法说明：** 关于署名、敏感性、置信度，以及该引述可在何处负责任地复用的指引。

## 工作流指引

### 1. 确定主题与证据范围

- 如果主题或类转录证据范围不明确，通过 `ask_user_input()` 询问用户。对于“帮我找客户引述”这类空泛调用，不要假设主题或转录集；提供：
  - `Use the most common blocker from recent Meeting Transcript evidence`
  - `Use a theme, objection, product area, or narrative I specify`
  - `Use a specific transcript or call set I provide`
- 对于“找出我最近客户通话中最常见阻碍因素的客户引述”这类宽泛请求，把推荐主题和宽泛的近期通话范围都视为需要澄清的情形；提供：
  - `Use the blocker theme you recommend from recent Meeting Transcript evidence`
  - `Use a blocker theme I specify`
  - `Use a specific transcript or call set I provide`
  在用户做出选择之前，不要搜索转录证据或起草引述集。
- 在该澄清之后，需要一个反馈主题、异议、产品领域、用例、叙事或特定转录集。保留用户的原始措辞。
- 每个主题默认五条引述。多个主题时小批量处理。
- 归一化时间窗口：有明确日期时使用明确日期；把“上个月”视为过去 30 天，除非用户说“上一个自然月”；“上季度”按自然季度理解，“过去 N 天/周”按滚动窗口理解。
- 如果日期表述过于含糊、无法负责任地转换，问一个简短的澄清问题，除非用户明确表示可灵活处理。
- 对于不明确的账户、细分或转录集，做一次有边界的梳理，并通过 `ask_user_input()` 提供最多五个具体候选。在用户选择之前，不要搜索转录证据或起草引述集。仅用 ~~CRM 解析筛选条件；不要把 CRM 内容当作引述证据收集。
- 如果近期的通话跟进、粘贴的转录、上传文件或链接的通话已清楚提供主题和证据来源，则无需提问直接继续。

### 2. 先搜索转录证据

- 在可用时从 ~~Meeting Transcripts 开始，使用主题加上一两个意图词，例如 `pain point`、`blocker`、`request`、`limitation` 或 `need`。
- 仅在用户提供或确认时应用公司、细分和日期筛选。先从 10-15 条结果和约 0.7 的相关性阈值开始。
- 如果所选的 ~~Meeting Transcripts 来源暴露了带有已知枚举值的账户细分筛选，使用与用户措辞相匹配的连接器可见值。
- 不要凭空添加用户意图。如果用户只要求一个主题，就让查询以主题为中心。
- 如果结果稀疏，简化查询，将相关性适度降低到约 0.6，然后仅在覆盖度仍不足时扩展到 20-40 条结果。
- 先获取排名最高的转录，仅扩大到有足够高置信度、多样化的证据为止，或确认第一遍明显稀薄。
- 对于粘贴、上传或导出的材料，只解析保留了足够说话人/上下文证据、可判断客户或潜客可能性的类转录文本。
- 保留主题、搜索结果元数据、获取的转录内容、连接器专属的重新获取句柄，以及可用的通话或转录 URL 之间的映射。不要假定固定的转录 schema；检视获取到的形态并相应适配。

### 3. 提取逐字候选

- 只保留直接、有实质内容的语言，表达痛点、阻碍、约束、顾虑、未满足需求、请求、购买条件或其他与主题相关的信号。
- 保持逐字原样。不要清理语法、拼接片段，或把转述变成引述。
- 排除不是直接引语的转述，除非用户明确要求转述。若用户要求，单独标注，绝不作为逐字引述呈现。
- 排除明显的内部销售方陈述、泛泛的赞美、混乱的片段，以及没有可用含义的极小片段。
- 在可用时保留转录、通话、日期、公司、说话人标签、参与者上下文和来源链接。

### 4. 精确核实说话人并排序

- 对每个候选，检视附近的转录上下文，并赋值 `speaker_role_guess` 为 `customer`、`prospect`、`internal_seller` 或 `unknown`；`customer_confidence` 取 0.0-1.0；`theme_relevance` 取 0.0-1.0；以及一条简洁的证据说明。
- 默认只保留 `customer_confidence >= 0.8` 且 `theme_relevance >= 0.75` 的候选。
- 如果覆盖度稀薄，宁可少给引述，也不要降低客户置信度。只有在说话人证据仍然很强时，才可把主题相关性略微降低到约 0.65。
- 按客户置信度、主题相关性、跨通话/客户多样性、具体性与可执行性排序，最后在保持逐字的前提下考虑可读性。
- 如果没有候选通过客户阈值，报告 `0/[target]` 条客户/潜客引述。不要用未知或内部说话人回填主引述集。

### 5. 去重并挑选范例

- 仅为比较而规范化空白和标点；绝不改动展示的引述文本。
- 剔除完全相同和近乎重复的引述。
- 默认每次通话一条引述。只有当同一通话的另一条引述带来实质不同的证据，或需要用它达到目标且质量很高时，才使用第二条。
- 当身份可用时，优先覆盖多个客户。
- 仅将相关的非客户转录片段保留在单独的回退章节中，并按角色标注，例如 `internal evidence`、`vendor-eval evidence`、`partner-readiness evidence` 或 `unknown non-customer evidence`。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 搜索相邻或更窄的主题以改善证据覆盖度。
- 扩大或收紧转录、账户、细分或时间窗口范围。
- 将选中的引述打包进商业论证、竞品简报、会议准备或证据附录。
- 起草一份对来源安全的内部摘要，说明这些引述支持什么、不支持什么。
- 补齐最小的说话人身份或转录质量缺口。

应避免的后续步骤：
- 转述引述、把歧义说话人呈现为客户，或暗示已获得法务或合规批准。

## 模式

- `Theme Quote Set` —— 默认；针对一个或多个主题的分组可读 Markdown。
- `Specific Transcript` —— 仅从用户点名或提供的通话中提取。
- `JSON` —— 仅在用户明确要求机器可读输出，或下游工作流需要时使用。

## 输出格式

默认使用可读的 Markdown。

```md
# Customer Quotes

## [Theme]

**Coverage:** [returned]/[target] high-confidence customer/prospect quotes · [spread/quality note]

- “[Verbatim quote]”
  - **Speaker:** [Name or Unknown] · **Customer confidence:** [0.00] · **Theme relevance:** [0.00]
  - **Context:** [Company/call/date when known]
  - **Why it fits:** [Concise transcript-grounded evidence note]
  - **Source:** [Clickable transcript/call link, or no useful link available]

## Gaps

- [Theme with weak coverage, speaker ambiguity, transcript quality issue, or missing evidence]

## Internal / Non-Customer Evidence

- “[Verbatim fallback snippet]”
  - **Speaker / context:** [Known context] · **Role:** [non-customer classification] · **Customer confidence:** [0.00] · **Theme relevance:** [0.00]
  - **Usage note:** Useful for [internal purpose]; do not present as a customer quote.
  - **Source:** [Link/label]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

省略空的可选章节。当既存在高置信度的客户引述又存在回退证据时，仅在用户要求或回退证据能实质解释某个缺口时，才包含回退证据。

当搜索广度、转录格式、重复通话或说话人标签质量降低了置信度时，包含简洁的方法说明。即使结果为 `0/[target]`，也要保持每个主题的覆盖度明确。
除非用户明确要求角色元数据，或某条引述需要歧义说明，否则不要在可读摘要中打印 `speaker_role_guess`。
在可用时使用可点击的来源链接；否则写明 `no useful link available`。

## 示例提示

- `Find customer quotes about a feedback theme.`
- `Find customer quotes about setup friction from recent enterprise calls.`
- `Pull prospect quotes about data residency from the last month of call notes.`
- `Find quotes that support the "faster account research" story from these transcripts.`

## 规则

- 不要编造或推断引述文本、说话人姓名、职位、角色、公司、日期、转录链接或通话元数据。
- 不要把相关通话中的每条引述都当作相关，也不要把每条相关引述都当作客户所说。
- 除非周围上下文有力证明存在外部参与者，否则不要把缺失说话人标签视为高置信度。
- 保持引述逐字原样，并在每条引述附近让出处可见。
- 宁可精确、多样并如实呈现缺口，也不要堆砌凑数。
- 本工作流不适用于穷尽的通话分析、转录缺乏证据时对说话人身份的精确验证，或法务/合规审查。
- 保持本工作流只读。除非用户在后续步骤中明确要求，不要发布、发送、打包或保存引述。

## 失败处理

如果没有可用的类转录证据，说明引述提取无法有据可依，并索取最小的可用来源。如果转录格式质量差或说话人身份不明确，返回更少的引述，说明该限制，并把置信度较低的证据排除在客户/潜客集合之外。
