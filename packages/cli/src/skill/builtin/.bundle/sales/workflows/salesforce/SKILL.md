---
name: salesforce
description: 当聚焦的 Sales 工作流需要 Salesforce 支撑的 CRM 读取、链接、草稿、备注、账户计划、Agentforce 指派，或用户明确要求 Salesforce 连接器/查询指引时使用。不要用于通用 CRM 应用构建，或当另有 CRM 为权威来源时。 | Salesforce, CRM reads, account plan, Agentforce, SOQL
---

# Salesforce 使用指南

让销售人员获得可信的 Salesforce 上下文，或一个经过安全评审的 Salesforce 操作，同时让周围的 Sales 工作流继续作为业务任务的权威。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## Salesforce 操作排序

当所请求的 Salesforce 工作或记录不明确时，使用以下优先顺序。

1. 用户明确请求、点名记录、Salesforce id、账户、商机、联系人、线索或明确说明的动作
2. 有助于当前 Sales 工作流做出决策的只读上下文
3. 根据用户措辞和业务上下文解析出的精确记录或高置信度候选
4. 足以回答请求的最小字段集、活动历史、账户计划、事件或转录上下文
5. 一份经过评审的拟议 Salesforce 变更草稿
6. 明确批准且受支持的 Salesforce 写入，随后进行验证

不要在多个可能记录之间默默挑选，不要把读取扩大为写入，也不要把澄清回答视为写入批准。

## 关键依赖类别

以下类别对本工作流尤为重要；请自行判断是否可能纳入其他数据来源以提升质量。

- ~~CRM，具体是指暴露的 Agentforce Sales/Salesforce 连接器，用于 Salesforce 支撑的读取、记录链接、账户计划、转录摘要、Agentforce Lead Nurturing 指派和已批准的写入
- 上级 Sales 工作流，用于 Salesforce 不拥有的 Calendar、Scheduling、Meeting Transcripts、Email、Internal Messaging、Knowledge & Files 或 Sales Intelligence 上下文
- 当连接器访问不可用或记录需要消歧时，由用户提供的记录 id、名称、导出文件、字段值和业务上下文

避免无支撑的主张。如果 Salesforce 缺失、不可用、过时、不明确，或受暴露的连接器界面限制，请说明该限制。

## 工作流指引

严格遵守以下工作流步骤。它们将覆盖索引技能中的默认工作流。

- 1. 澄清并收集上下文
    - 确定 Salesforce 任务、目标记录、所需细节，以及用户想要的是读取、草稿还是已批准的写入。
    - 对于不明确的记录，做最小的精确或有界候选查询，然后在用于摘要或写入之前请用户选择。
- 2. 初稿
    - 优先使用只读发现，以及最小的正确记录读取或查询。在面向用户的输出中使用标签，并在有可信 URL 时附上可点击的记录链接。
    - 对于拟议变更，渲染一份经过评审的字段级草稿，包含假设、来源缺口和仍需要的精确批准。
- 3. 已批准的动作与验证
    - 只有当用户明确要求写入，或批准了经过评审的草稿/更新时才写入。
    - 写入前确认目标记录和受支持的字段，只发送预期变更，检查响应，并在响应不能证明结果时用一次窄范围读取进行验证。

## 总体规则

- 在有可用链接时，始终用超链接引用来源。
- 让上级工作流对销售任务保持权威；本指南负责 Salesforce 专属的查询、检索、链接、账户计划动作、指派和写入安全。
- 优先发现而不是猜测。先使用精确 id 或名称，然后是有界候选，在歧义仍存在时再请用户选择。
- 不要暗示支持未暴露的连接器能力。
- 未经明确批准，不要删除、按外部 id upsert、调用任意自动化或执行写入。

## 连接器边界

仅使用实际暴露的 Agentforce Sales 能力：

- 元数据与身份：describe_global、describe_sobject、get_user_info
- 记录检索与读取：get_record_id_by_name、get_record_details、get_activity_history
- 查询：仅 soql_query
- 销售专属读取：query_calendar_events、get_account_plan、query_agent_type、summarize_conversation_transcript
- 写入与变更工作流：create_record、update_record、create_account_plan、assign_target_to_sdr

不要暗示支持 SOSL、全局文本搜索、查询续页、Bulk API、Composite API、Data 360、Tableau Analytics、Prompt Builder、Flow 调用、任意可调用动作、通用 Apex REST、删除，或按外部 id upsert。对于不支持的跨对象关键词搜索、大批量导出、高并发写入、删除/upsert 或分析请求，说明缺失的能力，并索取更窄的对象、字段、精确标识符或另一个已批准的来源。

## Salesforce 查询与写入规则

### 发现与读取

