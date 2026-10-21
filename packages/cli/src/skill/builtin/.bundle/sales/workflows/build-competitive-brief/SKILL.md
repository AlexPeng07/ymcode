---
name: build-competitive-brief
description: "当用户需要竞品或供应商对比、市场格局分析、战术卡（battlecard）、异议包、定位简报或特定账户的竞争视角时使用。在适当情况下，利用提供的材料、已连接的调研来源和公开证据，产出以证据为支撑的对比、建议和简报。 | competitive brief, battlecard, competitor comparison, objection handling, positioning, market landscape"
---

# 构建竞品简报

创建一份可直接供销售人员使用的竞品简报，把经核实的事实与一线信号、推断区分开。默认产出自包含的 HTML 产物加简洁的聊天速览；只有当用户明确要求时才使用聊天或 Markdown。本技能负责调研、综合与简报产物，不负责对外发布或写入 CRM。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices。

## 关键依赖类别

使用与请求切实相关的类别；不要仅因某个来源可用就扩大搜索。

- ~~CRM 用于账户、商机、联系人、归属、已知竞品和活跃交易的真实情况
- ~~Knowledge & Files 用于战术卡、竞品文档、账户计划、产品定位、论据和既往简报
- ~~Internal Messaging 用于近期一线信号、账户团队观察、异议示例，以及在内部上下文重要时的真相来源路由
- ~~Meeting Transcripts 用于既往异议、竞品提及、买方用语、决策和承诺
- ~~Sales Intelligence 仅在能锐化竞品发现、公司上下文或某个具体证据缺口时使用

使用公开研究获取当前的公开竞品事实。优先采用官方的产品、定价、发布、客户案例、投资者和监管来源；只有在手来源不足时才使用二手报道。

## 参考资料加载

`SKILL.md` 负责常规调研流程、默认产出 HTML 的行为和证据防护规则。只有当参考资料的额外细节确有必要时才加载：

- 当需要结构化输入、模式归一化或矩阵边界时，使用 [references/request-schema.yaml](references/request-schema.yaml)。
- 当来源冲突、权威顺序或公开证明的降级处理不明确时，使用 [references/source-priority.md](references/source-priority.md)。
- 当需要精确的章节顺序、精简版简报变体或机器可读兼容性时，使用 [references/output-contract.md](references/output-contract.md)。

## 术语

- **战术卡（Battlecard）：** 一份紧凑的销售人员指南，说明如何针对某个竞品定位，包括对方在哪里占优、在哪里较弱，以及该说什么。
- **防御性准备（Defensive prep）：** 针对某个竞品的准备，即使证据不足以说明该竞品已参与当前交易，它仍可能相关。

## 工作流指引

### 1. 确定对比锚点

- 需要一个有用的锚点：点名的竞品、带有竞品背景的点名账户或交易，或明确的产品、工作流、细分市场或市场品类。
- 保留用户对销售方、竞品、账户和异议的原始措辞。仅在有把握时从提示或提供的材料中推断销售方；否则问一个针对性的问题。
- 当用户给出明确的产品、工作流、细分市场或市场品类但没有竞品名称时，从销售方上下文、买方上下文、产品范围、维护中的竞品材料和公开证据中发现可能的竞品。保持发现集合聚焦，并标注不确定性。
- 对于任何从来源推断而非用户提供的必需锚点，都需要用户确认。
- 如果锚点存在歧义，先做一次有边界的候选梳理：最多三次来源读取，仅够给出最多五个带一句话理由的具体候选。
- 当某个类似公司名的名称可能是竞品也可能是客户时，在可用时做一次有边界的 ~~CRM 检查。如果它解析为某个客户且用户没有明确说它是竞品，就按账户上下文处理，或请用户选择。
- 在用户确认推断出的必需锚点之前，不要做广泛的数据丰富。

### 2. 按权威顺序收集证据

