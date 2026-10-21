---
name: apollo
description: "仅在聚焦的 Sales 工作流已选定一个在场且已连接的 Apollo 连接器，或用户明确要求 Apollo 潜客开发、数据丰富、Company Details、记录、序列或外呼规划时使用。只有在确认应用版本为 2.0.0 或更高之后，才应用 Apollo v2 专属行为。 | Apollo, prospecting, enrichment, Company Details, sequences, outbound planning"
---

# Apollo 使用指南

在上级 Sales 工作流选定之后，使用 Apollo 完成聚焦的销售情报工作。销售人员的任务仍以上级工作流为准；本指南负责 Apollo 专属的版本、额度、标识符、变更操作和外呼安全规则。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## Apollo 版本门槛

只有当从可见的应用元数据、平台上下文或明确的 v2 专属界面确认 Apollo 应用版本 >= 2.0.0 时，本指南的 v2 专属行为才适用。

- v2 专属证据包括：暴露出的公司搜索或 Company Details 预览封装、批量账户或联系人创建更新、序列创建更新、日程查询、活动或序列审批，或独立的 Apollo 用量统计额度工具。
- 通用的 People Search、Contact Search、Organization Search、数据丰富、邮件账户查询、单条记录创建更新、序列搜索、添加/移除序列联系人、职位发布或分析，都不能证明是 v2。
- 如果版本未知、不可用或低于 2.0.0，不要套用仅 v2 的假设，也不要调用仅 v2 的变更、登记、激活或消耗额度的流程。通用数据丰富仍可按常规的 Apollo 额度审批规则进行；否则说明该限制。

## Apollo 操作排序

1. 用户明确请求、点名的公司或人员、域名、邮箱、Apollo ID、序列或明确说明的动作
2. 当前 Sales 工作流所需的最窄只读路径
3. 强有力的标识符解析，以及紧凑的候选预览
4. 在消耗额度的数据丰富或 Company Details 之前，先搜索并形成短名单
5. 经过评审的变更或启动预览
6. 明确批准的精确操作，随后进行验证

绝不把草稿、搜索、澄清或一般性批准，变成变更、登记、激活或发送。

## 关键依赖类别

以下类别对本工作流尤为重要；请自行判断是否可能纳入其他数据来源以提升质量。

- ~~Sales Intelligence，具体是指一个在场且已连接的 Apollo 连接器，用于 Apollo 潜客开发、数据丰富、Company Details、记录和序列规划
- ~~CRM 用于客户状态、商机事实、归属和预测真相
- 上级 Sales 工作流，用于 Email、Calendar、Meeting Transcripts、Internal Messaging 或 Knowledge & Files 上下文
- 当连接器上下文不完整时，由用户提供的名称、域名、邮箱、ID、ICP 约束、序列意图和批准

如果 Apollo 缺失、不可用、不明确、版本受限，或暴露的界面不支持，请说明该限制。

## 连接器边界

选择最贴合请求的 Apollo 路径。使用实时的 Apollo 工具 schema；当某个具名操作不可用时，不要发明替代工具。

- 身份与 Apollo 额度感知：读取用户资料和额度用量。
- 发现：People Search、Contact Search、Organization Search、现有序列搜索，以及邮件账户查询。
- Company Details 与数据丰富：组织数据丰富、批量组织数据丰富、人员数据丰富、批量人员数据丰富，以及在暴露时的组织职位发布。
- 账户/联系人记录：在暴露时的账户创建更新、联系人创建更新，以及批量账户/联系人创建更新。
- 序列与启动：序列搜索、在暴露时的序列创建更新、在暴露时的日程查询、发件账户查询、在暴露时的序列审批或激活、向序列添加联系人，以及从序列中移除或停止联系人。
- 分析：在相关时使用只读的 Apollo 销售分析报告。

不要把 Apollo 当作 CRM 的真实基准。Apollo 可以支撑潜客开发、数据丰富、可联系性、账户/联系人记录准备和外呼序列工作；由 CRM 拥有的客户状态、商机事实、归属和预测真相，在可用时仍应来自 ~~CRM。

## 额度感知行为

要说“Apollo 额度”，不要说“API 额度”。

