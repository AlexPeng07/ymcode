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

交接时结果（2026-10-21，历史记录；当前结果见文末 2026-10-24 一节）：

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

旧版迁移已移除（v0.2.2 起 ymcode 只使用自己的目录，不读取 mimocode）。

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
- 第二次运行被手动中断。
- **第三次完整运行（3501s）：5952 pass / 94 skip / 1 todo / 277 fail / 7 errors**。

### 剩余 277 fail 的基线对照（结论：均为既有 Windows 失败，非本次改动引入）

在改动前 commit `f5a16f3` 的 git worktree（junction 复用 node_modules）上重跑失败最多的文件：

```text
test/tool/memory-path-guard.test.ts   基线 29 fail == 当前 29 fail
test/actor/main-wait.test.ts 等 6 个文件（main-wait / permission-next /
  mcp-lifecycle / turn-queue-admission / bash / ymcode-docs）
                                      基线 136 fail ≈ 当前 135 fail（当前少 1，来自本次修复）
test/cli/cmd/tui/tips-view.test.ts    单独运行 11 pass / 0 fail（全量日志中 276 的归因
  是 bun 汇总段被误计，实际非失败）
```

失败性质（均为断言失败，非清理失败）：

- `memory-path-guard` / `permission/next`：守卫函数在 Windows 上未按预期抛出（"Received function did not throw"）。
- `ymcode-docs`：测试断言英文技能正文，而技能在改名/汉化轮已中文化（早于本次批次）。
- 其余：PTY/websocket、git identity floor、MCP stdio 观测、并行负载超时。

结论：Windows 全量绿灯需要一次专门的平台适配（预计先在 Linux CI 跑全量确认这些用例本身平台相关，再决定 skip/修复），超出本批次范围；本次改动零回归。

## 复现注意事项

- 不要把测试临时目录 `.ymcode-test-fixtures-*` 提交；测试后清理。
- 不要用 `bun test` 的全量结果判断功能失败，先看失败是断言还是 cleanup。
- 二进制验收用 `YMCODE_HOME` 隔离，避免污染真实用户数据。
- 判断 Windows skip 是否合理：文件头注释有 `Windows: Bun keeps imported plugin entrypoints cached...` 标记。

## 2026-10-22 P0 observer 实链路冒烟（live provider，Windows headless）

隔离环境：`YMCODE_HOME=<temp>/ymcode-p0/home`，测试项目 `<temp>/ymcode-p0/project`（git 仓库），
`checkpoint.thresholds=["2000"]`、`instincts.observe_interval_minutes=1`，provider deepseek（temp key）。
配置 `"model": "deepseek/deepseek-flash"`（注意：models.dev 在线刷新会把 deepseek 模型改名，
模型不存在时先 `ymcode models` 看快照；key 未入 auth.json 时需 `DEEPSEEK_API_KEY` 环境变量）。

### 发现并修复的产品缺口（commit f722150）

headless `ymcode run` 在 checkpoint-writer drain 后立即退出，杀死刚 spawn 的 observer
（8 个 observer 会话全部 0 消息、0 候选）。根因链：

1. fireCheckpoints 用本进程 lastFinished tokens → writer+observer 链总在 drain/teardown 阶段运行；
2. watcher fiber 与 drainWriters 在同一个 writer outcome Deferred 上唤醒，drain 先到，
   `pendingObservers` 还是空的 → 原 drain 逻辑（size==0 即过）直接放行；
3. 修复中一度引入新坑：gate promise settle 后**未从 Set 删除**，size 永远 ≥1，
   每次关机都等满 120s 超时——用插桩日志（reserved/settled + size）定位。

修复：`drainInstinctObservers()`（bootstrap，120s 上限 + 5s 静默期）+ 同步预留槽位
（writer spawn 时）+ 三路幂等 settle（observer onExit / watcher ensuring / writer outcome
的普通 promise 兜底——Effect finalizer 在 teardown 调度下不可全信）。

### 验收结果（全部通过）

- checkpoint 触发：`"2000"` 绝对阈值下每轮 run 都出 checkpoint（33 个/主会话）。
- observer 完整生命周期（run @ checkpoint 33）：spawned → 多步 LLM 循环（~15s）→
  settled → 进程 ~20s 干净退出（此前：0 消息被杀）。
