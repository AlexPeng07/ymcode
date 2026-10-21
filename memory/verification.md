# 验证证据与已知失败

## 门禁

在 `F:/AllProjects/ymcode` 执行：

```bash
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
bun run typecheck
```

交接时结果：

```text
brand check passed
i18n check passed: 717 en keys, 742 zh keys, 24 skill descriptions
skill check passed: 70 files
prompt check passed: 54 files
typecheck: sdk/plugin/shared/cli 全部 Done
```

## 定向测试

```bash
cd packages/cli
bun test --timeout 60000 \
  test/cli/tui/session-list-visibility.test.ts \
  test/agent/agent.test.ts \
  test/memory/instinct.test.ts \
  test/memory/instinct-service.test.ts \
  test/session/llm-system-prompt.test.ts \
  test/installation test/config
```

结果：`301 pass / 9 skip / 0 fail`。

权限提示：

```bash
bun test --timeout 60000 test/cli/tui/permission-bash-delete.test.tsx
```

结果：`28 pass / 0 fail`（测试预加载 `YMCODE_LOCALE=en`）。

## 构建

```bash
bun run --cwd packages/cli build:local
```

本机因 `models.dev` 超时改用本地快照：

```bash
cd packages/cli
MODELS_DEV_API_JSON=F:/AllProjects/ymcode/.scratch/ymcode-models.json \
  YMCODE_CHANNEL=local YMCODE_VERSION=local \
  bun run script/build.ts --single --skip-install
```

结果：

```text
Generated models-snapshot.js
Loaded 56 migrations
building ymcode-windows-x64
Running smoke test: .../ymcode --version
Smoke test passed: local
```

## 编译后二进制 E2E

隔离 `YMCODE_HOME`，在非 git 临时目录创建 global instinct 候选：

```text
instinct list
  -> ins_abc12345  candidate  0.90  提交前必须跑 typecheck

instinct promote ins_abc12345
  -> ins_abc12345 active; appended=true

MEMORY.md ## Rules
  -> - 提交前必须跑 typecheck (instinct: ins_abc12345, confidence: 0.90, updated: 2026-10-21)

instinct list --status active
  -> ins_abc12345  active  0.90  提交前必须跑 typecheck

instinct forget ins_abc12345
  -> refusing to delete without --yes

instinct review
  -> promoted=none; decayed=0
```

迁移 E2E：

- 旧 `mimocode.json`/`mimocode.db`/memory 复制到新目录。
- 新 `ymcode.json`/`ymcode.db` 存在。
- 旧文件仍存在。
- `.migrated-from-mimocode` 存在。

## 已知失败/未验证

1. **observer 的真实 LLM 抽取未跑**：需要隔离 provider 凭据。当前验证的是候选写入、晋升、注入、CLI 和二进制路径；没有验证模型能否稳定抽出高质量候选。
2. **Windows 全量 `bun test` 未全绿**：部分 `test/cli/tui/plugin-*` 在临时目录清理阶段 `EBUSY`，属于 Windows 文件锁/模块缓存，不是功能断言失败。fixture 已加 30 次重试；仍有个别插件测试受影响。
3. **TUI 视觉验收未做**：没有终端截图通道；核心界面通过 i18n 字典、组件测试与门禁验证。
4. **顶层 CLI help/部分次级文案仍英文**：不影响核心 TUI 与技能使用。
5. **上游同步未自动化**：独立 git 历史，`_upstream_mimo/` 只读快照；同步需人工 diff。

## 复现注意事项

- 不要把测试临时目录 `.ymcode-test-fixtures-*` 提交；测试后清理。
- 不要用 `bun test` 的全量结果判断功能失败，先看失败是断言还是 cleanup。
- 二进制验收用 `YMCODE_HOME` 隔离，避免污染真实用户数据。
