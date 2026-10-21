# Instincts 记忆层

## 定位

instincts 是 checkpoint 与 `MEMORY.md` 之间的中间层：

- 比 checkpoint 持久，比 `MEMORY.md` 可撤销。
- 每条规则有证据、置信度、状态。
- 只有晋升后的 `active` 规则自动注入；候选只可检索。
- 不替代 `/dream`/`/distill`；给它们提供分级输入。

## 文件格式

路径：

```text
<data>/memory/projects/<project_id>/instincts/<id>.md
<data>/memory/global/instincts/<id>.md
```

单条格式：

```yaml
---
id: ins_abc12345
description: 提交前必须跑 typecheck
status: candidate          # candidate | active | retired
confidence: 0.9            # 0..1
evidence:
  - session: ses_xxx
    date: 2026-10-21
    quote: "用户原话（可选）"
source: correction         # correction | repetition | decision
created_at: 2026-10-21T00:00:00.000Z
updated_at: 2026-10-21T00:00:00.000Z
last_seen_at: 2026-10-21T00:00:00.000Z
contradictions: 0
---
正文：规则、适用场景、反例、验证方式。
```

索引：同级 `INSTINCTS.md`（最多 100 行 Markdown 表格）。

## 捕获

- 独立子代理 `instinct-observer`，提示词 `packages/cli/src/agent/prompt/instinct-observer.txt`。
- 触发：checkpoint 成功写入后；`instincts.capture=auto` 且记忆写入未禁用。
- 节流：同一 session 每 3 次 checkpoint 最多一次，且至少间隔 `observe_interval_minutes`（默认 30 分钟）。
- 只写 candidate；最多 3 条；每条必须有 session id、日期、证据；初始置信度 0.3–0.6。
- 同一规则更新证据，不新建重复项；失败只记日志，不影响会话。

## 晋升/降级/衰减

- 晋升条件：`status=candidate`、`confidence >= promote_threshold`（0.8）、不同 session 证据数 `>= min_evidence`（2）；`--force` 可绕过。
- 晋升映射：
  - `correction` → `MEMORY.md ## Rules`
  - `repetition` → `## Discovered durable knowledge`
  - `decision` → `## Architecture decisions`
- 去重：规范化 description；已存在则只把 instinct 标记 active，`appended=false`。
- `MEMORY.md` 超过 10KB 拒绝晋升，提示先 `/dream`。
- 降级：`confidence -= 0.3`、`contradictions += 1`；低于阈值回 candidate。
- 衰减：超过 `decay_days`（60 天）未 `last_seen_at`，每次 review `confidence -= 0.1`；低于 0.2 退休。不自动删除。
- 删除只能 `ymcode instinct forget <id> --yes` 或工具 `force=true`。

## 注入

- 位置：`packages/cli/src/session/llm.ts` 的 `buildMemoryInstructions`。
- 只注入 active，按 confidence 降序、id 升序稳定排序。
- 索引行最多 12 条；前 3 条附正文；总预算 `inject_token_budget`（默认 1200）。
- candidate 不自动注入；提示词指引用 `memory` 工具 `type=instinct` 检索。

## 命令与工具

```bash
ymcode instinct list [--status candidate|active|retired]
ymcode instinct promote <id> [--force]
ymcode instinct demote <id> [--reason "..."]
ymcode instinct forget <id> --yes
ymcode instinct review
```

模型工具 `instinct` 操作：`list/get/write/promote/demote/forget/review`。`write` 供 observer 使用；`forget` 需 `force=true`。

斜杠命令：`/instinct`（提示 agent 调用工具）。`/dream` 的 Phase 3.5 会调用 `instinct review`。

配置（`config.ts`）：

```jsonc
{
  "instincts": {
    "enabled": true,
    "capture": "auto",              // auto | manual | off
    "promote_threshold": 0.8,
    "min_evidence": 2,
    "decay_days": 60,
    "inject_token_budget": 1200,
    "observe_interval_minutes": 30
  }
}
```

## 测试与已验证行为

- 单元/服务测试：`packages/cli/test/memory/instinct.test.ts`、`instinct-service.test.ts`、`paths.test.ts`。
- observer 节流：`packages/cli/test/session/instinct-observer.test.ts`。
- 注入字符串：`packages/cli/test/session/llm-system-prompt.test.ts`。
- 已跑通：写入 → 晋升 → `MEMORY.md` Rules → active → 注入字符串；降级/衰减/去重/forget。
- 编译后二进制 E2E：`instinct list` 读到 candidate，`promote` 输出 `active; appended=true`，`MEMORY.md` 出现规则，`forget` 无 `--yes` 拒绝。

## 已知限制

- observer 的真实 LLM 抽取未验证（没有隔离 provider 凭据）。
- observer 的节流状态文件是简单 JSON，多进程并发可能丢计数；个人使用可接受。
- `MEMORY.md` 10KB 上限是硬拒绝；长期使用需要定期 `/dream`。
- 工具直接 `Instinct.make()` 使用默认阈值；CLI/服务层使用配置阈值。若修改配置，工具晋升阈值可能不一致，后续可统一为 Config.Service。