- Salesforce 是 Salesforce 支撑的读取、链接、账户计划、指派、转录摘要和写入所必需的。如果无法使用它，就把该回答标注为并非由 Salesforce 支撑。
- 对于 my、me 或当前负责人的请求，使用 get_user_info。对于不确定的对象使用 describe_global，并在不显然的查询或写入之前使用 describe_sobject。
- 仅当会影响任务时，才确认 API 名称、标签、数据类型、可筛选性、可创建性、可更新性、可空性、选项列表、引用、关系名称和记录类型。
- 不要猜测关系名称。把宽泛的通配匹配视为候选，用业务上下文消歧，如果一次定向筛选无法解析该记录，则在摘要或写入之前询问。
- 当名称必须转换为 id 时使用 get_record_id_by_name，需要可用于展示的布局上下文时使用 get_record_details，需要活动摘要时使用 get_activity_history，需要 Salesforce Events 时使用 query_calendar_events，需要账户策略上下文时使用 get_account_plan。
- 在 summarize_conversation_transcript 之前，先解析具体的 VoiceCall 或 VideoCall id。如果通话未知，分别查询 VoiceCall 和 VideoCall，然后询问要总结哪一通。

### 查询防护规则

- 对于非平凡的 SOQL，先识别目标对象、所需字段、筛选条件、排序或上限、展示还是分析用途，以及选择性问题。
- 使用最简单的正确查询，且只包含所需字段；当行可能被链接或复用时包含 Id；加上合理的 LIMIT；并且只在 Salesforce 报告为可筛选的字段上筛选。
- 不要发送聚合或分组的 SOQL，包括 COUNT、SUM、GROUP BY 或聚合别名。检索一个有界的、带 id 的集合，在本地汇总，或说明无法提供精确的聚合覆盖。
- 不要在长文本、富文本、Task.Description、历史 OldValue/NewValue、IsPriorityRecord 或其他可读但不可筛选的字段上筛选。改为按父级、日期、负责人、状态或其他可筛选字段限定范围，并在有界时本地后置筛选。
- 仅对多选选项列表使用 INCLUDES 或 EXCLUDES。把 FieldDefinition 查询限定到已知实体，让每个 OR 析取项只作用于一个字段，并在本地合并前拆开跨字段发现。
- 优先使用标准的 Account、Opportunity、Contact、Task 和 Event 字段，而不是可选或自定义字段。对同一事实出现两次定向的 schema 或查询形态失败后，回退到更安全的标准字段、精确读取、更窄的请求或明确的证据缺口。
- 区分显式的重新认证错误和运行时就绪失败。

### 写入与链接

- 对于 update_record，只发送变更的字段。对于 create_record，只发送预期字段，并且仅在记录类型字段会影响默认值、选项列表或可创建性时才包含它们。
- 不要通过试探写入来发现校验规则。如果 Salesforce 返回 FIELD_CUSTOM_VALIDATION_EXCEPTION，呈现确切的消息，并索取缺失或需更正的业务值。
- 对于账户计划，使用 create_account_plan 而不是通用记录创建。解析 AccountId，并先收集或推导 Name、challenge、competitive、relationship、strategy、StartDate 和 Status；如实报告不受支持的 AccountPlan 错误。
- 在 assign_target_to_sdr 之前，调用 query_agent_type、展示可用智能体，并获取用户的选择。目标必须是 Contact 或 Lead 的 id。
- 检查每次写入的响应，并在响应不能证明结果时，用返回的字段、get_record_details 或一次窄范围 soql_query 进行验证。
- 优先使用连接器返回的记录 URL。如果有可信的组织或实例基础 URL，就构造 Lightning 记录 URL；否则展示对象标签和 id，而不是编造链接。

## 模式

### 1. Salesforce 读取

- 当用户或上级 Sales 工作流需要账户、商机、联系人、线索、活动、事件、账户计划或转录上下文时使用。
- 先确定目标，仅检索影响销售决策的字段和历史，并指出缺口或歧义。

#### 输出格式

```md
# [Record Or Salesforce Context]

## Summary

- [Most important CRM fact with source link]
- [Current account, opportunity, contact, activity, or plan signal]
- [Risk, missing field, ambiguity, or source gap]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### 2. Salesforce 更新草稿

- 当用户要求准备 CRM 更新、备注、字段变更或创建动作，但尚未批准写入时使用。
- 将拟议值与当前值分开，并指明目标记录、假设和所需批准。

#### 输出格式

```md
# Proposed Salesforce Update

**Target:** [Record name, type, and trusted link or id]

| Field | Current Value | Proposed Value | Reason / Source |
| --- | --- | --- | --- |
| [Field label] | [Current value or Unknown] | [Proposed value] | [Grounded reason + link] |

## Before I Write

- [Missing business input, validation risk, or approval needed]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### 3. 已批准的 Salesforce 写入

- 仅在用户明确要求受支持的写入，或批准了经过评审的草稿之后使用。
- 当写入响应不确定时，在报告完成之前先验证结果。

#### 输出格式

```md
# Salesforce Updated

**Record:** [Record name, type, and trusted link or id]

- **Changed:** [Field or supported action]
- **Result:** [Verified outcome]
- **Not changed:** [Any requested item that was unsupported or skipped]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### 4. 账户计划、SDR 指派或转录

- 当用户明确要求账户计划、Agentforce Lead Nurturing 指派、Salesforce 事件，或语音/视频转录摘要时使用。
- 先解析所需记录或通话 id。对于 SDR 指派，先展示可用智能体并获取用户的选择，再行指派。

#### 输出格式

```md
# [Account Plan / SDR Assignment / Transcript Summary]

## Target

- [Resolved account, contact, lead, event, or call + trusted link]

## Result

- [Supported read, draft, or verified action]
- [Important limitation or missing required input]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```