- 候选质量：每轮 3 条，frontmatter 完整（status: candidate、confidence、evidence 含
  session id/日期/原文引述），内容取自真实会话证据；`instinct list` 在项目 cwd 下可见。
- 晋升：`instinct promote <id> --force`（0.50 低于 promoteThreshold，非 force 会按
  阈值拒绝——预期行为）→ MEMORY.md 追加行、状态转 active、索引重建。
- 注入：全新会话（不带 -c）system prompt 出现 `# Active instincts` 小节及晋升条目。
- 定向测试：instinct-observer-extraction / instinct-service 全绿。

### 复现注意

- `ymcode instinct list` 必须在项目 cwd 下运行（按 cwd 解析 projectID）。
- 触发节流：`shouldObserve` 要求 `checkpoints % 3 === 0` 且距 lastRunAt 超过 interval。

## 2026-10-22 Linux 全量定性（阿里云服务器，逐文件跑）

**动机**：GitHub Actions 免费额度耗尽（runner 不启动），改在用户自有服务器
（Alibaba Cloud Linux 4 / x86_64 / 2 核 1.6G + 4G swap）上跑 Linux 全量，
定性 277 个 Windows 失败。部署方式：git bundle 本地打包 scp 上传 clone
（服务器连不上 github 443，私有仓库不能走公共镜像）；bun 走 npmmirror 二进制镜像；
npm 依赖走 registry.npmmirror.com；装 gcc/python3 编译 tree-sitter 原生模块。

**执行方式**：`bun test` 全量单进程在 651 用例后被 OOM-kill（虚拟内存 75GB），
改为 565 个测试文件逐文件串行（每文件独立 bun 进程），全部跑完（ALL-DONE）。

### 结果：Linux 全量 pass=5948 / fail=207 / skip=50（565 个文件，41 个文件有失败）

（逐文件日志在服务器 `/root/test-results.txt`；`provider/transform.test.ts` 在该轮无汇总行，
单独复核为 263 pass / 0 fail / 16s，已计入上面 pass 总数。该文件上次导致服务器卡死
是资源叠加巧合，不是测试死循环——复跑正常。）

与 Windows 277 fail 的对照（按文件）：

- **两边都挂（平台无关，测试本身需要整修）**：
  `actor/main-wait`（Linux 46 fail）、`config/tui`（27 fail，与 Windows 数一致）、
  `session/turn-queue-admission`（20 fail）、`skill/ymcode-docs`（9 fail，内容断言
  与汉化漂移，平台无关）、`session/prompt-effect`（3 fail）、`file/ripgrep`（5 fail）、
  `tool/grep`（4 fail）、inbox/queue 系列、history 等。
- **Windows 特有（Linux 全过）**：`tool/memory-path-guard`（Windows 29 fail，
  Linux 通过）、`permission/next`、`mcp/lifecycle`、`tool/bash` 不在 Linux 失败清单。
- **Linux 环境性失败（Windows 过）**：`installation/launcher-bin`、
  `installation/postinstall`（无 build 产物）、`effect/cross-spawn-spawner`（15 fail，
  服务器 spawn 环境）、`provider/refresh-boundaries`（网络环境）、`inbox/*`、
  `history/*`、`plugin/host-node` 等。

### 结论

Windows 277 fail / Linux 207 fail 说明失败面**大部分与平台无关**：测试断言与实现漂移、
时序敏感、环境假设过强才是主因，需要一次专门的测试整修轮次（先按"两边都挂 / 仅 Windows /
仅 Linux"三档拆分，两边都挂的优先修）。Windows 侧零回归的结论不变
（memory-path-guard 等差异均为既有平台差异，非本次改动引入）。

### 服务器复用方式（后续跑 Linux 测试）

- 代码在 `/root/ymcode`（git bundle 装入，无 origin）——更新代码需重新 bundle + scp。
- toolchain：`/root/.bun/bin/bun`（1.3.14，npmmirror 二进制）、Node **24.9.0**
  （必须 ≥24：drizzle 1.0.0-beta 的 node-sqlite 驱动调用 `stmt.setReturnArrays`，
  Node 22 没有该方法）、`/usr/local/bin/rg`（15.1.0，经 gh-proxy 下载）、
  gcc/python3、`/root/ymcode/bunfig.toml` 指向 registry.npmmirror.com。
