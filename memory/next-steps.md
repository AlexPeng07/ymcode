# 下一步（按优先级）

## 当前交接点（2026-10-31，全面审查轮已交付、未发版）

- 最新 Release：`v0.2.13`（`0c79fec` + tag）。
- **2026-10-31 全面审查与优化轮**（未提交、未发版，详见 verification.md 同名小节）：
  三路审查（技术债/健壮性安全/测试健康）后落地四批修复——
  B1 安全：glob 守卫-扫描路径统一、write/edit 判写路径统一（win32 normalize）、
  skill/discovery 远端索引遍历校验（+恶意 registry 测试）、archive PS 注入转义+zip 条目
  fail-closed 扫描（+测试）、bash-background spawn 失败 scope 泄漏；
  B2 规范：auth 空 catch、session.removeUnlocked、team 吞错、catch(any)×4、
  fn.ts/clipboard.ts console 降级；B3 死代码：scrap.ts+9 个零引用导出；
  B4 测试稳定：test/lib/wait-for.ts helper、bus 两文件谓词化、workspace.test 跨平台+泄漏清零、
  preload stale sweep、tokens 裕量。门禁全绿；定向回归 ~380 pass / 0 fail。
- 已交付（按时间序，历史）：四方向路线（v0.2.7 质量闭环 / v0.2.8 易用性 / v0.2.9 记忆深化 /
  测试定性+修复）；生产力评估与修复（doctor 凭据实测 `d5589bd`）；质量优先效率批次
  （`54b8d74`）；**provider-aware 内置 tier 修复**（`996488a`）；
  **upgrade 全链路实测**（`7fd8cfd`）；**升级延迟替换**（`328e872`）；
  resume 用例轮询预算 8s→30s（`8a2d050`）；Windows 专属失败清零（`0c79fec`）。
- **CI 判别协议（已修订，写进 verification.md）**：对比**同一提交**的 main-push——
  绿=环境抖动，挂=真回归（summary→lite 先例），直接机制归因，不跑重试轮盘；
  同一正向等待用例在 release 上下文失败第二次起即放宽预算（cron 5s→15s、
  resume 8s→30s 两个先例）。

### 下一轮候选（按收益排序，2026-10-31 第二次更新）

1. ~~prompt-effect 定值 sleep 与 acp 定值 setTimeout → 状态驱动等待~~ **已完成（R 轮）**：
   acp 11 处清零；prompt-effect 9 处正向断言转 pollUntil（负向/宽限保留）。
2. ~~installation launcher 8 个 win32 skip 平台无关化~~ **已完成（R 轮，有反转）**：
   postinstall prefetch 去 skip（顺带修出 launcher.js win32 解压真缺陷）；launcher 4 个
   linux-tar 用例定性为生产不可达路径保持 skip；launcher-bin 3 个为 POSIX 产物保持 skip。
3. provider 层 134 处 any 收窄（provider.ts getModel(sdk:any)×12 最值得，大工程）。
4. archive.ts POSIX 分支条目扫描（需解决 busybox unzip -Z1 兼容性）。
5. **发布：两轮改动已提交，发 v0.2.14**（改 4 个 package.json 版本→tag→push，
   release.yml 自动 12 平台；含安全修复与 launcher.js 解压修复，建议尽快发）。

### 建议顺序

0. ~~恢复可用~~ **已完成（2026-10-25）**：临时 deepseek key 经
   `ymcode setup` 写入 auth.json + 默认模型 deepseek/deepseek-flash；
   doctor 联网验证通过，真实 E2E（模型往返 + bash 工具回路）全通。
   注意：该 key 为临时性质且出现在会话记录里，**用完建议轮换**；xiaomi key 仍是死的。
1. **短暂使用验证（建议先做）**：凭据已通，用真实会话跑几天——观察
   token-efficient 清洗节省、技能触发命中、instinct usage；一周后按数据定下一轮。
2. ~~修真实 Windows 专属 8 个~~ **已完成（2026-10-29，`0c79fec`）**：
   ① resolvePath 修盘符相对式（Bun 丢设备导致逃逸路径被判内部）与 cygpath
   歧义映射（未知顶层落 Git 安装根——按祖先链识别后改用工作目录盘符上
   真实存在的同构路径）；② containsPath 的 worktree 边界仅对 vcs=git 生效；
   ③ 三个 win32 守卫内测试改 outsideGit fixture（本意即以实例目录为边界）；
   ④ stdio-exit-observe 换 execPath + Windows 信号语义断言分化。
   bash.test 101/101；tool/project/memory/permission 回归 1131/0。
   TUI sessions 可见性用例隔离即过（负载伪影，无需修）。
