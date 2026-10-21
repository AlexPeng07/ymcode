---
name: hubspot
description: 仅在聚焦的 Sales 工作流已选定一个已连接的 HubSpot CRM，或用户明确要求 HubSpot 相关指引、读取、草稿、备注或经评审的记录变更时使用。当另有 CRM 为权威来源时不要使用。 | HubSpot, CRM reads, CRM updates, deals, contacts, properties
---

# HubSpot 使用指南

准备可信的、由 HubSpot 支撑的上下文，或一个经过安全评审的 HubSpot 操作，同时让周围的 Sales 工作流继续作为业务任务的权威。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## HubSpot 操作排序

当所请求的 HubSpot 工作或记录不明确时，使用以下优先顺序。

1. 用户明确请求、点名记录、HubSpot ID、公司、交易、联系人、工单或明确说明的动作
2. 当前 Sales 工作流所需的只读 CRM 上下文
3. 根据用户措辞和业务上下文解析出的精确记录或高置信度候选
4. 足以回答请求的最小属性集、关联、活动上下文或结果页
5. 一份经过评审的拟议 HubSpot 变更草稿
6. 明确批准且受支持的 HubSpot 写入，随后进行验证

不要在多个可能记录之间默默挑选，不要把读取扩大为写入，也不要把澄清视为写入批准。

## 关键依赖类别

以下类别对本工作流尤为重要；请自行判断是否可能纳入其他数据来源以提升质量。

- ~~CRM，具体是指暴露的 HubSpot 连接器，用于 HubSpot 支撑的身份、记录、属性、关联、链接和已批准的写入
- 上级 Sales 工作流，用于 HubSpot 不拥有的 Calendar、Meeting Transcripts、Email、Internal Messaging、Knowledge & Files 或 Sales Intelligence 上下文
- 当连接器访问不可用或记录需要消歧时，由用户提供的记录 ID、名称、导出文件、属性值和业务上下文

如果 HubSpot 缺失、不可用、过时、不明确，或受暴露的连接器界面限制，请说明，并把该回答标注为并非由 HubSpot 支撑。

## 工作流指引

这些 HubSpot 专属步骤将覆盖索引技能中的默认工作流。

- 1. 确定访问权限与目标
    - 先使用 get_user_details 确认已连接的门户，以及暴露的对象读写可用性。
    - 确定用户想要的是读取、草稿还是已批准的写入；当这些会影响回答时，识别对象类型、负责人或团队、管道、时间范围、阶段和精确记录。
    - 对于不明确的记录，做最小的有界候选查询，并在用于摘要或写入之前请用户选择。
- 2. 发现属性与记录
    - 当字段不确定时，使用 search_properties，最多五个聚焦关键词；使用 get_properties 确认枚举值和可写属性。
    - 使用 search_crm_objects 进行搜索、计数、筛选、分页和关联。对于已知 ID 使用 get_crm_objects。不要使用已弃用的 search 或 fetch。
    - 仅检索会影响销售决策的属性和关联。说明筛选条件、总数、分页或样本上限，以及分析是否为抽样。
- 3. 起草、批准并验证
    - 对于拟议变更，在调用 manage_crm_objects 之前展示精确的字段级草稿。
    - 只有在用户明确批准那个确切经过评审的变更或批次之后才写入。每批最多 10 个对象，并单独确认关联。
    - 针对某个批次的评审批准仅适用于那个确切的批次；绝不要提供笼统的确认绕过。
    - 检查写入响应，当响应不能证明结果时，用一次窄范围读取进行验证。

## HubSpot 规则

- 优先使用精确 ID、域名、邮箱和全名加公司，而不是仅凭名称的模糊匹配。
- 在使用某个属性或枚举进行查询或写入之前，确认属性标签、内部名称、枚举值和可写性；不要猜测它们。
- 对于 HubSpot 拥有的账户、联系人、交易、工单、负责人、管道和活动事实，将 HubSpot 作为 CRM 真相。不要让补充信息或网络上下文覆盖 CRM 真相。
- 在可用时，附上连接器返回的或可信的 HubSpot 记录 URL（带 UTM 参数）。
- 不要写入推断数据、在未明确同意的情况下覆盖用户录入的上下文，或未经明确批准变更关联。
- 不要暗示支持实时连接器并未暴露的对象、属性、分页行为、批量大小或写入。

## 连接器边界

仅使用实际暴露的 HubSpot 界面：

- 身份与访问：get_user_details
- 属性发现：search_properties、get_properties
- 记录搜索与读取：search_crm_objects、get_crm_objects
- 经评审的写入：manage_crm_objects

对于不支持的批量导出、删除、合并、去重、任意自动化或未暴露的对象操作，说明缺失的能力，并提供更窄的读取、一份草稿或另一个已批准的来源。

## 模式

### 1. HubSpot 读取

- 用于公司、交易、联系人、工单、负责人、活动、属性或关联上下文。
- 确定目标，仅检索与决策相关的字段，并指出歧义或缺口。

#### 输出格式

    # [HubSpot Record Or Context]

    ## Summary

    - [Most important CRM fact with trusted link]
    - [Current deal, company, contact, activity, or association signal]
    - [Risk, missing property, ambiguity, or source gap]

    ---

    {Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

    {Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}

### 2. HubSpot 更新草稿

- 当用户要求准备备注、属性变更、关联、创建或更新，但尚未批准写入时使用。
- 将当前值与拟议值分开，并指明确切的目标。

#### 输出格式

    # Proposed HubSpot Update

    **Target:** [Record name, type, and trusted link or ID]

    | Property / Association | Current Value | Proposed Value | Reason / Source |
    | --- | --- | --- | --- |
    | [Label] | [Current or Unknown] | [Proposed] | [Grounded reason + link] |

    ## Before I Write

    - [Missing input, association confirmation, validation risk, or approval needed]

    ---

    {Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

    {Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}

### 3. 已批准的 HubSpot 写入

- 仅在针对确切经过评审的对象或批次获得明确批准后使用。
- 当写入响应不确定时，在报告完成之前先验证。

#### 输出格式

    # HubSpot Updated

    **Record:** [Name, type, and trusted link or ID]

    - **Changed:** [Property or association]
    - **Result:** [Verified outcome]
    - **Not changed:** [Unsupported or skipped item]

    ---

    {Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

    {Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