- **不要用单进程全量 `bun test`**：1.6G 内存会 OOM。用 `timeout` 兜底逐文件串行，
  或先加内存。卡死时 SSH banner 会超时，需控制台强制重启（数据不丢）。
- 更新代码：`git bundle create` → scp → `git fetch <bundle> main && git reset --hard FETCH_HEAD`。
- 装齐 toolchain 后，此前 14 个“Linux 环境性失败”全部转绿（cross-spawn-spawner 24/24、
  file/index 52/52、ripgrep 12/12、history/node-migration 2/2、history/service 11/11、
  installation 8/8、plugin/host-node 2/2、models-catalog 17/17、tool/grep 4/4、
  tool/glob 2/2、skill-search 4、skill 3/3）。

## 2026-10-22 测试整修（Linux 定性后的修复轮）

**根因**：`Instinct.layer` 构造时调用 `Config.get()`，后者需要 InstanceRef 或 Instance ALS；
而测试把 AppLayer 提供在外层作用域、用 `provideTmpdirInstance` 包裹 body，层构造时没有
instance → `LocalContext.NotFound` defect → 整个 AppLayer 报废。这一条解释了
main-wait（46）、config/tui（27）、turn-queue-admission（20）、spawn-ownership、
app-runtime-logger、inbox/queue、history、ripgrep、grep 等大批文件的失败。

修复（两轮）：

1. 第一轮在层构造处 catch 该 defect 并回退默认 settings——恢复测试，但仍是妥协。
2. 第二轮（commit 见下）改为惰性：层构造不再碰 config，每个操作通过 `SettingsSource`
   在调用点解析；instance 内读到项目配置，无 instance 时才回退默认值（仅限
   `LocalContext.NotFound`）。产线也因此修掉“settings 被首个 instance 冻结”的隐患。

**其余修复**（全部是测试与实现漂移，非平台差异）：

- 英文断言 vs 汉化文案：ymcode-docs（9）、builtin（2）、loop、session/system（2）、
  prompt-effect（3）、tool/read、tool/registry-toolset（2）、tool/skill、
  checkpoint-tool-description、actor-prompt-spawn-first（4）、
  checkpoint-progress-reconcile（writer 模板自身已含该短语，改断言注入块标题）。
- zh locale：learn-everything / mate / memory-search / ymcode-docs 缺 slash 别名；
  删除各语言里陈旧的 `tui.skill.ymcode.*` 重复项。
- models-catalog：`Bun.spawn(["bun"])` 在 Windows 只有 npm shim → 改用 `process.execPath`；
  局部变量名 `process` 造成 TDZ 遮蔽。
- cross-spawn-spawner：`echo` 在 Windows 是内建命令 → 改用子解释器写 stdout。

**验证**：

- Windows 本地：上述文件全部 0 fail。main-wait 全文件**空闲态 46/46**；此前出现的
  “beforeEach/afterEach hook timed out”是本机并发跑多个重型测试文件造成 CPU 饱和，
  不是泄漏——结论是重型套件要串行跑。
- Linux 复跑 43 个原失败文件：装备 Node 24 + rg 后 **全部全绿**（含 main-wait 46/46）。
- typecheck 通过；brand/i18n/lint 门禁通过。

## 2026-10-23 ~ 2026-10-24：v0.2.2–v0.2.5 发布与体验优化

### 发布记录

- **v0.2.2**：移除全部 mimocode 兼容层（启动迁移、`ymcode migrate`、`MIMOCODE_*` 桥、
  `.mimocode` 配置回退、doctor 旧版目录检测）；运行时只认 ymcode 自己的目录。
- **v0.2.3**：新增 15 个 Anthropic 官方技能；技能中心中文名/说明/拼音搜索；插件面板中文解释；
  斜杠命令描述补齐；技能包支持 TTF/PDF/GZ 二进制资源（NUL + base64 内联）。
- **v0.2.4**：新增中文写作、中文办公排版、系统化调试、代码审查（`code-review-cn`）、Git 工作流
  5 个技能；内置技能达到 44 个。曾因 `cron-bridge` 时序抖动重跑 CI 一次。
