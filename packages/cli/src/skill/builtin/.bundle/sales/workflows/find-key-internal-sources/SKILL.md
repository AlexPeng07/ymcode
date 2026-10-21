---
name: find-key-internal-sources
description: "当销售人员需要为客户问题、产品话题、竞争性异议、实施问题、账户任务或其他销售支持需求，找到最佳的内部专家、负责人、审批人、文档、渠道、真相来源材料或升级路径时使用。把“这事谁懂？”“我该读什么？”“真相来源在哪里？”“我该用哪个内部渠道或文档？”等问题路由到这里。 | internal experts, source of truth, escalation, owner, internal docs"
---

# 查找关键内部来源

找到帮助销售人员获得答案或解除阻塞的最小可靠内部路径：合适的人、维护中的文档、公开渠道、决策论坛和升级路径。默认输出是一份快速、有证据支撑的路由图，外加一份可直接发送的首次询问草稿。本工作流只读，绝不发帖、指派或更新系统。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## 关键依赖类别

只使用所选路由需要的类别；不要默认铺开到每个来源。

- ~~Knowledge & Files 用于维护中的真相来源页面、负责人元数据、wiki、实战指南、playbook、FAQ、runbook、发布文档和决策记录
- ~~Internal Messaging 用于公开渠道、渠道主题、讨论串、活跃贡献者、升级路径、支持渠道和决策论坛
- ~~CRM 用于客户或账户身份、归属、商机上下文，以及能澄清账户级问题的 CRM 可见阻塞项

优先采用权威的归属关系和真相来源材料，而不是聊天中的提及。~~CRM 可以解析账户真相，但它本身不能证明谁拥有那个内部答案。

## 参考资料加载

`SKILL.md` 负责常规的路由选择、有界搜索、排序和输出图。只有当参考资料的额外细节确有必要时才加载：

- 当查询铺开、复合维度、来源专属搜索或停止规则需要更多细节时，使用 [references/search-patterns.md](references/search-patterns.md)。
- 仅在通用梳理之后，当用户提供或连接器可见的术语很可能改变路由时，使用 [references/company-context.md](references/company-context.md)。

## 术语

- **真相来源页面：** 应被视为最权威答案来源的维护中文档、wiki、跟踪表或页面。
- **DRI：** 直接责任人（directly responsible individual），对某话题、决策或后续落实负责的人。
- **SME：** 领域专家（subject matter expert），即使不是问责负责人，但在该话题上有实践深度的人。
- **决策论坛：** 处理权衡与审批的例会、渠道、文档或小组。

## 工作流指引

### 1. 确定话题与路由

- 需要一个具体的 topic_or_task：客户问题、产品话题、异议、实施问题、账户阻塞、举措或真相来源缺口。
- 当活跃对话线程或已提供的 Sales 输出清晰时，从中推断。若仍不明确，做一次有边界的候选梳理（最多三次来源读取），然后友好地提一个问题，附上最多五个具体候选。
- 把类似公司名的歧义名称视为可能的账户锚点。在依赖内部文档或消息做账户级路由之前，在可用时使用有边界的 ~~CRM 查询。
- 默认使用 quick。仅在用户要求，或某个高风险问题明显需要更广的佐证时才使用 deep。

选择满足请求的最小答案路径：

- owner_route —— 谁拥有、审批、了解或应被联系
- doc_route —— 该读什么、哪个页面在维护、或哪套措辞已获批
- channel_route —— 在哪里提问、讨论、升级或获取支持
- full_map —— 当请求确实需要专家、文档和渠道三者时，一并给出

### 2. 先搜索权威来源

- 对于 owner_route，先从维护中的归属、目录、路由或真相来源页面开始；用消息确认当前做法或填补缺口。
- 对于 doc_route，先从维护中的文档、标题/heading 匹配、链接枢纽、负责人字段和时效性开始；排序前只获取最强的候选。
- 对于 channel_route，先从公开渠道名称、主题、用途和成文的升级路径开始；仅在近期公开讨论串会改变置信度时才查看它们。
- 当路由针对具体客户时，先用 ~~CRM 获取账户身份和交易上下文，然后用 ~~Knowledge & Files 或 ~~Internal Messaging 获取内部归属。
- 在 quick 模式下，做一次权威来源尝试，第一遍为空、稀薄或误导时做一次窄范围回退，并且每个首选候选最多获取一次文档或读取一次讨论串。
- 仅在第一遍较弱、话题跨越不同界面，或用户要求 deep 时才扩大范围。当已得到支持的路由足够好、结果趋于稳定，或继续搜索只产生低置信度的重复项时，停止。

### 3. 构建有用的搜索维度

