---
name: zoominfo
description: 仅在聚焦的 Sales 工作流已选定一个在场且已连接的 ZoomInfo 连接器，或用户明确要求 ZoomInfo 公司搜索、联系人搜索、数据丰富、意向、相似客户、推荐或研究时使用。当已选择其他数据丰富来源时不要使用。 | ZoomInfo, company search, contact search, enrichment, intent, lookalikes
---

# ZoomInfo 使用指南

在上级 Sales 工作流选定之后，使用 ZoomInfo 完成聚焦的销售情报工作。销售人员的任务仍以上级工作流为准；本指南负责 ZoomInfo 专属的查询、搜索、身份、数据丰富、额度和结果质量规则。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## ZoomInfo 操作排序

1. 用户明确请求、点名的公司或人员、域名、邮箱、ZoomInfo ID 或明确说明的约束
2. 当前 Sales 工作流所需的最窄 ZoomInfo 路径
3. 从强标识符解析出的标准公司或联系人身份
4. 在数据丰富、研究、相似度或推荐之前先搜索并形成短名单
5. 能实质改善回答的最小消耗额度步骤
6. 清晰区分合格匹配、近似匹配和缺口的结果

不要悄悄放宽硬性筛选条件、猜测身份，或把 ZoomInfo 当作 CRM 的真实基准。

## 关键依赖类别

以下类别对本工作流尤为重要；请自行判断是否可能纳入其他数据来源以提升质量。

- ~~Sales Intelligence，具体是指一个在场且已连接的 ZoomInfo 连接器，用于 ZoomInfo 搜索、数据丰富、意向、相似度、推荐和研究
- ~~CRM 用于账户归属、客户状态、商机事实和预测真相
- 上级 Sales 工作流，用于 Calendar、Meeting Transcripts、Email、Internal Messaging 或 Knowledge & Files 上下文
- 当连接器访问或身份不完整时，由用户提供的名称、域名、邮箱、ID、ICP 约束和业务上下文

如果 ZoomInfo 缺失、不可用、不明确，或受暴露的连接器界面限制，请说明该限制，而不要用无支撑的主张替代。

## 连接器边界

ZoomInfo 支持若干不同的路径。选择最贴合请求的最窄路径。

- 发现：`lookup`、`search_companies`、`search_contacts`、`search_intent`
- 结构化数据丰富：`enrich_companies`、`enrich_contacts`、`enrich_intent`
- 叙述性研究：`account_research`、`contact_research`
- 相似度与推荐：`find_similar_companies`、`find_similar_contacts`、`get_recommended_contacts`
- 仅在用户要求时的连接器反馈：`submit_feedback`

不要混淆这些路径：

- 使用 `search_*` 发现候选。
- 当用户想要更强的结构化字段或经过核实的细节核对时，使用 `enrich_*`。
- 当用户想要叙述性简报、会议准备或更广的情境速览时，使用 `account_research` 或 `contact_research`。
- 将相似度或推荐动作用于“更多类似这样的对象”、账户扩展或利益相关方发现，而不是作为精确搜索筛选的替代。

不要把 ZoomInfo 当作 CRM 的真实基准。如果研究响应包含关系或互动上下文，将其标注为连接器呈现的上下文，除非它得到了 ~~CRM 或周围工作流的独立佐证。

## 默认解析模式

按顺序执行以下步骤。

1. 归类目标：
   - 公司集合
   - 联系人集合
   - 一家已知公司
   - 一位已知人员
   - 买方意向话题
   - 相似客户或推荐请求
2. 在搜索前归一化硬性筛选条件：
   - 地域
   - 管理层级
   - 部门或职能族
   - 员工数或营收区间
   - 行业或公司类型
   - 技术筛选
   - 意向话题
3. 当连接器需要标准化值时，在搜索或意向流程之前使用 `lookup`。
4. 在依赖 ID 的数据丰富、研究或推荐动作之前，先解析标准的公司或联系人身份。
5. 在把返回的行总结为匹配之前，先核实它们确实满足用户的硬性约束。
6. 说明哪些未找到、支撑薄弱或受连接器限制，而不是把缺口抹平。

## Lookup 纪律

使用 `lookup` 获取受支持的值，而不是猜测连接器专属的类别。