除非用户指定更窄的通道，否则使用以下顺序：

1. 用户提供的笔记、演示文稿、转录、既往简报和链接材料
2. ~~Knowledge & Files 中的竞品文档、战术卡、账户计划和定位
3. ~~CRM 中针对点名账户或交易的真相
4. ~~Meeting Transcripts 与 ~~Internal Messaging，当它们能实质改变话术时
5. 官方的公开竞品与销售方来源
6. 投资者、监管或其他公开一手材料
7. ~~Sales Intelligence 与有信誉的二手报道，用于某个具体的剩余缺口

- 不要让通用的网络调研取代更强的用户材料或内部材料。
- 当销售方已知时，从销售方掌控的来源建立销售方基线：定位、产品线、目标细分、客户证明、近期发布和对比话术。
- 用公开一手来源验证关于当前定位、发布、定价、合作和公开证明的主张。
- 对于仅竞品的运行，在有多个不同证据单元时尽量收集多个。对于账户范围的运行，当用户已提供账户证据，或已连接来源能以窄范围获取时，补充账户证据。
- 除非得到账户证据、维护中的文档或公开证明的佐证，内部一线信号只作方向性参考。
- 对每个重要来源，提取一个具体证据单元：主张了什么、确认了什么、买方为何可能在意、如何反驳或重新框定，以及不应过度宣称什么。
- 在有可用链接时，用可点击链接引用重要主张。如果某个通道不可用、过时、稀薄或相互冲突，说明情况，并用最强的剩余证据继续。

### 3. 在综合之前建立档案

对每个在范围内的竞品，记录相关的可用事实：

- 概况、目标市场和所售内容
- 定位与买方吸引力
- 仅在得到支撑时才给出定价或定价话术
- 近期发布、版本、合作或公开证明
- 他们在哪里占优，以及销售方可以在哪里形成区隔
- 可能的异议、发现式问题、话术和雷区

不要把多个竞品压缩成同一个泛泛的故事。为每个竞品保留各自的证据与不确定性。

### 4. 谨慎补充账户上下文

- 当点名了账户时，先使用用户提供的账户笔记，并用 ~~CRM 获取账户与商机的真相。
- 有选择地使用 ~~Knowledge & Files、~~Meeting Transcripts 或 ~~Internal Messaging，当它们能锐化对当前账户的影响时。
- 不要让公开研究或泛泛的一线传言凭空编造账户状态、竞品存在情况或交易态势。
- 如果没有直接证据表明某竞品已参与该交易，就将账户部分标注为 Defensive prep。

### 5. 综合销售方的回应

- 默认使用 brief；当请求需要更窄的形态时，使用 objections、positioning 或 account_overlay。
- 单个矩阵中最多对比五个竞品，除非用户明确要求更多。
- 对于 1 对 1，使用 Area | Seller | Competitor | Readout。对于 1 对多，使用 Area | Seller read | Status | Main pressure。
- 使用诸如 Lead、Pressure from [Competitor]、Mixed 和 Not determined 之类的状态；当证据不支持时，不要强行给出赢家。
- 保持语气事实化且冷静。包含该说什么、该澄清什么、该用哪些证明，以及不该过度宣称什么；除非被要求，避免逐项功能对比。
- 交付包应回答：每个竞品在做什么、他们在哪里危险、他们为何获胜、为何落败、如何竞争，以及销售方或策略人员接下来该说什么。

示例 1 对 1 行：

| 维度 | MyCompany | Competitor Alpha | 解读 |
| --- | --- | --- | --- |
| 部署匹配 | 在受治理的企业级推广上更强 | 在团队级快速采用上更强 | 混合；需澄清买方的治理需求 |

示例 1 对多行：

| 维度 | MyCompany 解读 | 状态 | 主要压力 |
| --- | --- | --- | --- |
| 买方简洁性 | 若买方看重单一可问责的平台，则更强 | 面临 Competitor Beta 的压力 | 对狭窄的部门级用例，Competitor Beta 可能显得更简单 |