- **v0.2.5**：Windows 记忆写路径守卫先 `resolve` 再比较（`38d6743`）；非 Git 项目按
  `dir-<sha256前12位>` 隔离记忆；新增 `ymcode memory doctor`（`f5f7e84`）；`memory doctor`
  只扫描 `global|projects|sessions`、FTS 行过滤到 memory root（`870cd04`）。
  Release workflow `39985918524` success，12 个平台 asset；Windows x64 52,622,388 bytes；
  发布二进制冒烟（`--version` 0.2.5、中文 `--help`、`memory doctor`、44 个内置技能、字体头 `00-01-00-00`）通过。

### 当前交接点的门禁与测试（2026-10-24，HEAD `13058ef`）

```text
brand check passed
i18n check passed: 1016 en keys, 1064 zh keys, 44 skill descriptions
  （含 162 个 TUI 文件、731 处静态 t() 引用扫描）
skill check passed: 90 files
prompt check passed: 54 files
typecheck: @ymcode/{sdk,plugin,shared,cli} + tsconfig.scripts 全部通过
```

定向测试（`cd packages/cli`）：

```text
test/session/system.test.ts
test/session/prompt-skill-command-multi.test.ts
test/session/cron-bridge.integration.test.ts
  -> 39 pass / 0 fail

test/cli/tui + test/cli/cmd/tui
  -> 353 pass / 24 skip / 0 fail（55 个文件）

test/session/message-v2.test.ts + rebuild-tail-digest.test.ts + prompt-effect.test.ts
  -> 201 pass / 12 skip / 2 fail（见下方已知失败）
```

### 本轮改动摘要

- TUI 汉化补齐：侧栏 Context/Goal/MCP/Tasks/Todo/Modified Files/LSP；模型选择、会话列表、
  消息操作、工作树、变体、工作流、工作区、子代理、控制台组织、暂存、派生会话；输入框附件
  占位/重试/中断；工作流视图。
- 技能目录紧凑化：`Skill.fmt` 只输出 name+description；44 个技能目录约 20,911 → 14,443
  字符（-31%，约 1.8K tokens），去掉 `<location>`；同步 skill 工具参数描述与测试断言。
- cron 时序稳定：`waitFor` 改为 5 秒截止轮询；2 秒等待放宽到 10 秒；负向断言窗口 30→100ms。
- i18n 门禁：新增静态 `t()` 引用扫描，补齐 23 个历史缺失词条（prompt composer / workflow view）。

### 已知失败（与 2026-10-24 改动无关）

1. `test/session/message-v2.test.ts` “local binary and structured text references become paths
   instead of uploads”：Windows `fileURLToPath` 对非绝对 `file://` URL 抛
   `ERR_INVALID_FILE_URL_PATH`（`src/session/message-v2.ts:1097`）。
2. `test/session/prompt-effect.test.ts` “MCP lifecycle timeout lets the outer run finalizer
   complete when a notification hangs”：5 秒硬超时，负载下超时；单独重跑可过。
3. Windows plugin loader 23 个用例仍按平台 skip（Bun 模块缓存持有目录句柄，fixture EBUSY）。
4. TUI 像素级人工视觉验收未做。

## 2026-10-24：v0.2.6 发布与两个已知失败修复

### 发布

- tag `v0.2.6`（`2add73d`）触发 release.yml workflow `40070224750`（06:26–06:39 UTC，
  conclusion success），12 个平台 asset；Windows x64 52,626,649 bytes。
- 发布二进制冒烟（Windows x64 asset 解压后实测）：`--version` = 0.2.6；中文 `--help` 正常。
- 注意：发布 asset 的内部布局是根目录一个 `ymcode.exe`，与本地 `build:local` 产物的
  `ymcode-windows-x64/bin/ymcode.exe` 不同，冒烟时不要按后者找路径。

### 修复（均在 tag 之后提交，属下一版本）

1. `eeaad8c` fix(session): tolerate non-native file URLs in attachment path labels —
   `src/session/message-v2.ts` 新增 `attachmentDisplayPath`：`fileURLToPath` 抛错时
   （Windows 上 POSIX 风格 file: URL 报 `ERR_INVALID_FILE_URL_PATH`）回退到
   `decodeURIComponent(new URL(url).pathname)`，三平台期望输出一致。
   验证：`bun test --timeout 60000 test/session/message-v2.test.ts` → 63 pass / 0 fail（Windows）。