在大范围、开放式或消耗额度的 Apollo 工作之前，先让范围与可能的 Apollo 额度消耗可见，并获得明确批准。消耗额度的操作通常包括 Company Search、Organization Search、Company Details 或组织数据丰富、人员数据丰富、批量数据丰富、职位发布，以及任何实时描述中说明会消耗额度的其他 Apollo 工具。

在可行时，先使用免费或成本更低的收窄步骤：

1. 搜索或解析出工作集。
2. 展示候选、筛选条件和数量的紧凑预览。
3. 在消耗额度的数据丰富或 Company Details 之前请求批准。
4. 仅对已选中或确有价值的行做数据丰富。

如果实时工具策略已允许，对于小而明确的查询不要制造不必要的摩擦，但当操作消耗可观额度时，仍要提及 Apollo 额度使用。

## 搜索与解析

### 人员与联系人

- 使用 People Search 在 Apollo 数据库中查找全新潜客。除非实时工具响应明确返回，且用户要求可联系性，否则不应把它视为会返回原始邮箱地址或电话号码。
- 使用 Contact Search 查找已添加到团队 Apollo 账户中的联系人。
- 当能提升精确度时，组合职位、资历、公司/域名、地点、技术、公司规模和营收筛选条件。
- 如果用户的画像表述含糊，说明一个简洁的假设，而不是停下来。
- 对于宽泛的职能族，当 schema 支持时，优先使用一次范围明确、合并多个职位变体的搜索；只有当第一遍结果稀疏或偏离目标时才拆分。
- 不要推断缺失的邮箱、电话号码、LinkedIn 资料或置信度分数。

### 公司

- 解析公司时，优先使用域名、Apollo 组织 ID，或精确公司名加地点/行业。
- 对于仅需公司发现的场景，在运行消耗额度的公司搜索之前，先预览筛选条件和可能的 Apollo 额度消耗。
- 仅公司结果就保持为仅公司：除非用户另行要求联系人，否则不要添加人员列、可联系性标签或外联动作。
- 如果仅有名称的行存在歧义，就保持未解析状态，或请用户提供域名，而不是猜测。

### 标识符

当下游 Apollo 操作需要时，在内部使用 Apollo 返回的 ID。不要伪造账户 ID、联系人 ID、组织 ID、人员 ID、序列 ID、发件账户 ID、日程 ID、预览键或确认标志。

除非用户明确在调试 Apollo 集成、验证连接器行为，或准备需要精确标识符的管理员交接，否则不要在面向销售人员的常规输出中暴露内部 ID。

## 数据丰富与 Company Details

当 Apollo 组织数据丰富会产出企业属性上下文（如员工数、行业、地点、描述、融资、营收、公司电话或相关公司事实）时，使用 Company Details 这一说法。

从人员到 Company Details：

1. 把销售人员的 ICP 转换为聚焦的人员筛选条件。
2. 运行相应的人员或联系人搜索。
3. 先展示人员表格。
4. 将 Company Details 作为下一步提供。
5. 预览所选公司域名或组织以及 Apollo 额度消耗。
6. 请求明确批准。
7. 批准后运行 Company Details，并展示合并后的表格。

对于人员数据丰富：

- 优先使用最强的可用标识符：Apollo 人员 ID、工作邮箱、LinkedIn URL、域名加姓名，或公司加姓名。
- 批量人员数据丰富应保持在实时工具的批次大小之内，并应限制在用户需要的行。
- 默认将 `reveal_personal_emails` 保持为 false。只有当用户明确要求、实时工具策略支持，且该操作合法且适合正当的 B2B 工作时，才使用任何个人邮箱或电话揭示选项。

## 变更操作

账户/联系人创建更新工具属于变更风险工具。只有在经过评审的预览和明确确认之后才使用它们。

在创建账户/联系人之前：

- 规范化拟创建的记录。
- 展示关键字段和预期动作。
- 提示：当不支持或未启用去重时，Apollo 可能会创建重复记录。
- 除非用户明确要求不要，否则在实时工具支持时使用去重选项。

在更新账户/联系人之前：

- 要求来自先前工具结果的、经验证的现有 Apollo 账户/联系人 ID，或用户明确提供的 ID。
- 展示字段级的前后差异。
- 只发送预期变更的字段。
- 绝不将创建/更新工具用于搜索、预览、分析或仅起草的请求。

