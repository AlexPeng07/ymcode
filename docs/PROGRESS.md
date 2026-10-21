# ymcode 项目进度记录

追加式记录。每轮写：时间、改动、执行的命令、结果、未决项。

## 2026-10-21

- 建立独立 git 仓库，导入 MiMo-Code `88673c4` 作为基线（commit `00bc4f9`）。
- 安装锁定版本 Bun `1.3.14`。
- 确认上游记忆闭环：`MEMORY.md` + `checkpoint.md` + `notes.md` + task progress + SQLite FTS5 + `/dream` + `/distill`。
- 确认汉化基线：en 487 key、zh 全覆盖；14/162 个 TUI 文件接入 i18n，339 处 `t()`；70 个内置 `SKILL.md`、9,861 行；提示词/工具描述约 2,159 行。
- 写入设计规格 `docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`，范围：全面改名 ymcode、instincts 记忆层、界面/技能/提示词全中文。
- 待办：依赖安装与基线门禁；改名与迁移；instincts 实现；汉化；端到端验收。

### 改名与迁移进度

- workspace 包名改为 `@ymcode/*`；CLI 入口改为 `ymcode`；Bun 锁定 `1.3.14`。
- 运行时路径改为 `~/.config/ymcode`、`~/.local/share/ymcode`、`~/.ymcode`；数据库 `ymcode.db`；配置 `ymcode.json(c)`。
- 环境变量改为 `YMCODE_*`；新增 `MIMOCODE_*` → `YMCODE_*` 启动桥。
- 新增 `ymcode migrate --dry-run` 与首次启动自动复制迁移；旧目录只复制不删除。
- 移除失效的 `$schema` 自动注入；旧 `opencode.ai` / `mimo.xiaomi.com` schema 行会被安全删除，保留 JSONC 注释。
- 验证：`bun run typecheck` 通过；memory 103 pass / 2 skip；shared 56 pass；config/launcher/migration 137 pass / 5 skip（Windows 跳过 Unix 归档测试）。

### instincts 进度

- 新增 `instinct` 文件格式、FTS 类型、service（写入/晋升/降级/衰减/复核/注入预算）。
- 新增 `instinct` 模型工具、`ymcode instinct` CLI、`/instinct` 斜杠命令。
- checkpoint 成功后节流触发 `instinct-observer` 子代理；只写候选，不晋升。
- `MEMORY.md` 晋升写入 Rules / Architecture decisions / Discovered durable knowledge，带去重与 10KB 上限。
- `llm.ts` 注入 active instincts（默认预算 1200 token）；`/dream` 增加 review 阶段。
- 验证：typecheck 通过；instinct 相关 67 pass；checkpoint 回归 22 pass；`ymcode instinct --help` / `review` 冒烟通过。
- 未验证：observer 的真实 LLM 抽取（需要隔离的 provider 凭据）；将在最终验收时明确记录。

### 最终构建与验收（2026-10-21）

- 最终二进制：`packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe`，`--version` 输出 `local`。
- 构建：`models.dev` 不可达时使用本地快照 `MODELS_DEV_API_JSON=.scratch/ymcode-models.json` + `--skip-install` 成功；脚本自带 `--version` 冒烟通过。
- instincts 端到端（隔离 `YMCODE_HOME`）：
  - `instinct list` 读到 candidate：`ins_abc12345 candidate 0.90 提交前必须跑 typecheck`
  - `instinct promote` 输出 `active; appended=true`，`MEMORY.md ## Rules` 写入规则与来源/置信度/日期。
  - `instinct list --status active` 命中；`instinct forget` 无 `--yes` 拒绝；`instinct review` 输出 `promoted=none; decayed=0`。
- 迁移端到端：旧 `mimocode.json`/`mimocode.db`/memory 复制到新目录，数据库改名为 `ymcode.db`，旧目录保留，`.migrated-from-mimocode` 写入。
- 门禁：`check:brand`、`check:i18n`（717 en / 742 zh / 24 skill descriptions）、`check:skills`（70 files）、`check:prompts`（54 files）、`typecheck` 全部通过；定向回归 301 pass / 9 skip / 0 fail。
- 已知未验证/未完成：
  - observer 的真实 LLM 抽取未跑（需要隔离 provider 凭据）。
  - TUI 视觉验收未做（无终端截图通道）；核心界面通过 i18n 字典与组件测试验证。
  - Windows 下部分 plugin/TUI 测试因临时目录 EBUSY 清理失败（非功能失败）；已加清理重试与 Windows skip，仍有个别上游测试受文件锁影响。
  - 顶层 CLI `--help` 仍有部分英文子命令/选项描述；核心 TUI、技能、提示词、instinct/mcp CLI 已中文化。