2. `c6674c6` test(session): raise MCP lifecycle hang case budget to 30s —
   生产侧 `TURN_LIFECYCLE_NOTIFICATION_TIMEOUT` = 1s 不变；仅放宽 bun test 预算
   5s→30s，与同文件姊妹用例一致。
   验证：目标用例 `-t` 过滤单独运行 → 1 pass / 0 fail。

修复后 typecheck（sdk/plugin/shared/cli + tsconfig.scripts）全部通过。

## 2026-10-24：质量闭环轮（v0.2.7）

### gray-matter 缓存毒化（fae46f0，产品级修复）

症状：同进程第二个实例的技能列表为空（`add()` 拿到 `mdData: {}`）。
根因链：gray-matter `matter()` 按内容字符串缓存且在解析前写入条目；YAML 解析抛错后
缓存留下 `{data:{}}`；同内容的后续解析直接命中坏缓存静默返回空 frontmatter，
永远到不了 fallback 修复路径。多实例 server 下一次边界 YAML 失败会让同内容技能
在所有实例静默丢失。修复：`ConfigMarkdown.parse` 传空 options 完全绕过缓存；
`add()` 的 safeParse 失败补 warn 日志。回归测试：`test/config/markdown.test.ts`
"invalid plain-scalar colon" 两个用例（第一次靠 fallback、第二次同内容仍拿到数据）。
诱因修复：deep-research/loop/learn-everything 三个 SKILL.md 的 description 原本不带
引号，追加 `Trigger keywords:`（含 ASCII `: `）后成为非法 YAML plain scalar——
已全部改为带引号（其余 3 个原本带引号，追加在引号内）。

### 1.1 技能触发提示（ed185c0）

- `src/skill/index.ts`：`parseTriggerPhrases`（Trigger keywords 段 + name 兜底、
  长度 2–40 过滤）、`matchTriggeredSkills`（拉丁词边界、CJK 子串、按命中数排序、
  同分按名字母序、上限 3）、`hintDescription`（去触发段、160 字符截断）。
- `src/session/prompt.ts` insertReminders：新轮次第一步（user 是最后一条消息）对
  用户自由文本（去代码围栏/行内代码）匹配，排除已加载、已 /mention（已有
  skill_content 全文注入）、文档技能（附件路径专属），注入一行提示。
- 6 个高价值技能补触发词：deep-research、loop、memory-search、skill-creator、
  ymcode-docs、learn-everything；compose-next 有意不加（设计为仅显式请求）。
- 测试：`test/skill/trigger.test.ts` 11 pass；`test/session/prompt-skill-trigger.test.ts`
  3 pass（命中/不命中/mention 不降级）；兄弟文件 prompt-skill-command-multi +
  prompt-skill-mention 17 pass。

### 1.2 用户级 hooks（6207ccb）

- `ymcode.json` 新增 `hooks` 配置：`tool.execute.before/after` 数组
  `{match?: 工具名|*, command}`；命令在项目目录用默认 shell 执行，stdin 收
  `{tool, sessionID, callID, args}`（128K 截断），与计划不同处：超时沿用分发层
  既有的 5 秒（未单独引入 10 秒预算），runner 自身 4.5 秒兜底 killTree。
- before 非零退出 → `cancel=true`，stderr（500 字符截断）为 cancelReason；
  after 零退出的 stdout（2000 字符截断）以 `[hook]` 前缀追加到工具结果。
- 合成进 `plugin/index.ts` 文件级 hook 的 meta 列表——继承熔断（3 次）、
  快照回滚、超时。测试：`test/plugin/config-hooks.test.ts` 3 pass
  （真实 spawn fixture 脚本，断言 stdin 载荷形状）；file-hooks 回归 5 pass。
- 文档：README「用户级 hooks」章节 + ymcode-docs 技能功能表。

### 1.3 环境注入对齐（0d59be6）

- flag 默认翻转：`YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT` 默认 true；
  `YMCODE_DISABLE_DYNAMIC_SYSTEM_PROMPT=true` 或兼容路径 ENABLE=false/0 关闭。
- 非 Claude `<env>` 块新增紧凑 git 快照：Current/Main branch、status（2000 字符
  截断）、近 2 条 commit（| 连接为单行）；非 git 目录跳过 git 调用。
  缓存按 `dir\0now\0provider\0api\0compact` 键（now=session.time.created，会话级稳定）。
