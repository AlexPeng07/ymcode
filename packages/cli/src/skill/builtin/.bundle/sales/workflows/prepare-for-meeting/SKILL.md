---
name: prepare-for-meeting
description: "当用户希望为一场或多场即将与客户、潜客、合作伙伴、账户或重要利益相关方的会议做准备；请求当天或按日期的会议准备；要求整理当天的客户通话队列；询问当天最重要的资格会议；或仅通过公司、参会人、话题或日期来指明会议时使用。视情况产出单场会议简报或按时间排序的多会议日程。 | meeting prep, daily briefing, customer meeting, agenda, account context"
---

# 会议准备


## 上下文收集与提问

凡本技能要求提供上下文时，强烈优先使用 `answers-ask-user-input` 技能和 `ask_user_input` 工具，而不是 `request_user_input` 等其他工具；否则直接在对话中提问。

帮助销售人员为一场关键的客户会议或内部会议做好准备，提供帮助其达成会议既定或假定目标所需的全部相关上下文。

## 通用技能说明

强制要求：若尚未在上下文中，请阅读并严格遵循 `plugins/sales/skills/index/SKILL.md## Cross-Skill Best Practices`。

## 会议排序

当具体会议不明确时，使用以下优先顺序选择会议。

1. 用户明确请求、点名会议、点名账户、点名话题或明确说明的偏好
2. 用户拥有、主持、演讲或应主导推进的会议
3. 客户、潜客、合作伙伴、续约、商机或战略账户会议
4. 涉及决策、依赖、发布、升级或高层关注的大型或跨利益相关方的内部会议
5. 有买方、高管、技术决策者或高级利益相关方出席的会议
6. 有明确决策、阻塞项、风险、承诺或时效性下一步的会议
7. 准备很可能实质改善用户下一步动作的会议

常规内部同步会、一对一、招聘会和绩效讨论优先级较低，但当用户明确要求、由用户主导或明显高风险时仍可入选。

## 关键依赖类别

这些类别对本工作流尤为重要；请自行判断是否可能纳入其他数据来源以提升质量。

- [Blocking] ~~Calendar 用于会议身份、邀请上下文、议程和参会人。只有当必须发现或选择会议时，它才会阻塞。
- ~~Meeting Transcripts 用于既往决策、异议、承诺和连续性
- ~~Email 用于既往会议笔记、近期问题和面向客户的上下文
- ~~Internal Messaging 用于内部策略、阻塞项、负责人和依赖
- ~~Knowledge & Files 用于既往会议笔记、策略文档和资产
- ~~CRM 用于账户、商机、续约和联系人的真相
- ~~Sales Intelligence 仅在能实质改善准备时使用

避免无支撑的主张。如果上下文缺失、过时或冲突，说明限制。

## 工作流指引

这些会议专属步骤会修改并覆盖索引技能中的默认工作流。

- 1. 解析依赖并澄清
    - 如果模式不明确，通过 `ask_user_input()` 询问用户。对于“运行销售会议准备流程”这类空泛调用，不要假设是即将到来的会议准备；提供：`Prep for an upcoming meeting`、`Overview of today's meetings` 和 `Overview of tomorrow's meetings`。
    - 如果意图是“为即将到来的会议做准备”，且用户没有提供会议、账户、参会人、话题或日期，就搜索、排序，并通过 `ask_user_input()` 提供最多三个候选。在用户选定之前，不要检索更深的上下文或起草简报。所有建议的事件都必须晚于用户当前时间。
        - 该搜索只应覆盖接下来的 3 个工作日，最多 25 条结果，且除非用户提供了账户、参会人、话题或关键词，否则不要做宽泛的自由文本查询
    - 从用户请求、邀请、参会人、参会人域名和周边上下文中确定账户或工作流。如果 CRM 中有多个商机，使用与会议话题、参会人、产品和近期活动相匹配的那个；不要让同账户但无关的商机主导简报。如果不存在可信的锚点，说明该缺口，而不是编造一个。
    - 初稿之后，从下方的“下一步选项”中提供最相关的后续动作。

### 下一步选项

将这些作为高价值的过渡。提供一个明确的过渡，而不是菜单。除非你非常有把握另有更合适的选项，否则只建议以下内容：
- 如果新连接器能实质提升输出质量，就安装它们
- 根据用户的指导改进或细化简报。
- 将准备内容添加到现有会议笔记，或创建新的会议文档作为预读材料。如有需要且可行，提出把文档附加到日历邀请中。创建该准备文档时要注意更大的受众；不要把你的草稿逐字放入。
- 起草一份简洁的 Slack 或邮件更新，发给参会人、负责人或内部利益相关方。
- 对于 `Daily Prep Digest` 输出，检查是否已存在相匹配的每日自动化，以该模式重跑本 `prepare-for-meeting` 技能；若不存在，提出创建一个，让销售人员每天早晨看到当天客户会议的概览、注意事项和建议的收尾动作。
- 设置一个心跳自动化，在会议之后跟进摘要和行动项。

