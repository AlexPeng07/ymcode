---
name: enrich-company-and-contact-data
description: "用于以数据为先的公司、联系人、线索和潜客发现或数据丰富，包括企业属性或技术属性的补全、点名公司画像、实体解析、ICP 匹配、潜客名单构建、分层、触发或销售信号分析、市场与区域扫描，以及以数据丰富为基础的对比。不包含会议准备、以外联为导向的公司研究，以及对既有账户簿的优先级排序。 | enrichment, company data, contact data, ICP matching, prospect list, segmentation, firmographics"
---

# 丰富公司与联系人数据


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

让销售人员获得对公司或联系人可信、可用于决策的视图：什么是已知的、什么是强匹配、哪些仍不确定，以及数据支持什么动作。本技能负责证据解析、ICP 匹配与覆盖度对比，以及有来源支撑的信号分析；它不负责销售代表的工作优先级、外联执行或写入 CRM。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 数据丰富排序

当请求宽泛或工作集不明确时，使用以下优先顺序。

1. 用户明确提供的行、域名、联系人、公司、ICP 标准、所需字段或说明的排序规则
2. 用户所指的 CRM 账户集、区域、目标名单或成文 ICP
3. 满足所有硬性筛选条件的实体，例如地域、行业、公司规模、技术、职位或资历
4. 具有高置信度身份解析，且有足够可对比证据支撑所需输出的实体
5. 具有明确匹配含义、可达的采购团队路径，或有来源支撑的外部信号的实体
6. 近似匹配和未解析的实体，与合格结果清晰分开

不要悄悄把用户提供的名单扩大成潜客发现，不要合并歧义实体，也不要按用户无法检视的标准排序。

如果用户要求给名单打分或分层，将判断限定在 ICP 匹配度、数据丰富完整度、身份置信度或已定义的信号强度。如果用户问现在该做哪些账户、该聚焦哪里，或哪种销售代表动作应优先，则路由到 `prioritize-accounts`。

## 关键依赖类别

以下类别对本工作流尤为重要；请自行判断是否可能纳入其他数据来源以提升质量。

- [Blocking] ~~Sales Intelligence 用于公司/联系人发现、企业属性、技术属性、意向、相似客户和提供方原生信号。当所要求的等效数据尚未落地时，它会阻塞发现、联系人发现、相似客户、意向和提供方原生数据丰富。
- ~~CRM 用于账户身份、客户状态、归属、生命周期阶段、商机上下文和重复记录解析
- ~~Knowledge & Files 用于 ICP 定义、区域规则、目标名单、分层规则和数据丰富约定
- 用户提供的行、CSV、导出文件、域名、邮箱和 ICP 笔记，只要它们已经界定了工作
- 公开研究仅用于配置来源无法回答的狭窄验证或缺口

从拥有所需字段的类别开始，然后仅尝试那些能实质改善覆盖度、身份置信度或决策的额外类别。如果某个重要类别不可用、过时、冲突或受提供方限制，说明该限制及其对覆盖度或置信度的影响。

## 工作流指引

这些数据丰富专属步骤会修改索引技能中对应的默认工作流阶段。继续执行其余默认阶段，包括首个输出和建议的后续步骤。

- 1. 澄清并收集上下文
    - 确定最小有用的模式、实体范围、任务形态、所需字段、排序规则和结果上限。
    - 如果锚点存在歧义，最多做两次窄范围来源调用以呈现具体候选，然后在深入丰富之前请用户选择。当有两三个具体模式、实体或候选可用时，使用 `ask_user_input()`；否则问一个窄范围的文本问题。
- 2. 初稿
    - 从用户定义的工作集或请求的标准来源开始，然后仅获取能实质改善结果的证据。
    - 当所选且已连接的销售情报提供方是 ZoomInfo 时，在提供方专属的搜索、数据丰富、意向、相似度或恢复操作之前加载 `zoominfo`。当它是 Apollo 时加载 `apollo`；只有在确认应用版本为 2 或更高之后，才应用 Apollo v2 专属指引。
    - 对于宽泛发现，先搜索再做重度丰富，并且只对最终短名单做数据丰富，除非用户明确要求穷尽处理。
    - 在把某行称为合格之前，先验证硬性筛选条件。把接近但不受支持的候选放入 Near Matches、Unclear 或 Excluded。
    - 渲染最小有用的表格或短名单，包含字段级的可点击来源链接、置信度和可见缺口。

## 总体规则

