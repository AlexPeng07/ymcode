# 技能结构模式

在真实技能中观察到的经过验证的做法。先选定叙事框架：

- **问题优先**：用户描述一个成果（「搭建项目工作区」）→ 技能按正确顺序编排正确的工具。
- **工具优先**：用户已能访问某个工具（MCP 服务器、CLI）→ 技能教会其最优工作流与最佳实践。

大多数技能偏向其中一个方向；知道哪种更贴合，有助于挑选下面的模式。

## 模式 1：顺序工作流编排

当用户需要按特定顺序执行多步骤流程时使用。

```markdown
## Workflow: Onboard New Customer

### Step 1: Create Account
Call tool: `create_customer` — parameters: name, email, company

### Step 2: Setup Payment
Call tool: `setup_payment_method`. Wait for: payment method verification.

### Step 3: Create Subscription
Call tool: `create_subscription` — parameters: plan_id, customer_id (from Step 1)

### Step 4: Send Welcome Email
Call tool: `send_email` — template: welcome_email_template
```

关键技巧：显式的步骤顺序、写明步骤间的依赖、每个阶段做校验、失败时给出回滚说明。

## 模式 2：多 MCP 协同

当工作流跨越多个服务时使用。

```markdown
## Phase 1: Design Export (Figma MCP)
Export assets, generate specs, create asset manifest.

## Phase 2: Asset Storage (Drive MCP)
Create project folder, upload assets, generate shareable links.

## Phase 3: Task Creation (Linear MCP)
Create dev tasks, attach asset links, assign to engineering.

## Phase 4: Notification (Slack MCP)
Post handoff summary with asset links and task references.
```

关键技巧：清晰的阶段划分、服务之间显式的数据传递、进入下一阶段前做校验、集中的错误处理。

## 模式 3：迭代精炼

当输出质量会随迭代提升时使用。

```markdown
## Initial Draft
Fetch data → generate first draft → save to temporary file.

## Quality Check
Run `scripts/check_report.py`; identify missing sections, formatting
inconsistencies, data validation errors.

## Refinement Loop
Address each issue → regenerate affected sections → re-validate →
repeat until the quality threshold is met.

## Finalization
Apply final formatting, generate summary, save final version.
```

关键技巧：明确的质量标准、校验脚本、定义好的停止条件（知道何时停止迭代）。

## 模式 4：上下文感知的工具选择

当同一个成果依上下文需要不同工具时使用。

```markdown
## Decision Tree
1. Check file type and size
2. Choose storage:
   - Large files (>10MB): cloud storage MCP
   - Collaborative docs: Notion/Docs MCP
   - Code files: GitHub MCP
   - Temporary files: local storage
3. Execute, apply service-specific metadata, generate access link
4. Tell the user why that choice was made
```

关键技巧：清晰的决策判据、备用选项、对选择保持透明。

## 模式 5：领域专属智能

当技能在工具访问之外还提供专门知识时使用。

```markdown
## Before Processing (Compliance Check)
Fetch transaction details → apply compliance rules (sanctions lists,
jurisdiction allowances, risk level) → document the decision.

## Processing
IF compliance passed: process the payment with fraud checks.
ELSE: flag for review and create a compliance case.

## Audit Trail
Log all checks, record decisions, generate audit report.
```

关键技巧：把领域专长内嵌进逻辑、动作前的合规关卡、完整的文档记录。

## 可组合性与可移植性

- 智能体可以同时加载多个技能——绝不要假定你的技能是唯一可用的能力；在合适的地方委派给其他技能（例如「对下载的文件使用 PDF 处理技能」）。
- 技能应在各类入口（聊天、CLI、API）上行为一致。环境要求在 `compatibility` frontmatter 字段中说明，而不是想当然。