- 当这些约束重要时，用它处理 `management-levels`、`metro-regions`、`industries`、`employee-count`、`departments`、`job-functions`、`company-types`、`revenue-ranges`、`tech-vendors`、`tech-products` 和 `intent-topics`。
- 当下游动作期望标识符时，使用 `lookup` 返回的标准化标识符，而不是美化的展示标签。
- 对于技术栈搜索，先解析厂商，再解析该确切厂商的产品，然后把返回的产品标识符传入搜索。
- 对于意向工作流，先检索确切的受支持意向话题。如果所请求的概念无法清晰映射到受支持话题，只有在确实接近时才呈现最接近的受支持话题；否则说明该请求无法通过当前话题分类体系精确表达。

不要编造 lookup 值，也不要悄悄替换成相邻类别而不加说明。

## 标识符解析

在依赖 ID 的动作之前，谨慎解析实体。

### 公司

- 优先使用 `companyId`、域名、网站或股票代码，而不是仅用公司名称。
- 如果用户只提供公司名称，而下一步需要数据丰富、研究或目标公司 ID，在身份不明显时先用 `search_companies` 找到标准公司行。
- 如果仍有多个可能的公司，使用域名、总部、行业或用户的周边上下文消歧。如果歧义仍然重要，就呈现候选集合，而不是默默挑一个。
- 对于公司数据丰富，在可用时优先使用 `companyId`、`domain` 或 `companyWebsite`，而不是仅凭名称的模糊输入。

### 联系人

- 优先使用 `personId`、工作邮箱，或精确的全名加公司组合，而不是仅用姓名。
- 如果用户要求联系人研究、相似联系人，或其他依赖人员 ID、且从姓名出发的工作流，先用 `search_contacts` 解析目标人员。
- 如果同一姓名对应多个可能的人员，保持候选列表明确，不要编造单一匹配。
- 对于联系人数据丰富，使用可用的最强受支持标识符；当一次搜索能降低身份歧义时，避免仅凭姓名的宽泛丰富。

### 运行时形态

- 以动作可接受的、运行时可兼容的原始形态传入连接器返回的标识符。
- 当连接器呈现数值型 ZoomInfo 标识符，而目标动作在运行时需要数值型标识符时，保持其为数值，而不是改写为文字或猜测新值。
- 如果某个动作拒绝了看似有效的标识符形态，在目标明确无歧义时，仅用直接对应的连接器返回原始值重试一次。如果仍然失败，报告连接器契约不匹配，并仅用风险较低的可用证据继续。

## 搜索纪律

### 公司搜索

- 在搜索前把用户的 ICP 转换为明确的筛选条件。
- 当连接器支持时，优先使用针对地域、员工数、营收、公司类型、融资、增长和技术使用的结构化筛选。
- 如果用户要求“美国公司”“加州公司”或其他硬性地域条件，在把每个返回结果称为合格匹配之前，先核实它符合所要求的地区。
- 如果搜索返回接近但不完美的行，把 `Matches` 与 `Near Matches` 分开，而不是隐藏这种区别。
- 不要仅凭一个有界结果页就声称覆盖了完整市场。

### 联系人搜索

- 当能提升精确度时，组合使用管理层级、部门、职能、公司和职位筛选。
- 对于“VP、总监或 RevOps 负责人”这类职能族请求，先从最窄、最可能奏效的结构化解读开始。
- 如果单次宽泛的职位查询返回稀薄、明显不完整或偏离目标的结果，就把该职能族拆成少量定向搜索，合并重复项，并总结去重后的短名单。
- 优先使用直接返回的业务字段。不要推断私人邮箱地址、个人电话或缺失的职业资料。

### 意向搜索

- 在 `search_intent` 或 `enrich_intent` 之前，始终用 `lookup` 解析确切的意向话题。
- 在回答中保持话题含义可见，让用户能看到实际搜索了什么。
- 如果返回的意向话题与用户概念存在实质性的更窄、更宽或相邻差异，请说明。
- 如果话题 lookup 或搜索路径无法忠实支撑所请求的概念，报告该限制，而不是夸大结果。

## 数据丰富与研究的先后顺序

在可行时，先使用成本更低的收窄步骤，再使用昂贵或不够精确的动作。