- 只要有可用链接，就用超链接引用带来源的主张。如果某个来源无法提供链接，说明来源名称和限制。
- CRM 拥有内部账户真相；数据丰富提供方拥有提供方原生的外部字段；用户提供的记录界定工作集，除非用户要求做发现。
- 使用 Sales Intelligence 做提供方原生的发现、联系人发现、相似客户和信号扫描；使用 CRM 处理现有客户、归属、生命周期阶段、商机上下文和点名的 CRM 名单；使用 Knowledge & Files 处理用户未提供的点名 ICP、区域、目标名单或分层规则。
- 不要用间接或镜像来源、宽泛网络搜索或 Computer Use 替代权威类别。
- 将带来源的事实与 `Inference:` 分开。绝不编造邮箱、电话、职位、技术、融资、招聘信号、意向或缺失字段。
- 不要声称有界查询具有穷尽覆盖度。让提供方限制、弱匹配和缺失通道保持可见。
- 在本工作流中不要更新 CRM、执行外联、创建记录或发送消息。如果用户希望变更 CRM，准备好拟议的字段更新，并在单独写入动作前要求明确批准。

## 输出契约

每种模式都必须在建议的后续步骤之前包含一个简洁的 `## Sources & Coverage` 章节：

- **Used:** [带链接的来源或来源标注] — [它提供的字段、规则或信号]
- **Unavailable or limited:** [重要类别或提供方缺口] — [对置信度或覆盖度的影响]
- **Coverage:** [工作集、查询边界，或结果是否穷尽]

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 将结果导出为电子表格，保留可见证据、置信度和未解析字段。
- 为缺失或需更正的字段，准备对真相来源（例如 CRM 记录）的更新供评审。
- 验证近似匹配、歧义身份或最小的关键覆盖缺口。
- 根据用户的指导，细化筛选条件、ICP 规则、所需字段或结果上限。
- 当用户想要下一步销售动作时，把合格短名单交给账户优先级排序或公司研究。

应避免的后续步骤：
- 未经明确批准就执行外联、悄悄扩大工作集或更新 CRM。

## 模式

### 1. 丰富已提供的记录

- 当用户提供公司、联系人、域名、邮箱、行、CSV/导出文件或 CRM 支撑的名单，并希望补全或清理缺失字段时使用。
- 保留完整的提供集合，规范化明显的重复项，并呈现身份歧义，而不是悄悄删除或合并行。
- 在可用时使用 CRM 获取客户/账户真相，然后再丰富所要求的外部字段。

#### 输出格式

```md
# Enrichment Results

| Input Record | Resolved Entity | [Requested Field] | [Requested Field] | Confidence / Notes | Missing Or Unresolved |
| --- | --- | --- | --- | --- | --- |
| [Original input] | [Matched company/contact + source link] | [Grounded value + source link] | [Grounded value + source link] | [High/Medium/Low + reason] | [Gap or ambiguity] |

## Key Readout

- [Most useful pattern or implication]
- [Important source gap, duplicate, or weak match]
- [Recommended next check or action]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### 2. 发现公司或联系人

- 当用户要求新的公司、联系人、可能的买方、决策者、相似客户或 ICP 匹配时使用。
- 从明确的搜索条件或种子公司开始。只把合格的匹配作为干净的命中返回，并把近似匹配单独保留。
- 对于联系人，在推荐某个人之前先核实角色、资历和所属公司。

#### 输出格式

```md
# Qualified Matches

| Company / Contact | Why It Fits | Key Evidence | Confidence | Source |
| --- | --- | --- | --- | --- |
| [Entity] | [Hard criteria satisfied] | [Compact grounded evidence] | [High/Medium/Low] | [Clickable link] |

## Near Matches

- [Entity] — [Why it is close but not qualified]

## Gaps / Caveats

- [Coverage, provider, identity, or source limitation]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### 3. 对比、分层或扫描信号

- 当用户要求对比一个有界集合、给名单打分或分层，或查找符合某个已定义外部信号的实体时使用。
- 在输出中保留可见的对比、分层规则或信号/代理定义，让用户能检视该判断。
- 不要把弱代理转化为更强的结论。

#### 输出格式

```md
# [Comparison / Segmentation / Signal Scan]

| Entity | [Comparison Field Or Tier] | Evidence / Signal | Confidence | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| [Entity] | [Grounded value or visible tier] | [Observed signal or rationale] | [High/Medium/Low] | [Clickable link] | [Gap or caveat] |

## What Is Still Unclear

- [Missing field, unsupported ranking input, or next verification step]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```