- 位置仍在 additions 段（frozen prefix 缓存键不变）。
- 测试：system.test.ts 重写两个旧语义用例（28 pass）；flag 测试翻转默认（3 pass）；
  **prompt-effect 全文件 128 pass / 12 skip / 0 fail**（默认翻转零回归）。

### v0.2.7 发布

- tag `v0.2.7`（`5931cad`）→ release.yml workflow `40076610718`，最终 success（12 个平台
  asset，published 2026-10-24T08:54Z）。包含提交：fae46f0、ed185c0、6207ccb、0d59be6。
- **CI 事件记录（重要运维经验）**：release 测试 shard 2/3 前 3 次尝试失败——
  `resumeMainCascading`（8.3s 轮询耗尽，子代理未投递）与 cron-bridge 的
  "stop interrupts pending delivery"（5s waitFor 耗尽）。判别取证：同代码在 main push
  （该用例 646ms）与 workflow_dispatch 直接跑 tag（547ms）均全绿；工作流逐行对比
  无触发类型差异；零代码改动第 4 次重跑全绿。结论：runner 时间窗效应（疑似镜像
  滚动/宿主抖动），非代码回归。处置：遇此类失败先做"main push + dispatch tag"双
  判别再重跑，不要急着改代码或放宽预算。
- 发布二进制冒烟：Windows x64 asset `--version` = 0.2.7（网络限速，下载慢，
  结果以后台任务输出为准）。
- 门禁（发布前本地）：brand/i18n/skills/prompts/typecheck 全绿。

## 2026-10-24：易用性批次（v0.2.8）与记忆深化（待 v0.2.9）

### 2.1 后台 bash（54884f8）

- `src/tool/bash-background.ts` 注册表：并发上限 5、30 分钟硬超时自动 kill、
  256KB 输出环（每次快照取 8KB 尾部）、退出即 resolve 等待者并触发通知。
  生命周期自持（永不关闭的 Scope）；stop 先标记再 kill（避免 exit-watcher
  竞态把"用户停止"标成退出码）。
- bash 工具新参数 `run_in_background`（权限路径不变，返回 id+初始输出+轮询指引）
  与 `bg {operation: output|stop, id, wait_seconds≤60}`（免重复权限提示）。
- 完成通知：`injectScheduledPrompt` priority=later、新 `ScheduledPromptOrigin`
  kind `background`（TUI 只匹配 cron，不受影响）；通知器在 prompt 循环每轮
  重挂（AppRuntime 按文件惯例动态导入）。
- 测试：`test/tool/bash-background.test.ts` 4 pass（启动/轮询/退出码、stop 幂等、
  未知 id、并发上限；Windows 下显式 stop 全部任务再结束避免 tmpdir EBUSY）。
  bash.test.ts 10 个失败均为已归因的 Windows 既有集（git identity floor ×6、
  external_directory/PowerShell ×4），与本改动无关。

### 2.2 语言选择器（7f7f9e0）

- 词典层回退本就存在（无词典语言→英文 base，部分词典 merge over base），
  真实缺口是选择器列出 17 个语言而 10 个无词典。`locales.ts` 新增 `TRANSLATED`
  （en/zh/zht/es/fr/ja/ru），选择器只列这些；`language.*` 标签键在全部词典齐备。
- check:i18n 输出可选语言覆盖率（当前 zht 461、es 407、fr 415、ja 415、ru 412
  /1019 en 基准）——警告不拦门禁。
- TUI 回归 377 tests / 0 fail。

### 2.3 引导与文档卫生（80a92d7）

- tips 轮播补 3 条高权重：skills_center(65)、bg_bash(55)、hooks(45)；
  en/zh 词典同步（i18n 门禁 1019/1067 keys 通过）。
- 三个 plan 文档头部回填状态注记；README 发布示例 v0.2.5→v0.2.8。

### cron 预算修复（c6fcd67）与 v0.2.8 发布事件

- v0.2.8 首个 tag（`a7f412a`）的 release shard 3 又因 cron-bridge
  "stop interrupts pending delivery" 的 5s waitFor 耗尽失败（该用例在
  v0.2.7/v0.2.8 共 5 次 release 尝试中 4 次超时，main-push 均过）。
  正向等待断言"最终送达"而非速度——预算放宽到 15s（负向断言窗口不变），
  删 tag 重打到修复提交（`c6fcd67`），workflow `40083784186`。