应避免的后续步骤：
- 话术或主持脚本

### 自动化建议防护

对于 `Daily Prep Digest` 输出，当用户能从每天开始时获得一份可直接使用的客户、潜客、合作伙伴、续约、商机或高风险内部会议视图而获益时，每日会议准备简报就是首选的自动化建议。用销售语言表述其价值：知道今天哪些会议重要、账户或交易上下文发生了什么变化、注意事项在哪里，以及如何把每场会议推向具体的下一步。

自动化必须是对本技能的定时重跑，而不是另一套自定义日历摘要。创建或描述该自动化时，让提示词直接调用本技能，并保持相同的摘要形态：

```text
Use the Sales `prepare-for-meeting` skill in `Daily Prep Digest` mode.
Rerun it daily for today's qualifying seller meetings in the user's timezone.
Return the standard Daily Prep Digest output with chronological meeting briefs and priority watchouts.

mode: "Daily Prep Digest"
date: "today"
meeting_scope: "customer, prospect, partner, renewal, opportunity, or high-stakes internal meetings"
```

周期性输出应遵循本技能的 `Daily Prep Digest` 格式：今天的会议、每场会议的目标、关键上下文、注意事项、建议的收尾动作，以及跨会议的优先注意事项。保持只读；它可以建议准备和跟进动作，但不得创建会议笔记、附加文档、发送消息、发布更新或写入 CRM，除非用户另行要求并批准。

在提供每日准备简报之前，检查用户是否已安装了相匹配的本地自动化。查看 `$CODEX_HOME/automations/*/automation.toml` 下的本地自动化记录，或在 `CODEX_HOME` 未设置时查看 `~/.codex/automations/*/automation.toml`，并按名称、提示词、技能名、模式、频率、会议范围或其他稳定范围细节进行匹配。将启用中和已暂停的匹配都视为已安装。

- 如果存在匹配的自动化，不要再建议创建另一个。继续提供下一个最相关的非自动化后续动作。
- 如果不存在匹配的自动化，以一个明确的建议结束：检查/创建用于 Daily Prep Digest 的 `prepare-for-meeting` 每日重跑。将周期性输出描述为面向销售人员的晨间简报，说明需要关注的会议、每场会议在商业上的重要性，以及建议的收尾或下一步。在用户明确同意之前，不要创建或更新该自动化。
- 如果自动化能力不可用，不要提及工具细节；在自动化可用时，提出帮助搭建周期性的会议准备简报。

## 总体规则
- 如果向用户提的问题直接明了、潜在答案有限且置信度高，在可用时使用 user_input 表单工具。
- 始终用超链接引用来源，便于用户点击跳转到来源文档

## 模式
### 1. 单场会议准备

- 当用户点名一场会议、账户、参会人、邀请或话题时使用。
- 你可以引入其他相关会议和上下文中的信息，但要确保与目标会议的关联清晰。

#### 输出格式

```md
# [Meeting Name]

**Date:** [Date / Time]
**Attendees:** [Names + roles]

## Summary

- [Core meeting objective]
- [Current account, opportunity, or workstream signal]
- [Top implication, risk, or source gap]

## Goal

[Specific outcome: decision, alignment, feedback, commitment, or next step.]

## Open Questions

- [Most important unresolved question]
- [Question tied to invite, CRM, notes, or message context]
- [Decision or clarification needed]

## Proposed Agenda

1. [Decision-oriented topic]
2. [Risk, blocker, or decision to resolve]
3. [Confirm next steps and owners]

## Background Context
[Max 4 bullets, non-overlapping with above]

- [Compact account, deal, or workstream context]
- [Relevant attendee or prior-meeting context with citation]
- [Useful assets, constraints, dependencies, and source gaps]


{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```

### 2. 每日准备摘要

当用户要求今天、明天或其他按日期的会议摘要时使用。

从日历开始，应用共享的选取规则，保留符合资格的会议，并按时间顺序排列。为不同会议保留各自独立的简报。

### 输出格式

```md
## Today's Meetings

### [Time] — [Meeting Name]

**Attendees:** [Names + roles]

- **Goal:** [What to accomplish]
- **Key context:** [Relevant account, deal, project, or workstream signal]
- **Watchout:** [Risk, blocker, dependency, or source gap]
- **Suggested close:** [Next step, owner, commitment, or decision]

## Priority Watchouts

- [Most important cross-meeting risk]
- [Meeting needing special preparation]
- [Missing context or follow-up needed before meetings]

---

{Follow the instructions and output format/conditions in [Limitations and Improvements](../index/SKILL.md#limitations-and-improvements)}

{Follow the instructions and output format/conditions in [Next Steps](../index/SKILL.md#4-next-steps)}
```
