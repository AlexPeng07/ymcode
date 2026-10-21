# mimocode → ymcode 迁移

## 目标

首次启动 ymcode 时，把本机已有的 mimocode 配置、记忆、数据库复制到 ymcode 目录；**只复制，不删除旧目录**，避免用户丢数据。

## 路径映射

| 旧 | 新 |
|---|---|
| `~/.config/mimocode` | `~/.config/ymcode` |
| `~/.local/share/mimocode` | `~/.local/share/ymcode` |
| `~/.local/state/mimocode` | `~/.local/state/ymcode` |
| `~/.cache/mimocode` | `~/.cache/ymcode` |
| `~/.mimocode` | `~/.ymcode` |
| `mimocode.db` / `-wal` / `-shm` | `ymcode.db` / `-wal` / `-shm` |
| `mimocode.json(c)` | `ymcode.json(c)` |
| 项目 `.mimocode/` | 项目 `.ymcode/`（优先新路径，旧路径只读回退） |

如果设置了 `MIMOCODE_HOME`，旧路径按该根目录；新路径按 `YMCODE_HOME`（或 XDG 默认）。

## 行为

- 仅当新目录不存在且旧目录存在时复制。
- 新旧同时存在：不覆盖新目录，记录 skipped。
- 数据库/配置文件名在复制后改名；WAL/SHM 一起处理。
- 写入 `<new data>/.migrated-from-mimocode` 标记。
- 自动迁移在 `packages/cli/src/global/index.ts` 启动时执行；失败不阻止启动。
- `ymcode migrate --dry-run` 可核对（启动时已自动迁移时，命令会显示 skipped，这是正常的）。
- 项目 `.mimocode` 不自动改名；读取时回退，新写入一律 `.ymcode`。

## 环境变量兼容

`packages/cli/src/env/legacy.ts` 在入口最早执行：

- 把 `MIMOCODE_*` 映射到同名 `YMCODE_*`（仅当新变量未设置）。
- 兼容 `MIMOCODE_HOME` 等旧 shell 配置。
- 迁移模块内部允许出现旧名称；品牌检查允许清单包含这些文件。

## 迁移相关文件

- `packages/cli/src/installation/migrate.ts`
- `packages/cli/src/global/index.ts`
- `packages/cli/src/cli/cmd/migrate.ts`
- `packages/cli/src/env/legacy.ts` / `legacy-boot.ts`
- `packages/cli/src/config/paths.ts` / `config/config.ts`
- `packages/cli/src/storage/db.ts`
- 测试：`packages/cli/test/installation/migrate.test.ts`

## 已验证

编译后二进制在隔离环境验证：

- 旧 `mimocode.json` → 新 `ymcode.json`
- 旧 `mimocode.db` → 新 `ymcode.db`
- 旧 memory 树复制到新 data
- 旧文件仍在
- `.migrated-from-mimocode` 存在

## 注意

- 不要在迁移里做“移动/删除旧目录”；用户可能还在用旧 harness。
- 不要改已发布 migration SQL；数据库 schema 变更用新目录。
- 迁移失败时保留旧数据并以新目录继续启动；不要静默删除。
