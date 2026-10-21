# YAML frontmatter 参考

frontmatter 始终被加载到智能体的系统提示词中。它是渐进披露的第一层，也是智能体在决定是否加载技能时唯一能看到的内容。

## 必填字段

```yaml
---
name: skill-name-in-kebab-case
description: What it does and when to use it. Include specific trigger phrases.
---
```

### name

- 只能用 kebab-case：`notion-project-setup`——不含空格、下划线或大写字母
- 应与文件夹名一致
- 保留项：包含 "claude" 或 "anthropic" 的名称会被拒绝

### description

- 必须同时包含技能做什么（WHAT）以及何时使用（WHEN，即触发条件）
- 少于 1024 字符
- 不含 XML 尖括号
- 包含用户可能说出的具体任务/短语；相关时说明文件类型

结构：`[What it does] + [When to use it] + [Key capabilities / negative triggers]`

## 可选字段

```yaml
disable-model-invocation: true    # user-only: hidden from the agent, still reachable via /skill-name
license: MIT                     # for open-source skills
compatibility: Requires network access and Python 3.10+   # 1-500 chars, environment requirements
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"      # restrict tool access
metadata:                        # any custom key-value pairs
  author: Company Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [project-management, automation]
```

### disable-model-invocation

控制模型能否触达，而不是授权。设为 `true` 时：

| 入口 | 行为 |
|---------|----------|
| 系统提示词中的技能目录 | 省略 |
| `skill_search` | 永不返回，永不自动加载 |
| `skill` 工具 | 拒绝，并告知智能体必须由用户运行 `/skill-name` |
| 用户输入的 `/skill-name` | 正常加载 |

当工作流耗时、会打断工作或有副作用，且时机应由用户掌控时使用它。默认为 `false`——看不见的技能，智能体无法主动提供。授权是另一回事：`permission.skill` 的 `deny` 规则会让技能对所有人不可用，包括用户。

## 安全限制

frontmatter 会被注入系统提示词，因此：

- 任何地方都不得出现 XML 尖括号
- 只做 Safe-YAML 解析——不执行代码
- 名称中不得含 "claude"/"anthropic"（保留）

## 描述示例

### 好的示例

```yaml
# Specific and actionable
description: Analyzes Figma design files and generates developer handoff
  documentation. Use when user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Includes trigger phrases
description: Manages Linear project workflows including sprint planning, task
  creation, and status tracking. Use when user mentions "sprint", "Linear
  tasks", "project planning", or asks to "create tickets".

# Clear value proposition + scope
description: End-to-end customer onboarding workflow for PayFlow. Handles
  account creation, payment setup, and subscription management. Use when user
  says "onboard new customer", "set up subscription", or "create PayFlow
  account".
```

### 差的示例

```yaml
# Too vague — will never trigger reliably
description: Helps with projects.

# Missing triggers — the agent can't tell when to load it
description: Creates sophisticated multi-page documentation systems.

# Too technical, no user-facing phrases
description: Implements the Project entity model with hierarchical relationships.
```

### 控制过度触发

```yaml
# Negative triggers
description: Advanced data analysis for CSV files. Use for statistical
  modeling, regression, clustering. Do NOT use for simple data exploration
  (use data-viz skill instead).

# Scope clarification
description: PayFlow payment processing for e-commerce. Use specifically for
  online payment workflows, not for general financial queries.
```