3. ~~Windows 发布签名~~ **已结构性缓解（v0.2.12）**：upgrade 改辅助进程替换，
   不再触发 PDM 自我修改特征。Authenticode 签名仍是可选增强（提升文件信誉，
   需证书或 SignPath 开源额度，属用户决策）。README 已有杀毒说明。
4. **可选：TUI 像素级人工验收**（首屏、命令面板、侧栏、常用对话框、
   中文宽度与蓝色对比度）。
5. **可选：Linux 全量对照**（verification.md 服务器复用方式）。

### 发布 v0.2.13+ 流程（同前）

改 `packages/{cli,sdk,plugin,shared}/package.json` 为同一版本（无 BOM），
提交、打 tag、推送，`release.yml` 自动完成门禁/测试/12 平台发布。
发布失败判别：同提交 main-push 绿=抖动可重跑；挂=真回归，先归因最近批次；
正向等待用例第二次在 release 失败即放宽预算。
**本机网络环境（详见 memory/build.md「网络环境坑」）**：代理 127.0.0.1:7890
可能宕机（git push 失败时按 build.md 的绕行命令直连）；release-assets 下载
偶发 TLS 握手超时，先重试再定性；**验证安装/升级链路用本地镜像**
（verification.md「upgrade 全链路实测」）。

## 本轮已完成（2026-10-22）

- 移除小米条款弹窗与 `auth whoami`；默认模型改为优先选择已有凭据的 provider。
- CLI `--help` 全量汉化（顶层 + 33 个命令文件）。
- observer 抽取路径新增 scripted-LLM 集成测试（真实工具执行 + candidate 落盘）。
- TUI 蓝色主题与登录对话框自动化验收；插件入口保留为 API Key。
- instincts：配置阈值统一、observer 状态原子写、`last_seen_at` 稳定策略、export/import。
- `bun run upstream:diff` 上游差异脚本。
- Windows plugin loader 测试按平台跳过（Bun 模块缓存锁目录，见 PROGRESS.md）。
- **P0 实链路冒烟完成**：headless observer 存活缺陷已修复（f722150，drain 槽位 +
  三路幂等 settle + gate 从 Set 删除）；候选/晋升/注入全链路在真实 provider 下验证通过，
  详见 memory/verification.md「P0 observer 实链路冒烟」。
- **远端备份已建**：github.com/AlexPeng07/ymcode（私有），main 已跟踪 origin。
- CI 品牌残留清理（test.yml git identity、brand-allowlist 补 upstream-diff）。
- **新增 `ymcode doctor`**：检查运行时、目录可写性、配置解析与模型可用性、凭据、
  ripgrep、会话数据库与旧版迁移目录；`--json` 便于提交问题报告，`--network`
  额外探测 models.dev 与 github.com。
- **新增 `ymcode setup`**：非交互/交互两用的首次运行向导（服务商 → API Key →
  默认模型 → 写入 auth.json 与全局配置并验证 provider 加载）；TUI 首次无凭据启动
  时自动打开服务商选择框，且只自动出现一次。
- **新增 instincts TUI 面板**：`/instincts` 列出规则、展示证据与正文，支持晋升、
  强制晋升、降级、删除、review 以及项目/全局范围切换；新增 `/instinct` HTTP 路由
  并重新生成 SDK。
- **新增 `/remember`**：会话内直接写入带当前会话证据的候选（`POST /instinct`），
  无参数时弹出输入框；随后可在 `/instincts` 中一键晋升。
- **发布通道切到 GitHub Releases**：`install` / `install.ps1`、npm launcher 与
  `ymcode upgrade` 默认从 `github.com/AlexPeng07/ymcode/releases` 下载；FDS/npm 发布
  改为可选（仓库变量 `YMCODE_PUBLISH_FDS` / `YMCODE_PUBLISH_NPM=1`）。
- **v0.2.0 已发布**：12 平台 asset 已上传，Windows 安装脚本实测可用；Actions 恢复前，
  按 memory/build.md 的 C: 盘本机构建 + `gh release create` 流程手动发布。
