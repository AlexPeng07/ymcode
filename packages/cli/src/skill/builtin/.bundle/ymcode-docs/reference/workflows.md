# ymcode Dynamic Workflow 参考

Dynamic Workflow 脚本让你用一个小的 JavaScript 脚本**确定性地**编排大量子代理——扇出、流水线、嵌套工作流——而不是逐个手工驱动子代理。脚本在沙箱中运行；你调用 `agent()` 派生工作，并用普通 JS 组合结果。

## 在哪里编写工作流文件

把工作流保存为 `.js` 文件，放在以下任一目录（就近优先，从 cwd 向上走到工作树根；项目覆盖父级）：

```
.ymcode/workflows/<name>.js      # preferred
.claude/workflows/<name>.js        # also read
```

文件名（去掉 `.js`）**不是**工作流的身份——内部 `meta.name` 才是。名称必须匹配 `[A-Za-z0-9._-]+`。

## 必需的脚本形态

每个工作流都**必须以** `meta` 导出开头（纯数据字面量——它被解析，而非执行）：

```js
export const meta = {
  name: "triage-issues",              // required, non-empty
  description: "Triage open issues",   // required, non-empty
  whenToUse: "when the backlog needs sorting",  // optional
  phases: [{ title: "Fetch" }, { title: "Classify" }],  // optional
  model: "standard",                   // optional default model for agents
  permissions: [                       // optional up-front permission requests
    { permission: "bash", patterns: ["git *"], reason: "read repo history" },
  ],
}

export default async function () {
  // ... orchestration ...
  return result   // becomes the workflow's result
}
```

只有 `name` 与 `description` 是必填的。正文是普通异步 JS，可使用下面的沙箱全局。

`meta.permissions` 声明本次运行将需要的权限：每个条目一次性提前询问（前台运行时以交互方式），授权落入会话规则集，后台子代理继承它——运行中途不会因权限卡住。拒绝不会中止运行。

## 脚本内 API（沙箱全局）

| 全局 | 签名 | 返回 |
|--------|-----------|---------|
| `agent(prompt, opts?)` | 派生一个子代理 | Promise → 其交付物（文本；若指定 `opts.schema` 则为校验过的对象），失败时为 **`null`**。绝不抛异常。 |
| `parallel(thunks)` | 并发运行一组 `() => Promise` | `Promise<any[]>`（某个 thunk 抛异常会让整批 reject） |
| `pipeline(items, ...stages)` | 让每个条目依次经过各阶段，条目之间并行 | `Promise<any[]>` |
| `workflow(nameOrScript, args?, opts?)` | 把子工作流作为独立子运行来执行并等待 | Promise → 子结果，运行时失败为 `null` |
| `readFile(path)` | 读取工作区文件 | `Promise<string \| null>`（不存在为 null） |
| `writeFile(path, content)` | 写工作区文件（自动创建目录） | `Promise<void>` |
| `glob(pattern)` | 列出匹配的工作区路径（相对、已排序） | `Promise<string[]>` |
| `exists(path)` | 工作区路径是否存在 | `Promise<boolean>` |
| `phase(title)` | 标记一个进度阶段 | — |
| `log(message)` | 输出一行进度 | — |
| `args` | 工作流启动时传入的 JSON 值 | （该值） |

文件原语**被限制在工作区根内**（默认是工作树，或运行时传入的 `workspace`）。`..`/绝对路径逃逸会抛异常。用 `glob()` 枚举工作单元——不要为了列文件就派一个智能体。

### `agent()` 选项

```js
const out = await agent("Summarize src/parser.ts", {
  agentType: "explore",      // subagent type; default "general"
  model: "lite",             // provider/model literal OR a group/tier name
  tools: ["read", "grep"],   // tool allowlist; omit to inherit
  schema: { type: "object", properties: { bug: { type: "string" } }, required: ["bug"] },
  isolation: "worktree",     // run in a fresh isolated worktree
  label: "parser-scan",      // observability tag
  timeoutMs: 120000,         // per-call timeout; on timeout resolves null
})
```

指定 `schema` 时，交付物是**校验过的对象**（绝非散文）。未指定时，你拿到智能体的最终文本。

