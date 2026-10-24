---
name: "memory-search"
description: "当内置的记忆与历史工具不够用时，直接查询原始轨迹 SQLite 数据库。适用于需要跨会话做结构化分析的场景：查找重复出现的错误、按模式归组工具调用、核实实际执行了什么，或定位文本搜索无法浮现的特定历史命令/决策。本技能提供数据库结构、可直接使用的 SQL 查询模板，以及按目标划分的检索策略。 | Query the trajectory SQLite database directly for cross-session structured analysis. | Trigger keywords: sqlite, 轨迹数据库, trajectory database, 跨会话查询, raw sql."
---

# 记忆检索：SQLite 轨迹数据库

直接以 SQL 访问 ymcode 的轨迹数据库，做 `memory`（对精选 markdown 的 BM25）与 `history`（对原始消息的 FTS）工具无法完成的结构化分析——聚合、按工具/状态/时间过滤、跨会话模式检测，以及执行链检查。

## 何时使用

- 需要跨会话**聚合或计数**（例如「哪个工具失败最多？」「多少个会话碰过文件 X？」）。
- 需要**按结构过滤**——工具名、状态、agent_id、时间范围——而不只是文本内容。
- 需要**查看某个会话的完整执行链**（按顺序列出每次工具调用）。
- 需要**对照实际发生的事实核实某条记忆**（数据库是事实来源）。
- `memory` 与 `history` 工具在多次查询尝试后仍无有用结果。

## 定位数据库

```bash
# Typically at this path. YMCODE_DB env var overrides if set.
sqlite3 -readonly ~/.local/share/ymcode/ymcode.db ".tables"
```

始终使用 `-readonly` 或只执行 SELECT 查询——绝不修改数据库。

## 数据库结构

| 表 | 用途 | 关键列 |
|-------|---------|-------------|
| `session` | 会话元数据 | `id`, `project_id`, `title`, `time_created`, `parent_id` |
| `message` | 用户/助手轮次 | `id`, `session_id`, `agent_id`, `time_created`, `data` (JSON: `$.role`) |
| `part` | 消息分片（文本、工具调用、步骤） | `id`, `message_id`, `session_id`, `time_created`, `data` (JSON) |
| `task` | 任务树 | `id`, `session_id`, `summary`, `status` |
| `task_event` | 任务状态变迁 | `id`, `session_id`, `task_id`, `at`, `kind`, `summary` |
| `actor_registry` | 子代理/对端历史 | `session_id`, `actor_id`, `agent`, `mode`, `status`, `description` |

### `part.data` 中的 part 类型

- `{"type":"text","text":"..."}` — 智能体文本输出
- `{"type":"tool","tool":"<name>","callID":"...","state":{"status":"completed","input":{...},"output":"..."}}` — 已完成的工具调用
- `{"type":"tool","tool":"<name>","callID":"...","state":{"status":"error","input":{...},"error":"..."}}` — 失败的工具调用（没有 `output` 字段；错误信息在 `$.state.error`）
- `{"type":"step-start"}` / `{"type":"step-finish","tokens":...}` — 步骤边界
- `{"type":"compaction","auto":true/false}` — 上下文压缩边界
- `{"type":"checkpoint",...}` — 检查点/重建边界

### 关键约定

- `agent_id = 'main'` = 主智能体；其他值 = 子代理（例如 `"explore-1"`、`"general-1"`）。
- `$.state.output` 仅在 `$.state.status = "completed"` 时存在。失败时消息存于 `$.state.error`。
- `time_created` 是 Unix 毫秒时间戳。

## 查询模板

**列出本项目最近的会话：**

```sql
SELECT id, title, time_created,
       datetime(time_created/1000, 'unixepoch', 'localtime') as created
FROM session
WHERE project_id = '<PROJECT_ID>'
  AND parent_id IS NULL
ORDER BY time_created DESC
LIMIT 20;
```

**查找包含关键字的用户消息：**

```sql
SELECT m.session_id, m.id,
       substr(json_extract(p.data, '$.text'), 1, 200) as preview
FROM message m
JOIN part p ON p.message_id = m.id AND p.session_id = m.session_id
WHERE json_extract(m.data, '$.role') = 'user'
  AND json_extract(p.data, '$.type') = 'text'
  AND json_extract(p.data, '$.text') LIKE '%keyword%'
ORDER BY m.time_created DESC
LIMIT 10;
```

