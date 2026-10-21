---
name: sales-company-research
description: 研究公司、合作伙伴和转介绍渠道，以形成外联方式、消息或合作伙伴动作的草稿；不包含描述性的公司画像、名单数据丰富和内部来源查找。 | company research, partner research, referral channel, outreach draft
---

# 销售公司研究

将外部的公司或合作伙伴研究转化为有据可依、仅出草稿的外联方案。本技能负责从研究到外联的工作：公司或合作伙伴上下文、匹配假设、可能的动作和消息草稿。它不负责以数据为先的潜客名单丰富、内部真相来源查找、发送消息或写入 CRM。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 关键依赖类别

- ~~Sales Intelligence 用于公司、联系人、合作伙伴、企业属性、相似度和外部信号上下文
- ~~CRM 用于现有账户、归属、生命周期、商机和过往互动的真实情况
- ~~Knowledge & Files 用于已批准的价值定位、论据、合作伙伴标准和外联约束
- 公开研究用于公司自述事实、声誉、合作伙伴计划和当前市场背景

以用户提供的公司、域名、合作伙伴类型、产品或报价作为锚点。如果缺少重要锚点，只询问能改变研究路径的最小输入；否则在明确标注假设的前提下继续。

## 工作流

1. 确定研究目标与商业目的：公司匹配度、合作伙伴匹配度、转介绍格局、声誉或外联方式。
2. 首先从权威来源收集最窄范围内的有用证据。将带来源的公司或合作伙伴事实，与推断出的匹配度、可能的买方需求和推荐动作区分开。
3. 解释该目标或合作伙伴类型为何有前景、存在不确定性或匹配度差。点名重要的证据缺口，而不是用泛泛的说法填补。
4. 仅起草用户要求的外联产物，例如外联方式、简短邮件、消息、连接请求或合作伙伴话术。不要发送、发布、在外部系统中创建草稿，也不要更新 CRM。

## 路由边界

- 当主要产出是名单、缺失字段、联系人发现、分层、资格认定或企业属性比较时，使用 `enrich-company-and-contact-data`。
- 当核心问题是应使用哪个内部负责人、文档、渠道、审批人或真相来源时，使用 `find-key-internal-sources`。
- 当主要任务是推进一项已确定的销售、谈判、续约、采购流程或初始销售动作，而不是研究目标以形成外联时，使用 `plan-deal-strategy`。

### 下一步选项

在首个输出之后，从以下选项中提供最相关的后续动作。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 根据用户的指导改进匹配假设、受众、切入角度或排期顺序。
- 为不同的利益相关方或渠道起草另一个外联版本。
- 当存在活跃对话或销售动作时，将该目标交给会议准备或交易策略。
- 内容评审后，创建一份简洁的研究简报或内部账户团队备忘录。
- 补齐会改变外联方式的最小重要证据缺口。

应避免的后续步骤：
- 在未单独明确请求的情况下发送外联、创建外部草稿或写入 CRM。

## 输出

返回一个紧凑的“研究到外联”交付包：

```md
# Sales Research: [Target or Partner Segment]

## Sourced Context
- [Fact + source]

## Fit And Motion
- **Fit hypothesis:** [Inference and confidence]
- **Likely need or partner angle:** [Inference and evidence basis]
- **Risks / gaps:** [What remains unknown]

## Recommended Outreach Approach
- [Audience, angle, sequencing, and safe next step]

## Draft Outreach
> [Draft-only message]

No message was sent and no CRM record was changed.

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

## 规则

- 对重要的带来源主张，在有可用链接时引用链接。
- 清晰标注推断；不要编造公司事实、合作伙伴条款、联系人、声誉声明或匹配证据。
- 外联仅限草稿。绝不在本工作流中发送、发布、创建外部草稿或写入 CRM。
