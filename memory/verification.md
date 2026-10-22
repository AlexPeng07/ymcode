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

1. **observer 的真实 provider 抽取未跑**：需要隔离 provider 凭据。自动化已覆盖 scripted SSE → instinct 工具 → candidate 落盘链路（`test/session/instinct-observer-extraction.test.ts` pass）；真实模型能否稳定抽出高质量候选仍需人工冒烟（见 next-steps.md P0）。
2. **Windows plugin loader 测试按平台跳过**：`test/cli/tui/plugin-*.test.ts` 23 个用例 + `tui.plugin.loader` describe，在 Windows 上 `skipIf(process.platform === "win32")`。原因：Bun 缓存插件入口模块持有目录句柄，fixture 清理 EBUSY（30 次重试后仍失败）；断言本身通过，属清理失败。macOS/Linux 正常运行。
3. **TUI 像素级人工视觉验收未做**：自动化已覆盖主题色解析（`theme-blue.test.ts`）、登录对话框文本（`login-dialog.test.tsx`）、权限框与主界面既有测试；真实终端中的字符宽度/换行/对比度仍需人工检查。
4. **Windows 全量偶发时序失败**：并行负载下 provider refresh / instance dispose / session heartbeat 类测试偶发超时（60s timeout），单独重跑通过；属时序敏感用例，非本次改动引入。

## 2026-10-22 批量完成验证

门禁（在 `F:/AllProjects/ymcode`）：

```text
brand check passed
i18n check passed: 698 en keys, 723 zh keys, 24 skill descriptions
skill check passed: 70 files
prompt check passed: 54 files
typecheck: sdk/plugin/shared/cli 全部 Done
```

定向测试（`cd packages/cli`）：

```text
test/plugin/mimo.test.ts                        4 pass
test/cli/tui/model.test.ts                     10 pass（含 3 个新凭据用例）
test/cli/tui/theme-blue.test.ts                 3 pass
test/cli/tui/login-dialog.test.tsx              1 pass
test/memory/instinct-service.test.ts            8 pass（含阈值映射/last_seen/export-import）
test/session/instinct-observer.test.ts          4 pass（含状态 roundtrip/损坏容错）
test/session/instinct-observer-extraction.test.ts 1 pass
test/tool/tool-script.test.ts + workflow       105 pass / 5 skip / 0 fail
test/cli/tui/plugin-*.test.ts                  24 skip（Windows，见上）
```

构建与冒烟：

```text
离线构建（本地模型快照 + --skip-install）通过；--version = local
ymcode --help / auth --help / instinct --help：中文描述，auth 无 whoami，instinct 有 export/import
upstream:diff：changed 757 / added 70 / deleted 17；--json 可解析
```

instinct export/import CLI 冒烟（隔离 `YMCODE_HOME`）：

```text
instinct import .scratch/instinct-bundle.json -> imported=1; skipped=0
instinct list -> ins_smoke12345 candidate 0.90 提交前必须跑 typecheck
instinct export --output .scratch/instinct-exported.json -> exported 1 instincts
```

Windows 全量 `bun test`：

- 第一次完整运行：5534 pass / 66 skip / 744 fail（详见 PROGRESS.md，全部失败已归因处理）。
- 第二次运行被手动中断；第三次运行结果待补记（运行中）。

## 复现注意事项

- 不要把测试临时目录 `.ymcode-test-fixtures-*` 提交；测试后清理。
- 不要用 `bun test` 的全量结果判断功能失败，先看失败是断言还是 cleanup。
- 二进制验收用 `YMCODE_HOME` 隔离，避免污染真实用户数据。
- 判断 Windows skip 是否合理：文件头注释有 `Windows: Bun keeps imported plugin entrypoints cached...` 标记。