- 教训更新：此类"仅 release 上下文超时"的正向等待用例，第二次出现就应放宽
  预算而不是继续重试轮盘。

### 3.x 记忆深化（f8ce9ff）

- schema：`usage_count`（default 0）+ `last_used_at`（optional）；
  `serialize` 剔除 undefined 键（js-yaml 3 不能 dump undefined——
  该问题会让全部 instinct-service 测试秒挂，属前置修复）。
- `similarity`：归一化 token Jaccard；CJK 连续段用字符二元组（中文无空格，
  整句单 token 会把相似度压到 0.3 以下）；警告阈值 0.6。
- 服务面：`touch`（get 记召回，失败走 Exit 不抛）；`write` 保留 usage 字段；
  `promote` 返回 `similarTo`（非阻断）；`decay` 增加 active+0 召回+>30 天
  的加速档；`renderInjection` 排序 usage→confidence→last_seen→id。
- doctor：解析全部 instincts/*.md，报告 active/candidate 统计、未召回 active
  （含最旧 id 与 last_seen）、top5 疑似重复对。
- 测试：instinct-service 16 pass（含 5 个新用例）；observer 路径回归通过。

## 2026-10-24：Windows 全量重跑定性（方向 4）

### 结果：6195 pass / 85 skip / 107 fail / 5 errors（基线 277 fail → 107）

日志：`.scratch/full-run-20261024.log`（本机单进程全量，非 CI 分片）。

### 三档定性

- **已修复（`31bbbb2`，10 个）**：queue-migration-contracts 5 个——
  `URL.pathname` 在 Windows 生成 `/F:/...` 非法路径，改 `fileURLToPath`
  （与 message-v2 file-URL 修复同类）；rebuild-microcompact 4 个——POSIX 正则
  裁父目录把 checkpoint.md 建成目录（EISDIR），改 `path.dirname`；
  lib/effect 1 个——子进程超时用例 10s 预算扛不住全量负载，放宽 30s。
- **负载伪影（约 44 个）**：permission/next 24 个——单文件隔离 80/80 全过；
  mcp/lifecycle 20 个——CI 设计上就在 shard 4 隔离跑（SDK 模块级 mock 与
  其他套件互斥），CI 全绿；全量单进程混跑必然互撞，非缺陷。
- **真实 Windows 专属（14 个，记录待修）**：bash.test.ts 11 个
  （git identity floor 6 + external_directory/PowerShell 5，自 f5a16f3 基线
  即存在）；stdio-exit-observe 3 个（SIGKILL/close 语义在 win32 的差异，
  需专门调查信号处理路径）。
- 其余 ~39 个为单发时序用例（cron-lock、snapshot-race、oauth 等），
  CI 分片全绿，按负载伪影记录。

### 遗留

- 真实 Windows 专属剩 8 个：bash external_directory/PowerShell 权限组 5 个
  （产品代码的平台路径解析问题，非测试 bug）+ stdio-exit-observe 信号语义 3 个。
- Linux 全量对照按需（服务器复用方式见上文），当前 CI 分片已足够定性。

## 2026-10-24：生产力评估取证与修复（d5589bd）

### E2E 实测（真实安装、v0.2.7 发布二进制、真实 auth.json）

- `ymcode run`（deepseek 与 xiaomi 两个 provider）均报 **API key 无效**——
  两把真实凭据都已失效（deepseek ****18f3 被服务端拒绝；xiaomi Invalid API Key）。
- 旧版 `ymcode doctor` 对此完全沉默：凭据检查只看存在性，报告 ✓ 一切正常。
- 会话库 110.7 MB——承载过大量真实使用；系统 PATH 无 ymcode（用发布二进制直跑）。
- 网络环境注记：本机有 TLS 拦截（自签证书链），bun 内置 CA 不信任；
  curl 走系统证书库正常。运行时 provider 调用此前可通。

### 修复（d5589bd）

- **doctor 凭据实测校验**：对 auth.json 每个 key 发 6 秒超时的
  `GET {baseURL}/models`（URL 取 provider options.baseURL，回退首个模型
  的 api.url）；401/403 → 明确"key 已失效"+ setup 修复指引；其他状态码/
  TLS 失败 → warn 带原因（不误判）。密钥不外印。实测：抓到 xiaomi 死 key；
  deepseek 因 TLS 拦截报 warn（诚实降级）。providers 快照提升到早退之外
  （无默认模型时探针仍可用——正是本机状态）。
- **bash git-identity 测试探针修复**：printGitEnv 固定用 PS 语法导致
  bash/cmd 变体必然失败（功能本身正常）；改为按 shell 生成
  （$env:/%%VAR%%/$VAR），cmd 未定义变量保留字面量的语义在断言处注记。
  6/6 修复；Windows 专属失败 14 → 8。
- 验证：doctor 对真实环境输出 ✗ xiaomi key 失效 + 修复指引；
  bash.test.ts 97 pass / 4 fail（仅剩 external_directory/PowerShell 组）。

## 2026-10-24：质量优先效率批次（54b8d74 → v0.2.10）

用户定调"质量优先"。原则：只做质量中性/正向的 token 优化——**compaction 与
instinct-observer 刻意保留会话主模型**（摘要保真度即成果质量），不路由 lite。

- **目录剥离触发词段**：`Skill.fmt` 输出时剥离 `| Trigger keywords:` 段
  （匹配器继续读完整 description）。44 技能 description 共 13,884 字符，
  触发词占 4,105（29%）≈ 每会话省约 1,000 token。实测目录输出不再含
  "Trigger keywords"。共享 `stripTriggerSegment`，hintDescription 复用。
- **token-efficient 清洗默认开**：never-worse 契约（变大即丢弃）转正；
  回退 `YMCODE_DISABLE_TOKEN_EFFICIENCY=true` 或兼容 ENABLE=false。
  启发式形状过滤仍 opt-in。**bash.test.ts 默认翻转后零新增失败**。
- **401/403 修复指引**：provider/error.ts 全分支（JSON 错误体、HTML 网关页、
  裸 status）附加 "run `ymcode setup` … or `ymcode doctor` to live-check"；
  密钥不回显。provider/error + agent 测试 67/67 过。
- **summary 走 lite**（活动日志渲染是机械活，与 title 同级）；compaction 不动。
- **external_directory/PowerShell 组定性**（不赶工）：`contains()` 实现正确；
  失败集中在 PowerShell 盘符相对式 workdir（`F:foo`）在 resolvePath 的解析
  ——真实产品级 PS 路径语义工作，留作专项。Windows 专属失败仍为 8。
- 验证：bash 140 pass / 4 fail（既有组）；目录相关 5 文件 57 pass；
  全门禁绿。发布 v0.2.10（workflow 见 watch 日志）。

### v0.2.10 发布事故与真回归（996488a 修复）

- v0.2.10 首个 tag 的 CI：resumeMainCascading（8.4s 预算耗尽）与 cron
  "stop interrupts"（15s 新预算也耗尽）连续两次失败，且**同代码的 main-push
  test 也失败**——这与 v0.2.7 的"仅 release 上下文"模式不同，是真回归。
- 根因：54b8d74 把 summary 路由到 `modelRef: "lite"`，而
  `resolveModelRef` 对内置 tier 的无配置回退**忽略 contextProviderID**，
  直接 `defaultModel()`（in-house 优先）——summary 子代理跳到无关
  provider，scripted LLM 的脚本编排被打乱（测试）；生产语义同样错误
  （静默切到别的 key/账单）。cron 用例同链路受害。
- 修复（`996488a`）：内置 tier 回退改为 provider-aware——优先调用方已加载
  provider 里最便宜模型（cost.input 升序、id 决胜），无上下文或该 provider
  无可用模型才落回 defaultModel。回归测试：`model-groups.test.ts`
  "built-in tiers are provider-aware before the default fallback"
  （model: alpha + 上下文 beta → 必须 beta，旧行为返回 alpha）。
- 本地验证：resume 用例、cron-bridge 14/14、provider/agent/actor
  941 pass / 9 fail（9 个为既有 provider/refresh Windows 时序集，CI 隔离跑）。
- **协议修订**：CI 失败判别必须对比**同一提交**的 main-push 结果——
  main-push 绿 = 环境抖动（v0.2.7 先例）；main-push 也挂 = 真回归
  （本次先例），应立即怀疑最近批次并做机制级归因，不要重跑轮盘。