- 当实体本身不清晰时，先搜索。
- 当用户需要企业属性字段、可联系性字段或可用于批处理的表格输出时，使用结构化数据丰富。
- 当用户需要简报、情境感知或会议准备式的综合时，使用叙述性研究。
- 对于 Top-N 发现请求，不要默认对每个原始候选都做数据丰富。先收窄，然后只对能实质改善回答的短名单做丰富。
- 当相似度或推荐工作流返回稀疏的人员或公司细节时，仅在用户要求可执行细节，或周围工作流需要时，增加一次定向的数据丰富。

## 相似度与推荐流程

### 相似公司

- 当用户要求发现类似竞品、相似客户或相邻账户时，使用 `find_similar_companies`。
- 如果参照公司不明确，在相似度调用之前先解析它。
- 如果用户想要可用的市场名单，而不是原始的相似度结果，就对最终短名单做恰如其分的数据丰富，以提供所要求的基础信息，例如网站、地点、员工规模或简洁描述。

### 相似联系人

- 当用户给出姓名时，用 `search_contacts` 解析 `referencePersonId`。
- 当用户想要某个特定账户内的相似联系人时，用 `search_companies` 解析 `targetCompanyId`。
- 使用返回的元数据解释推荐，而不是编造相似度理由。

### 推荐联系人

- 先解析目标公司。
- 选择与用户意图匹配的推荐用例：
  - `PROSPECTING`
  - `DEAL_ACCELERATION`
  - `RENEWAL_AND_GROWTH`
- 当该用例会影响解读时，在最终速览中说明它的含义。
- 把推荐分数视为排序信号，而不是响应概率或必然成功。

## 额度感知行为

在工作流允许时，先使用免费或成本更低的发现步骤，再使用消耗额度的数据丰富或 AI 研究。

- 在适当时先使用 `lookup`、`search_companies`、`search_contacts` 和 `search_intent` 收窄范围。
- 当用户要求这些动作所能提供的更强结果时，使用 `enrich_companies`、`enrich_contacts`、`enrich_intent`、`account_research` 和 `contact_research`。
- 对于宽泛的批量请求，在回答中让动作范围可见，并避免对明显薄弱的候选做不必要的丰富。

不要为小型、明确要求的丰富任务制造摩擦。当连接器结果可能消耗了可观额度，或更窄的重跑会明显更便宜时，确实需要明确说明。

## 失败处理

- 如果连接器没有返回结果，写明 `no clear ZoomInfo match returned`，而不是编造一个。
- 如果结果违反硬性筛选条件，就把它们排除在合格集合之外，并提及该不匹配。
- 如果某个必需的 lookup 值不可用，说明哪个约束无法清晰表达。
- 如果研究响应稀薄或泛泛，保留有用的部分，但把覆盖度标注为有限。
- 如果推荐或相似度调用产出较弱，说明还需要哪些额外数据丰富或用户上下文。
- 如果连接器行为看起来与其自身的动作契约不一致，且该不一致影响完整性或置信度，就在回答中如实描述。

## 输出规则

- 对于候选名单、数据丰富输出、相似公司清单和联系人推荐，优先使用紧凑表格。
- 在可用时优先使用连接器返回的可点击链接；绝不根据不透明 ID 构造猜测的链接。
- 分开呈现：
  - `Qualified matches`
  - 在有用时的 `Near matches`
  - `Gaps / connector limitations`
- 将带来源的事实与 `Inference:` 分开。
- 不要猜测连接器未呈现的邮箱、电话号码、确切意向或置信度水平。
- 当回答依赖连接器报告的字段或推荐元数据时，直接说明这一点。
- 如果用户的请求要求排序名单，就按明确的连接器信号或所述的准则排序，而不是按不可见的模型偏好。

#### 输出格式

    # [ZoomInfo Search / Enrichment / Research]

    ## Qualified Matches

    | Company / Person | Key Match Evidence | Useful Detail | Source |
    | --- | --- | --- | --- |
    | [Result] | [Hard filters satisfied] | [Returned field] | [Link or connector source] |

    ## Near Matches

    - [Result + exact mismatch, when useful]

    ## Gaps / Connector Limitations

    - [Missing field, unsupported filter, bounded coverage, ambiguity, or credit-aware next step]

    ---

    {Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

    {Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