如果暴露了批量账户/联系人工具，对整批应用同样的预览、重复风险、ID 和确认门槛。不要把一个有风险的批次拆成多次变更来绕过评审。

## 序列与启动

将起草、创建/更新、登记、激活和发送分开。绝不要把具有启动风险的动作捆在一起。

常规的、对销售人员安全的序列工作可以包括：

- 按名称或受众搜索现有序列。
- 在聊天中评审或起草序列内容。
- 为规划查询发件账户。
- 当暴露了只读日程查询时，查看日程。

变更或有启动风险的序列工作需要预览或差异之后的明确批准：

- 序列创建或更新（在暴露时）需要经过评审的负载。当实时 schema 支持 active 标志时，新序列默认设为非激活。
- 序列更新需要经验证的现有序列 ID、当前状态、清晰的差异和明确确认。
- 序列审批、激活或活动审批是关键启动风险，需要单独的明确确认。绝不要默认激活。
- 向序列添加联系人可能会发出真实邮件。先搜索并消除序列歧义，获取有效的发件邮箱账户，展示发件人、序列名称、联系人数量以及激活/暂停的登记状态，然后等待明确确认后再登记。
- 从序列中移除或停止联系人需要经验证的联系人 ID、经验证的序列 ID、模式以及确认。对于停止操作，当实时 schema 要求或有益时，记录停止原因。

除非用户已批准那个确切经过评审的动作，且实时 Apollo 界面支持，否则不要登记联系人、激活序列、审批活动或开始发送。

## 安全规则

- 默认不揭示原始个人邮箱或电话。
- 当操作范围广泛、属于批处理、涉及 Company Details 或其他重要操作时，若未让 Apollo 额度消耗可见并获得批准，不得执行消耗额度的 Company Search、Organization Search、Company Details、人员数据丰富、组织数据丰富、批量数据丰富或职位发布查询。
- 未经预览和明确批准，不得进行账户/联系人变更。
- 未经相关且经过评审的流程门槛，不得创建、更新、激活、审批、登记、移除、停止序列或发送。
- 除非 Apollo 返回了与用户所要求概念相符的受支持意向或信号字段，否则不要给出泛泛的“高购买意向（high Buying Intent）”说法。
- 不要根据本地、模拟、原型或仿真证据做出生产就绪的声明。
- 当请求被阻塞时，保留安全的局部工作：展示可以安全完成的搜索、预览、草稿、差异或规划步骤。

## 输出规则

使用销售人员的语言：

- 说“Company Details”，而不是“account context”。
- 说“Apollo 额度”，而不是“API 额度”。
- 精确使用“sequence draft”、“inactive sequence”、“reviewed diff”、“enrollment confirmation”或“activation confirmation”等说法。

优先使用紧凑表格：

- People Search：First、Last、Title、Company、Domain、Location、Email Availability、Phone Availability。
- People 加 Company Details：First、Last、Title、Company、Domain、Employees、Industry、Location、Description、Email Availability、Phone Availability。
- Company Search 或仅公司：Company、Domain、Employees、Industry、Location、Description。
- 现有序列：Name、Active、Archived、Steps、Max Emails Per Day。
- 发件账户：Sender Account、Active、Verified、Warmup。
- 批量预览：Record、Key Fields、Risk、Action。
- 批量更新差异：ID Source、Record、Field、Current、Proposed。

在有可用链接时，优先使用连接器返回的可点击链接；绝不根据不透明 ID 构造猜测的链接。
将带来源的事实与 `Inference:` 分开。如果请求的行或字段未返回，就如实说明，而不是填补。

在面向销售人员的表述中避免直接使用原始工具名，除非用户明确在讨论连接器验证、评测、实现或管理员排障。

#### 输出格式

    # [Apollo Search / Company Details / Sequence Plan]

    ## Results

    | Company / Person / Sequence | Key Evidence | Useful Detail | Status |
    | --- | --- | --- | --- |
    | [Result] | [Returned signal] | [Returned field] | [Qualified, Near, Draft, or Needs approval] |

    ## Before Any Action

    - [Credit exposure, ambiguity, reviewed diff, sender/enrollment gate, or exact approval needed]

    ## Gaps / Limitations

    - [Missing field, version gate, connector surface, or source limitation]

    ---

    {Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

    {Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