- 先使用精确的话题词，然后添加别名、缩写、旧称/现称、产品/团队名称，以及任务形态词，例如 owner、approval、policy、runbook、playbook、FAQ、support 或 escalation。
- 对于复合问题，为产品/账户界面和控制/流程界面保留独立的检索线。不要让一条强政策命中替代产品路由，也不要让一个发布页面替代审批归属。
- 当查询铺开、来源专属搜索或停止规则需要更多细节时，使用 [references/search-patterns.md](references/search-patterns.md)。
- 仅当公司专属术语来自用户或连接器可见的来源真相时才使用它。不要编造内部名称、渠道模式、URL 或归属约定。
- 仅在通用候选检索之后应用组织专属的扩展，保持基础评分为主，并将每个候选基于上下文的总加成限制在 `+0.25`。

### 4. 提取、打分并排序候选

按类型、标题或名称、URL、来源、证据、归属信号和时效性规范化候选。对近乎相同的条目去重。

排序依据：

1. 与所请求答案路径的直接相关性
2. 权威性与维护信号
3. 时效性
4. 跨来源印证
5. 对销售人员下一步动作的实际有用性

- 优先使用直接证据链接，而不是仅有资料页或仅有提及的匹配。
- 优先使用维护中的真相来源页面、实战指南、FAQ 和 playbook，而不是一次性笔记。
- 优先选择其主题、用途、关联指南或近期讨论串显示出归属路径的渠道，而不是仅仅提到该话题的渠道。
- 对于主要从 ~~Internal Messaging 推断出的人，需要有近期的归属或专业信号，默认取最近 90 天；省略或降权过时候选。
- 排除已停用或不活跃的用户。默认仅使用公开渠道；仅在用户明确要求且访问合适时，才包含私有渠道、群组 DM、直接消息或对外共享渠道。
- 当话题同时涉及产品/GTM 指引与政策、安全、实施、定价或审批归属时，保留各自独立的路由。

### 5. 渲染路由图

- 只返回请求所需的深度。对于单一路由，用 “Not searched in quick pass” 或 “No high-confidence candidate found” 让其他必需章节保持简洁。
- 说明每个候选的答案路径类型：DRI、审批人、SME、维护者、问责团队、决策论坛、发布负责人、升级渠道、支持渠道或反馈渠道。
- 包含一句话理由、可用的直接链接、证据信号，以及在影响可信度时的时效性或置信度。
- 如果用户的措辞混淆了两个界面，补一段简短的界定说明，解释两者的区分，并继续给出两条路由，除非该区分会改变哪些来源可安全使用。
- 推荐的首次询问必须是一份具体草稿，销售人员可以直接发给最佳负责人或公开渠道。在聊天中起草；不要发布。
- 覆盖缺口必须点名不可用或薄弱的类别、对置信度的影响，以及最小的有用下一步。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 起草发给推荐负责人、专家或公开渠道的首次询问。
- 打开并综合最有力的真相来源文档，回答销售人员的问题。
- 当受支持的路由需要升级时，准备一份简洁的升级说明。
- 创建一份可复用的路由笔记，包含已验证的人、文档、渠道和注意事项。
- 找出能解决归属或审批缺口的最小缺失来源。

应避免的后续步骤：
- 自动发帖、指派、升级或更新归属。

## 模式

- quick —— 默认；专家、文档和渠道各最多三个候选，检索范围有界
- deep —— 当证据质量支持时，各五到八个候选
- owner_route、doc_route、channel_route、full_map —— 答案形态路由；可与 quick 或 deep 组合

## 输出格式

```md
# Internal Routing Map: [Topic]

[Optional framing note when the topic spans distinct ownership surfaces.]

## Experts
- **[Name / team]** — [DRI / approver / SME / other type]; [why this route]. [Evidence link] · [confidence/freshness]

## Docs
- **[Doc]** — [source-of-truth / field guide / FAQ / other type]; [why it matters]. [Link] · [confidence/freshness]

## Channels
- **[#channel]** — [support / escalation / decision forum / other type]; [why ask here]. [Link] · [confidence/freshness]

## Recommended First Ask
> [Draft-ready question or handoff, addressed to the best owner or public channel.]

## Coverage Gaps
- [Missing or weak source, confidence impact, and smallest useful next step]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 示例提示

- `Find the key internal sources for a customer question.`
- `Find who owns the Enterprise SSO rollout path for ExampleCorp.`
- `Find the docs and channels for answering a customer's security review question.`
- `Route this implementation blocker to the right internal people and source of truth.`

## 规则

- 不要编造负责人、专家、渠道、文档、真相来源路径、链接或归属确定性。
- 将事实与推断分开；把不确定的归属标注为 Likely 或 Possible。
- 保持路由图阶段只读。不要发布、发送、指派或更新任何内容。
- 宁可给出更少但高置信度的路由，也不要冗长嘈杂的清单。
- 在有可用链接时，始终用超链接引用来源；当缺失本身很重要时，写明 (no useful link available)。