### 6. 创建并验证产物

- 默认输出：创建一个自包含的 UTF-8 HTML 简报，内联 CSS，不引用外部资源，然后提供简洁的聊天摘要。如果用户明确只要聊天、纯文本或 Markdown，就跳过 HTML，在聊天中呈现同样的实质内容。
- 当用户提供了目标位置时使用它。否则在当前工作区写入一个 sanitized-seller-compintel-date.html 文件；当写入工作区文件不合适时，使用安全的临时目录。覆盖已存在的用户可见文件之前先询问。
- 除非用户提供品牌规范，否则使用克制、中性、带演示文稿感的版式。不要硬编码公司配色、Logo、产品名或视觉体系。
- 包含顶层章节或标签页：Overview、Competitors、Guidance 和 Sources。
- 有用的通用提示或卡片标签包括 Trigger、Discovery questions、Positioning、Verified signals、Where they win、Where the seller can separate、Why this works、Proof、Use when 和 Landmine / do not say。
- 来源必须展示可点击的出处、证据局限，以及使用了哪些依赖类别、哪些不可用或与本任务无关。
- 读回生成的文件，验证必需的章节、来源出处和内嵌样式都存在。当有浏览器或 Playwright 风格的渲染器可用时，渲染一次，并在返回链接之前修复空白页、布局错乱、对比度不可读或 CSS 缺失的问题。
- 先返回可点击的产物链接，随后是简短速览和一个有用的下一步建议。不要在常规的面向用户文案中叙述 HTML 的实现机制。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 补充针对具体账户的叠加层，把已确认的交易证据与防御性准备分开。
- 针对销售人员当下的需要，创建仅异议或仅定位的版本。
- 结合竞争风险和发现式问题，准备一份会议简报。
- 起草一份简洁的内部赋能材料或账户团队更新供评审。
- 检查是否已存在相匹配的每周自动化，针对同一竞品、产品、品类或账户范围重跑本 `build-competitive-brief` 技能；若不存在，提出创建一个，让销售人员获得可复用的竞品摘要。
- 补齐最小的关键竞争证据缺口。

应避免的后续步骤：
- 发送、发布，或把无支撑的竞品主张变成面向客户的断言。

### 自动化建议防护

对于持久的竞品、品类、产品或特定账户竞争范围，当用户能从可复用的市场情报中获益、而非只需一次性战术卡时，每周竞品摘要就是首选的自动化建议。用销售语言表述其价值：竞争格局发生了什么变化、买方为何可能在意、销售方能在哪里形成区隔、该说什么、该澄清什么，以及不该过度宣称什么。

自动化必须是对本技能的定时重跑，而不是另一套自定义调研摘要。创建或描述该自动化时，让提示词直接调用本技能，并保持相同的竞争范围和模式：

```text
Use the Sales `build-competitive-brief` skill.
Rerun it weekly for the same competitive scope: [competitor, product, workflow, category, segment, region, or account].
Return the standard competitive brief output, including source posture and landmines.

seller_company_name: "[seller company when known]"
product_scope: "[same product scope]"
workflow_scope: "[same workflow or buyer problem]"
competitor_scope: "[same competitor category or market category]"
competitor_names: [same named competitors when used]
account_name: "[same account when account-specific]"
mode: "[brief, objections, positioning, or account_overlay]"
known_objections: [same recurring objections when used]
```

对于由本技能发现点名竞品的宽泛品类或产品范围，将稳定范围保留在自然语言提示文本中，让本技能按其常规的对比锚点指引解析可能的竞品。对于狭窄的一次性异议、特定会议的准备工作或稀薄的证据缺口，不要提供该自动化，除非用户明确希望持续性的竞争观察。