- **v0.2.1 已发布**：仓库公开后 Actions 恢复，tag 触发的 `release.yml` 自动完成测试、
  构建与 12 平台发布。包含默认模型、侧栏品牌、移除 `/login`、整体转蓝四项修正。
  注意：用 PowerShell `Set-Content -Encoding utf8` 改 JSON 会写入 BOM，导致 CI 的
  Format/packLibrary 测试失败；改包清单时用无 BOM 的 UTF-8 写入。
- **与 mimocode 彻底解耦**（v0.2.2）：删除启动时的旧数据迁移、`ymcode migrate` 命令、
  `MIMOCODE_*` 环境变量桥、`.mimocode` 项目配置回退与 doctor 旧版目录检测；
  内置 `ymcode-docs` 技能不再把 CLI 写成 `mimo`，并移除失效的 Xiaomi schema 链接。

## 本轮已完成（2026-10-24）

- TUI 文案补齐：侧栏 Context/Goal/MCP/Tasks/Todo/Modified Files/LSP 面板标题与状态，
  以及模型选择、会话列表、消息操作、工作树、变体、工作流、工作区、子代理、
  控制台组织、暂存、派生会话等常用对话框全部接入 `useLanguage().t`；
  顺带补齐此前遗漏的 `tui.sidebar.footer.*`、`tui.sidebar.mcp.*`、`tui.workspace.*` 词条。
- 技能目录减负：`Skill.fmt` 去掉 verbose 分支，系统提示只保留 name+description；
  44 个内置技能的目录体积约从 20.9K 字符降至 14.4K（约 31%），
  对应测试断言同步改为紧凑格式。
- CI 时序稳定：`cron-bridge.integration.test.ts` 的 `waitFor` 改为 5 秒截止轮询，
  `Effect.timeout("2 seconds")` 放宽到 10 秒，负向断言等待从 30ms 提高到 100ms。
- 补齐历史遗漏词条：`tui.prompt.*`（错误、附件占位、重试、中断、退出 Shell）与
  `tui.workflow.*`（工具数、隔离、子工作流、空状态）共 23 个键；
  `check:i18n` 新增静态 `t()` 引用扫描（731 处引用），缺失词条会直接让门禁失败。

## P1：测试整修轮次（Linux 全量已定性）

Linux 全量（自有服务器逐文件串行）结果：pass=5948 / fail=207 / skip=50，41 个文件有失败；
Windows 为 277 fail。失败面大部分与平台无关（main-wait 46 / config/tui 27 /
turn-queue-admission 20 / ymcode-docs 9 两边都挂），需专门整修：
先按"两边都挂 / 仅 Windows / 仅 Linux"三档拆分，两边都挂的优先修。
运维细节见 memory/verification.md「服务器复用方式」。
GitHub Actions 已恢复可用（v0.2.6 于 2026-10-24 由 Actions 正常发布）；若再遇额度耗尽，
需在 Billing 充值或注册 self-hosted runner。

## P2：TUI 像素级人工验收（可选）

自动化已覆盖主题色解析、登录对话框文本、既有权限框与主界面测试；仍建议在真实终端检查：

- 首屏、命令面板、权限对话框、provider/status 对话框、错误页。
- 中文字符宽度、换行、对齐，以及蓝色主题在深浅模式下的对比度。

## P3：发布与上游同步（可选）

- `bun run upstream:diff` 已可用；同步上游时按目录查看差异。
- release.yml 仍是上游小米 FDS 发布管道（secrets 本仓库不存在，tag 触发才会跑）；
  如需自有发布渠道再改造，平时无影响。
- 不要恢复指向 Xiaomi 的默认安装脚本/FDS；当前本地构建已移除这些默认值。

## P4：记忆系统后续（可选）

- 为 instinct 增加 HTTP/工具层面的过滤（例如按 source/status 批量导出）。
- observer 节流状态目前是单进程原子写；多进程并发写仍以最后写入者为准，如需多实例共享需改用 SQLite。
- 为 export/import 增加 bundle 版本迁移策略（当前 version=1）。

## Windows 已知例外

- `test/cli/tui/plugin-*.test.ts` 的 23 个用例在 Windows 上 `skip`：插件入口被 Bun 模块缓存持有，fixture 目录清理报 EBUSY；断言本身在 macOS/Linux 正常运行。
- `test/workflow/workspace.test.ts` 的 `resolveInWorkspace` 4 个用例在 Windows 上 `skip`：断言使用 POSIX 绝对路径。