## 确定性约束

沙箱移除了非确定性 API，使运行可以完全一致地重放/恢复：没有 `Date`、`crypto`、`fetch`、定时器或 `process`；`Math.random` 是带种子的 PRNG。把网络/时间相关工作放在 `agent()`（真实子代理）**内部**，而不是编排脚本里。

## 运行工作流

使用 `workflow` 工具（或让智能体去运行）：

| 操作 | 用途 |
|-----------|---------|
| `run` | 启动并阻塞到终态；提供 `name`（已保存/内置工作流）**或** `script`（内联 JS）。可选 `args`、`workspace`、`async`。 |
| `status` | 按 `run_id` 获取运行快照，不阻塞 |
| `wait` | 阻塞等待运行结果（可选 `timeout_ms`） |
| `cancel` | 尽力取消正在运行的工作流 |
| `resume` | 在同一 `run_id` 下重新启动已持久化的运行（journal 重放使其收敛） |

- `async: false`（默认）会内联流式输出记录并返回结果。
- `async: true` 立即返回一个 `run_id`；结果以收件箱通知送达。
- 提供 `name` **或** `script`，绝不同时提供。

### 内置工作流

无需写文件即可按 `name` 运行：

- **`deep-research`** —— 综合研究报告生成器（brief → plan → 并行子代理研究 → 反思缺口检查 → 单写者带引用的 Markdown 报告 → 冷审）。传 `args: { dir, question, today, depth?, context? }`。收敛式：文件检查点使中断后可恢复。
- **`fact-check`** —— 对抗式事实核验（plan → 并行网络搜索 → 来源抽取 → 归组去重 → 3 位评审交叉核查 → 结构化 JSON findings）。把问题作为 `args` 传入。最适合核实具体论断。
- **`research-experiment`** —— 用于改进可机械验证指标的自主循环。传 `args: { dir, goal, metric, evalCmd, editable, guardCmd?, lowerIsBetter?, maxIters?, targetValue? }`，并使用与工作流工作区相同的 `dir`。它记录基线，运行受保护的 假设/实现/评估 迭代，审计指标造假，并写出可追溯的报告。当成功无法归结为单一数值指标时，不要使用它。

## 值得了解的语义

- **失败的 `agent()` 解析为 `null`，绝不抛异常**——检查 null；挂死的智能体会被取消，同样产出 `null`，因此不会卡住 `parallel`/`pipeline` 的屏障。
- **失败的子 `workflow()`** 在运行时失败时解析为 `null`，但**结构性故障会抛异常**并沿整棵树向上传播：检测到循环（已保存的名称调用自己）、嵌套超过 `maxDepth`，或未知的工作流名。
- **并发**由一个进程级信号量控制，大小由 `workflow.maxConcurrentAgents` 决定；单次运行的值只能收窄它。超出的 `agent()` 调用会自动排队。
- **工作流之间通过数据流通信**——从子工作流返回值并作为 `args` 传给下一个，或用 `writeFile` 写共享文件稍后读取。工作流之间不直接发消息。

## 观察运行（TUI）

运行中的工作流会显示一个有限高度的内联面板（上限约 12 行），带实时 spinner、阶段与状态计数。工作流工具消息之后，`view workflow agents` 快捷键会打开全屏工作流页面——每个智能体一张消息式卡片、带颜色的状态计数，并可下钻到每个子代理（以及嵌套工作流）的完整对话，导航时保留滚动位置。

## 配置旋钮（`workflow.*`）

| 键 | 默认值 | 用途 |
|-----|---------|---------|
| `maxConcurrentAgents` | `min(16, 2×cores)` | 所有运行（含嵌套）并发子代理的进程级上限。无上限夹紧——请审慎设置。 |
| `maxDepth` | `8` | `workflow()` 调 `workflow()` 的最大嵌套层数；超出会使运行失败 |
| `maxLifecycleAgents` | `1000` | 单次运行生命周期内派生的智能体总数硬上限；超出的 `agent()` → `null` |
| `scriptDeadlineMs` | `43200000`（12h） | 整个脚本的实际耗时预算；以硬杀方式执行 |