**按工具名查找工具调用：**

```sql
SELECT m.session_id, m.id, m.agent_id,
       json_extract(p.data, '$.tool') as tool,
       json_extract(p.data, '$.state.status') as status,
       substr(COALESCE(json_extract(p.data, '$.state.output'), json_extract(p.data, '$.state.error')), 1, 300) as result_preview
FROM message m
JOIN part p ON p.message_id = m.id AND p.session_id = m.session_id
WHERE json_extract(m.data, '$.role') = 'assistant'
  AND json_extract(p.data, '$.type') = 'tool'
  AND json_extract(p.data, '$.tool') = '<TOOL_NAME>'
  AND m.session_id = '<SESSION_ID>'
ORDER BY m.time_created DESC
LIMIT 20;
```

**查看某个会话的完整执行链：**

```sql
SELECT m.id, m.agent_id,
       json_extract(p.data, '$.type') as part_type,
       json_extract(p.data, '$.tool') as tool,
       substr(p.data, 1, 800) as preview
FROM message m
JOIN part p ON p.message_id = m.id AND p.session_id = m.session_id
WHERE m.session_id = '<SESSION_ID>'
  AND json_extract(m.data, '$.role') = 'assistant'
ORDER BY m.time_created, p.time_created;
```

**查找重复出现的 stdout 错误（已完成的 bash 调用，最近 7 天）：**

```sql
SELECT substr(json_extract(p.data, '$.state.output'), 1, 200) as error_output,
       COUNT(*) as occurrences,
       GROUP_CONCAT(DISTINCT m.session_id) as sessions
FROM part p
JOIN message m ON m.id = p.message_id AND m.session_id = p.session_id
WHERE json_extract(p.data, '$.type') = 'tool'
  AND json_extract(p.data, '$.tool') = 'bash'
  AND json_extract(p.data, '$.state.status') = 'completed'
  AND json_extract(p.data, '$.state.output') LIKE '%error%'
  AND m.time_created > (strftime('%s', 'now') - 7*86400) * 1000
GROUP BY substr(json_extract(p.data, '$.state.output'), 1, 200)
HAVING occurrences > 1
ORDER BY occurrences DESC
LIMIT 10;
```

**查找真实的工具失败（任意工具，最近 7 天）：**

```sql
SELECT json_extract(p.data, '$.tool') as tool,
       substr(json_extract(p.data, '$.state.error'), 1, 200) as error_msg,
       COUNT(*) as occurrences,
       GROUP_CONCAT(DISTINCT m.session_id) as sessions
FROM part p
JOIN message m ON m.id = p.message_id AND m.session_id = p.session_id
WHERE json_extract(p.data, '$.type') = 'tool'
  AND json_extract(p.data, '$.state.status') = 'error'
  AND m.time_created > (strftime('%s', 'now') - 7*86400) * 1000
GROUP BY json_extract(p.data, '$.tool'), substr(json_extract(p.data, '$.state.error'), 1, 200)
HAVING occurrences > 1
ORDER BY occurrences DESC
LIMIT 10;
```

## 检索策略

| 目标 | 策略 |
|------|----------|
| 查找用户明说过的规则/偏好 | 在用户文本 part 中搜索 `'%always%'`、`'%never%'`、`'%remember%'`、`'%rule%'` |
| 查找某项设计决策 | 在用户文本中搜索 `'%decided%'`、`'%tradeoff%'`、`'%reason%'` |
| 查找特定文件路径或命令 | 对工具输出/错误做 LIKE 匹配 |
| 查找重复出现的工作流 | 按会话归组工具调用序列，寻找反复出现的 tool×N 模式 |
| 核实某条记忆 | 从记忆条目的 `[ses_xxx]` 找到 session_id，再查询其完整执行链 |
| 统计工具使用量 | 用 `GROUP BY json_extract(p.data, '$.tool')` 加 COUNT |

## 约束

- **只读**：绝不修改数据库。始终使用 `sqlite3 -readonly` 或只执行 SELECT。
- **性能**：数据库可能达到数 GB。始终使用 LIMIT，并按 `session_id` 或 `time_created` 范围过滤。
- **隐私**：原始轨迹包含用户输入的一切。请谨慎对待。
- **JSON 访问**：part 数据是列中的 JSON。结构化字段访问始终使用 `json_extract()`。
