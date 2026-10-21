---
name: skill-creator
description: "创建、审查与改进智能体技能（SKILL.md 文件夹）的交互式指南。适用于用户想新建技能（‘create a skill’、‘make a skill for X’、‘write a SKILL.md’、‘turn this workflow into a skill’），审查或改进已有技能，修复从不触发或触发过于频繁的技能，或在分享前校验技能文件夹。不适用于通用提示词撰写、MCP 服务器开发或编辑任意 markdown 文件。 | Create, review, and validate agent skills."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# Skill Creator

技能是一个文件夹，教会智能体如何处理某项特定任务或工作流：

```
your-skill-name/
├── SKILL.md       # Required — YAML frontmatter + Markdown instructions
├── scripts/       # Optional — executable code (Python, Bash, ...)
├── references/    # Optional — docs loaded only when needed
└── assets/        # Optional — templates, fonts, icons used in output
```

技能依赖**渐进披露**：frontmatter 始终在上下文中（因此它决定技能*何时*加载），SKILL.md 正文在相关时加载，链接文件仅在需要时加载。每一层都尽可能小。

## 工作流：创建新技能

### 第 1 步：定义 2-3 个具体用例

写任何东西之前，先与用户敲定：

- 用户想达成什么？（成果，而不是功能）
- 什么会触发它？收集用户会说的原话。
- 该工作流按顺序需要哪些步骤？
- 需要哪些工具（内置工具、脚本、MCP 服务器）？
- 必须内嵌哪些领域知识或最佳实践？

把每个用例写成：**触发 → 步骤 → 结果**。如果用户表述含糊，就提出用例并确认，而不是默默猜测。

判断类别——它决定结构：

1. **文档与资产创建** — 内嵌风格指南、模板、质量检查清单。
2. **工作流自动化** — 带校验关卡的逐步流程。
3. **MCP 增强** — 结合领域专长，按顺序编排 MCP 工具调用。

### 第 2 步：规划文件夹结构

- 文件夹名：只能用 kebab-case（`my-skill`——不含空格、大写字母或下划线），且应与 frontmatter 的 `name` 一致。
- `SKILL.md` 必须严格使用这个文件名，区分大小写。
- 绝不要在技能文件夹内放 `README.md`。
- SKILL.md 控制在约 5,000 词以内；把细节移到 `references/` 并链接过去。
- 对关键校验，优先使用随附脚本而不是文字说明——代码是确定性的，语言解释不是。

### 第 3 步：编写 frontmatter

frontmatter 是最重要的一部分——仅它一项就决定技能是否会被加载。

```yaml
---
name: your-skill-name
description: [What it does] + [When to use it, with literal trigger phrases] + [negative triggers if needed]
---
```

规则（硬性要求）：

- `description` 必须同时说明技能做什么（WHAT）以及何时使用（WHEN），长度在 1024 字符以内。
- 包含用户实际会说的具体短语；相关时说明文件类型。
- frontmatter 中不得出现任何 XML 尖括号（它会被注入系统提示词）。
- `name` 不得使用保留前缀（"claude"、"anthropic"）。

弱示例：`description: Helps with projects.`
强示例：`description: Manages Linear sprint workflows including planning, task creation, and status tracking. Use when the user mentions "sprint", "Linear tasks", or asks to "create tickets".`

可选的 `disable-model-invocation: true` 让技能仅限用户使用：智能体永远看不到它（没有技能目录条目、没有 `skill_search` 命中，且 `skill` 工具会拒绝），而 `/skill-name` 对用户仍然有效。用于耗时长或会打断工作、且时机应由用户掌控的工作流——多阶段编排、部署，以及任何有副作用的操作。默认不要开启；智能体看不见的技能，它也无法主动提供。同时在 `description` 和正文中保留「仅当用户要求时」的规则，以便该标志一旦被移除，技能行为仍然正确。

关于所有可选字段（`license`、`compatibility`、`metadata`、`allowed-tools`）以及更多正反示例，请阅读 `references/frontmatter.md`。

### 第 4 步：编写指令

建议的正文结构：

```markdown
# Skill Name

## Instructions
### Step 1: [First major step]
Exact commands / tool calls, with expected output described.

## Examples
User says X → actions → result.

## Troubleshooting
Error → cause → fix.
```

最佳实践：

- 具体且可执行：给出带参数的精确命令与预期输出，而不是「校验一下数据」这类感觉描述。
- 把关键指令放在顶部；用 `## Important` 标题标记不可跳过的规则。
- 为用户实际会遇到的失败写明错误处理。
- 显式引用随附资源（「写查询之前，先读 references/ 中的 API-patterns 文件」）。
- 为必须按顺序发生的步骤编号；说明步骤之间的数据依赖。

关于经过验证的结构模式（顺序编排、多 MCP 协同、迭代精炼、上下文感知的工具选择、领域专属智能），请阅读 `references/patterns.md`。

### 第 5 步：校验

对技能文件夹运行随附的校验器：

```bash
python scripts/validate_skill.py /path/to/your-skill-name
```

它会检查命名、frontmatter 格式与长度、禁止内容、缺失的链接文件以及正文大小。修复所有 ERROR；把 WARNING 当作需要复核的提示。成功时的预期输出：`PASS` 且 0 个错误。

### 第 6 步：测试并迭代

先在一个有挑战性的任务上迭代直到成功，然后把制胜方法提炼进技能——这比大范围测试给出更快的信号。然后覆盖：

1. **触发**：明显措辞能加载它，改写措辞也能加载，不相关的查询不会加载。
2. **功能**：输出正确、工具调用成功、边界情形得到处理。
3. **基线对比**：相比没有该技能时，修正次数/工具调用次数/token 更少。

调试技巧：问智能体「你会在什么时候使用 [name] 技能？」——它会把描述转述回来；据此修复缺失之处。

完整的测试用例模板与迭代信号见 `references/testing.md`。

## 工作流：审查已有技能

当被要求审查或改进某个技能时：

1. 阅读其 SKILL.md，并运行 `python scripts/validate_skill.py <folder>`。
2. 对照常见失败模式诊断：
   - **从不触发** → 描述过于泛化或缺少面向用户的触发短语。用原话短语和关键词重写。
   - **触发过于频繁** → 添加否定触发（「不要用于……」）并收窄范围。
   - **能加载但指令被忽略** → 指令过于冗长、被埋在深处或含糊。把关键规则移到顶部，用脚本替代文字校验。
   - **响应慢/质量下降** → SKILL.md 太大；把细节移入 `references/`。
3. 提出具体的修改建议（描述的前后对比），而不是泛泛的建议。
4. 如果用户带来真实会话中的失败案例，把修复写成显式指令或故障排查条目——这是价值最高的迭代回路。

## 快速检查清单

交付技能前，核对：

- [ ] 文件夹为 kebab-case，且与 frontmatter 的 `name` 一致
- [ ] `SKILL.md` 文件名准确；文件夹内没有 `README.md`
- [ ] frontmatter 有 `---` 分隔符、`name`，以及写明 WHAT+WHEN 且少于 1024 字符的 `description`
- [ ] frontmatter 中没有 XML 尖括号
- [ ] 指令具体可执行，含示例与错误处理
- [ ] 每个被引用的 `scripts/`、`references/`、`assets/` 文件确实存在
- [ ] `validate_skill.py` 以 0 错误通过
- [ ] 已测试触发：目标措辞会触发，无关措辞保持静默
