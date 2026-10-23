# 品牌边界与改名规则

## 应该用 ymcode 的（第一方）

- 产品名/命令：`ymcode`
- workspace 包：`@ymcode/cli`、`@ymcode/plugin`、`@ymcode/sdk`、`@ymcode/shared`
- 配置/数据目录：`.ymcode`、`~/.config/ymcode`、`~/.local/share/ymcode`、`~/.ymcode`
- 环境变量：`YMCODE_*`
- 数据库/配置：`ymcode.db`、`ymcode.json(c)`
- TUI/提示词/技能里的第一方身份
- 项目内 docs/README/AGENTS

## 必须保留的外部名称

- Xiaomi MiMo 模型/provider：`mimo`、`xiaomi`、`MiMo-V2.5-*`、`MiMo-V2.6-*`、`MiMo Platform`、`mimo.xiaomi.com` 等
- 上游归属：`XiaomiMiMo/MiMo-Code`、`anomalyco/opencode`、`opencode.ai`、`@opencode-*`
- 生态兼容目录：`.opencode`、`.claude`、`.agents`、`.codex`
- 第三方产品/API：Salesforce、HubSpot、ZoomInfo、Apollo、Claude Code、Codex、OpenAI、Anthropic 等
- 外部 release/CDN/平台 URL

## 旧名允许出现的位置

- `NOTICE`、`UPSTREAM.md`、`LICENSE`（归属）
- `docs/upstream/`（上游 README 快照）
- `docs/superpowers/`、`memory/`（历史设计与交接记录）
- 个别外部 provider fixture

允许清单：`script/brand-allowlist.json`。每条必须有 reason；不要加整目录通配。

## 检查

```bash
bun run check:brand
```

扫描第一方 token：`@mimo-ai/`、`MIMOCODE_*`、`mimocode`、`MiMoCode`、`MiMo Code`、`MiMo-Code`、`mimo.js/exe`、`mimo <命令>`。运行时与文档中不应再出现旧 harness 名称；Xiaomi provider/model 名称属于外部名称，保留。

## 改名时不要做的事

- 不要把 `xiaomi/mimo-v2.5` 改成 `xiaomi/ymcode-v2.5`。
- 不要改 `.opencode` 兼容根名（外部生态约定）。
- 不要改第三方 API/产品名。
- 不要在代码标识符里做无意义重命名（数据库表、协议字段、工具名保持稳定）。
- 不要为了通过检查而给旧名加“假允许”条目；每条允许必须有真实原因。