周期性输出应遵循本技能的竞品简报契约：上下文、销售方基线、竞争格局摘要、竞品快照、对比要点、应对策略、不应过度宣称的内容，以及来源。保持只读；它可以建议话术、发现式问题、证明和供评审的内部更新，但不得发布、发送、分享，或把无支撑的竞品主张变成面向客户的断言，除非用户另行要求并批准。

在提供每周竞品摘要之前，检查用户是否已安装了相匹配的本地自动化。查看 `$CODEX_HOME/automations/*/automation.toml` 下的本地自动化记录，或在 `CODEX_HOME` 未设置时查看 `~/.codex/automations/*/automation.toml`，并按名称、提示词、技能名、频率、竞品、产品、品类、细分、账户、模式、已知异议或其他稳定范围细节进行匹配。将启用中和已暂停的匹配都视为已安装。

- 如果存在匹配的自动化，不要再建议创建另一个。继续提供下一个最相关的非自动化后续动作。
- 如果不存在匹配的自动化，以一个明确的建议结束：检查/创建针对同一范围的 `build-competitive-brief` 每周重跑。将周期性输出描述为可直接供销售人员使用的竞品摘要，包含变化内容、为何重要、该说什么、该用哪些证明，以及要避免的雷区。在用户明确同意之前，不要创建或更新该自动化。
- 如果自动化能力不可用，不要提及工具细节；在自动化可用时，提出帮助搭建周期性的竞品摘要。

## 模式

- brief —— 默认；标准竞品简报、矩阵、应对建议和来源
- objections —— 买方异议、论据、发现式问题、话术和“不要这样说”的建议
- positioning —— 对比框架、危险区、差异点和应对策略
- account_overlay —— 针对具体账户的影响，清晰区分已确认的交易证据与防御性准备
- chat_or_markdown_only —— 同样的证据契约但不产出 HTML 产物，仅在明确要求时使用

## 输出格式

对于 HTML 产物和仅 Markdown 的回退形式，保持以下内容契约：

```md
# [Seller] Competitive Brief

## Context
[Scope, buyer/account context, mode, and evidence posture]

## Seller Baseline
[Seller positioning and relevant proof]

## Competitive Landscape Summary
[What matters most and why]

## Competitor Snapshot
### [Competitor]
- **What they claim:** [Grounded claim]
- **What is confirmed:** [Evidence-backed fact]
- **Why buyers may care:** [Buyer appeal]
- **Where they win:** [Supported strength]
- **Where we can separate:** [Supported response]
- **Landmine / do not say:** [Overclaim to avoid]

## Comparison Matrix Takeaways
[Matrix plus the few implications that change seller behavior]

## Response Strategy
- **Say:** [Talk track]
- **Clarify:** [Discovery question]
- **Prove:** [Evidence]

## What Not To Overclaim
- [Uncertainty, conflict, or unsupported claim]

## Sources
- [Clickable source + what it supported]
- [Dependency category status and material gaps]

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

对于 account_overlay 要添加 Account Implications，并把无支撑的竞品参与情况标注为 Defensive prep。

## 示例提示

- `Build a competitive brief for MyCompany vs Competitor Alpha.`
- `Create a battlecard for MyCompany against Competitor Alpha and Competitor Beta in financial services.`
- `Compare MyCompany's enterprise workflow platform against the top three alternatives for regulated buyers.`
- `Build an account-specific defensive prep brief for ExampleCorp where Competitor Alpha may be in the deal.`
- `Create a shareable HTML competitive brief for MyCompany vs Competitor Alpha.`

## 规则

- 绝不编造竞品能力、定价、客户证明、账户态势或来源链接。
- 让事实、一线信号和推断保持可见的区分。
- 如果证据稀薄，就收窄简报，并点明能改善它的最小证据缺口。
- 除非用户之后明确要求单独且受支持的操作，不要从本工作流发布、发送、分享或更新系统。
- 在有可用链接时，始终用超链接引用重要的、有来源支撑的主张。
