# ymcode 项目进度记录

追加式记录。每轮写：时间、改动、执行的命令、结果、未决项。

## 2026-10-21

- 建立独立 git 仓库，导入 MiMo-Code `88673c4` 作为基线（commit `00bc4f9`）。
- 安装锁定版本 Bun `1.3.14`。
- 确认上游记忆闭环：`MEMORY.md` + `checkpoint.md` + `notes.md` + task progress + SQLite FTS5 + `/dream` + `/distill`。
- 确认汉化基线：en 487 key、zh 全覆盖；14/162 个 TUI 文件接入 i18n，339 处 `t()`；70 个内置 `SKILL.md`、9,861 行；提示词/工具描述约 2,159 行。
- 写入设计规格 `docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`，范围：全面改名 ymcode、instincts 记忆层、界面/技能/提示词全中文。
- 待办：依赖安装与基线门禁；改名与迁移；instincts 实现；汉化；端到端验收。
