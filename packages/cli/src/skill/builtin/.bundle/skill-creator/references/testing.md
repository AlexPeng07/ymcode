# 测试与迭代

严格程度与技能的受众匹配：个人技能做人工抽查即可；部署给整个组织的技能值得配一套脚本化测试。

**提示**：先在一个有挑战性的任务上迭代，直到智能体成功，再把制胜方法提炼进技能。这比大范围测试给出更快的信号。基础跑通后再扩展到多个用例。

## 1. 触发测试

目标：技能在正确的时点加载——且仅在正确的时点加载。

构建类似这样的测试集：

```
Should trigger:
- "Help me set up a new ProjectHub workspace"        (obvious)
- "I need to create a project in ProjectHub"          (paraphrase)
- "Initialize a ProjectHub project for Q4 planning"   (paraphrase)

Should NOT trigger:
- "What's the weather in San Francisco?"
- "Help me write Python code"
- "Create a spreadsheet"  (unless the skill handles sheets)
```

目标是在约 90% 的相关查询上触发。调试方法：问智能体「你会在什么时候使用 [name] 技能？」——它会把描述复述回来；据此调整缺失之处。

## 2. 功能测试

目标：技能产出正确的输出。

```
Test: Create project with 5 tasks
Given: Project name "Q4 Planning", 5 task descriptions
When:  Skill executes workflow
Then:  Project created; 5 tasks with correct properties;
       all tasks linked; no API errors
```

覆盖：有效输出、工具/API 调用成功、错误处理有效、边界情形。

## 3. 性能对比

目标：证明技能优于基线。用同一任务分别在有无技能时运行，比较：

```
Without skill: 15 back-and-forth messages, 3 failed API calls, 12,000 tokens
With skill:    2 clarifying questions,     0 failed API calls,  6,000 tokens
```

定性检查：用户是否需要催问下一步？同一请求跑 3-5 次，产出结构是否一致？新用户能否一次成功？

## 迭代信号

技能是活文档。留意：

| 信号 | 诊断 | 修复 |
|---|---|---|
| 该加载时技能不加载；用户手动调用它 | 触发不足 | 在描述中补充细节、关键词与原话触发短语 |
| 技能在无关查询上加载；用户将其禁用 | 过度触发 | 添加否定触发（「不要用于……」），收窄范围 |
| 结果不一致、调用失败、用户频繁纠正 | 执行问题 | 精炼指令、补充错误处理、用脚本替代文字校验 |
| 响应变慢或质量下降 | 上下文膨胀 | 缩小 SKILL.md，把细节移入 `references/` |

当真实会话暴露出边界情形或失败时，把记录带回来并直接编码修复：一条显式指令、一个故障排查条目，或一个校验步骤。这是价值最高的迭代回路。

## 常见故障排查

**"Could not find SKILL.md"** —— 文件名不是精确的 `SKILL.md`（区分大小写）。

**"Invalid frontmatter"** —— 缺少 `---` 分隔符或 YAML 格式错误（未闭合的引号通常是元凶）。

**"Invalid skill name"** —— `name` 中含空格或大写字母；请使用 kebab-case。

**技能能加载但指令被忽略** —— 指令过于冗长或埋在深处。保持简洁，把关键规则放在顶部 `## Important` 下，并把细节移入 `references/`。对必须通过的校验，随附脚本而不是依赖文字说明。
