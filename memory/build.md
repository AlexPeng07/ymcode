# 构建与运行

## 工具链

- Bun `1.3.14`（`package.json` 的 `packageManager` 锁定；构建脚本会拒绝其他版本）。
- Node.js v24 可用，但构建/测试以 Bun 为准。
- Windows x64；Git Bash 作为 shell。

## 命令

```bash
cd F:/AllProjects/ymcode
bun ci                 # 冻结 lockfile 安装
bun run typecheck
bun test               # 全量（Windows 有已知 plugin EBUSY，见 verification.md）
bun run --cwd packages/cli build:local
```

产物：

```text
packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe
```

构建脚本自带 `--version` 冒烟；输出 `local` 表示本地构建。

## 版本与发布状态（2026-10-24）

- 最新 Release：`v0.2.5`（tag 指向 `a3547e4`），由 `release.yml` 自动发布，12 个平台 asset；
  Windows x64 `ymcode-windows-x64.zip` 为 52,622,388 bytes。
- 最后代码提交：`13058ef`，比 `v0.2.5` 多两个代码提交（TUI 汉化/技能目录减负/cron 时序/i18n 词条），
  尚未发版；其后为交接文档提交，当前 HEAD 用 `git log -1 --oneline` 查看。
  `packages/{cli,sdk,plugin,shared}/package.json` 仍为 `0.2.5`。
- 本轮未重新构建本地二进制；`packages/cli/dist/` 里的产物对应 v0.2.5，验证新 HEAD 前需重新构建。
- 发布 `v0.2.6`：把四个 `package.json` 版本改为同一值（用无 BOM 的 UTF-8 写入，避免
  PowerShell `Set-Content -Encoding utf8` 写入 BOM 导致 CI JSON 解析失败），跑门禁后提交、
  `git tag v0.2.6`、`git push origin main --tags`。

## 离线构建（本机已验证）

`build:local` 会：

1. 运行 `packages/cli/script/generate.ts`，默认从 `https://models.dev/api.json` 拉取模型目录（10 秒超时）。
2. 可能执行 `bun add` 安装 `@opentui/core`/`@parcel/watcher` 的平台包。

本机访问 `models.dev` 超时，最终用本地快照构建：

```bash
cd F:/AllProjects/ymcode
mkdir -p .scratch
node -e "const fs=require('fs');const t=fs.readFileSync('packages/cli/src/provider/models-snapshot.js','utf8');const p='export const snapshot = ';const i=t.indexOf(p);const j=t.slice(i+p.length).trim();JSON.parse(j);fs.writeFileSync('.scratch/ymcode-models.json',j)"

cd packages/cli
MODELS_DEV_API_JSON=F:/AllProjects/ymcode/.scratch/ymcode-models.json \
  YMCODE_CHANNEL=local YMCODE_VERSION=local \
  bun run script/build.ts --single --skip-install
```

- `.scratch/` 已 gitignore。
- `--skip-install` 跳过平台包安装；依赖已装好时才可用。
- 如果依赖缺失，先 `bun ci` 或 `bun install`（仅包名/锁文件变更时需要）。

## 运行

```bash
packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe
YMCODE_HOME=/tmp/example packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe --version
YMCODE_HOME=/tmp/example packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe instinct list
```

- 数据目录与旧 mimocode 完全隔离；启动时不读取、不迁移任何旧目录。
- 隔离数据：`YMCODE_HOME=/tmp/example`。
- 强制语言：`YMCODE_LOCALE=zh` / `YMCODE_LOCALE=en`。

## 目录与忽略

```text
.ymcode/                 项目级配置（新）
~/.config/ymcode         全局配置
~/.local/share/ymcode    数据/记忆/DB
~/.ymcode                安装目录
_upstream_mimo/          上游只读快照（gitignore）
.scratch/                构建临时文件（gitignore）
packages/cli/dist/       构建产物（gitignore）
```

## 跨平台发布构建（Windows 本机）

GitHub Actions 额度不可用时，可在本机构建全部 12 个平台并手动创建 Release。注意 Bun 在
Windows 上**不能从 F: 盘交叉编译**（报 `Failed to extract executable for 'bun-linux-*'`），
把构建目录放到 C: 盘即可：

```powershell
# 1. 版本号一致后提交并打 tag
git tag v0.2.0
git push origin main --tags

# 2. 复制源码到 C: 盘（排除 node_modules/dist/.git 等），并把各层 node_modules 也复制过去
robocopy F:\AllProjects\ymcode C:\Users\<user>\ymcode-release /E /XD node_modules dist _upstream_mimo .upstream .scratch .trae .git .ymcode
robocopy F:\AllProjects\ymcode\node_modules C:\Users\<user>\ymcode-release\node_modules /E
robocopy F:\AllProjects\ymcode\packages\cli\node_modules C:\Users\<user>\ymcode-release\packages\cli\node_modules /E

# 3. 在 C: 副本构建全部平台（--archive 用 tar -a 生成 zip，无需 zip.exe）
cd C:\Users\<user>\ymcode-release\packages\cli
$env:YMCODE_VERSION="0.2.0"; $env:YMCODE_CHANNEL="latest"
$env:MODELS_DEV_API_JSON="C:\Users\<user>\.cache\ymcode\models.json"
bun run script/build.ts --archive

# 4. 用产物创建 Release
$files = Get-ChildItem dist -File | Where-Object { $_.Extension -in ".zip", ".gz" } | Select-Object -ExpandProperty FullName
gh release create v0.2.0 --verify-tag --title v0.2.0 --generate-notes $files
```

- 每个 archive 约 32–46 MB，共 ~500 MB。
- GitHub Actions 恢复后可直接推 tag 走 `release.yml`；npm/FDS 由仓库变量控制。
- 安装脚本按 AVX2 自动选择 `-baseline` 归档，asset 名必须与 `ymcode-<os>-<arch>[-baseline][-musl]` 完全一致。

## Windows 坑

- 测试临时目录清理可能 `EBUSY`：fixture 已加 30 次重试；plugin 测试仍可能因模块缓存持有句柄失败，属于环境清理失败，不是功能失败。
- `new URL(...).pathname` 在 Windows 会得到 `/F:/...`，`Bun.file` 打不开；用 `fileURLToPath(new URL(...))`。
- TUI 测试默认英文：`packages/cli/test/preload.ts` 设置 `YMCODE_LOCALE=en`，避免系统时区 zh 导致英文断言失败。
- tmux 不可用；TUI 交互式驱动/截图未做。

## 网络环境坑（2026-10-25~28 实测）

- **本机代理 `127.0.0.1:7890` 可能宕机**（git 全局配置与 `remote.origin.proxy`
  都指向它）。git push/ls-remote 报 "Failed to connect to github.com:443 over
  proxy 127.0.0.1" 时**直连仍然可用**，三层都要清：
  ```bash
  env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
    git -c remote.origin.proxy= -c http.proxy= push origin main
  ```
- **TLS 拦截**：链路中有自签证书，bun 内置 CA 会拒（`self signed certificate in
  certificate chain`），curl 走系统证书库正常。bun fetch 失败先用 curl 交叉验证，
  不要急着断定代码问题；ymcode doctor 的凭据探针把这类失败归为 warn（保留该语义）。
- **release-assets 下载**（`gh release download`）偶发 TLS 握手超时 /
  PROTOCOL_ERROR 断流，重试通常能过；52MB 资产可能要 2-4 次。
- **验证安装/升级链路不要依赖真实网络**：本地起 `bun -e 'Bun.serve(...)'` 镜像
  （提供 install.ps1 + `releases/download/vX.Y.Z/ymcode-windows-x64.zip`），
  配合 `YMCODE_INSTALL_SCRIPT_URL` / `YMCODE_RELEASE_BASE`；沙箱二进制放
  `<dir>/.ymcode/bin/ymcode.exe` 命中 curl method 检测。完整方法见
  verification.md「upgrade 全链路实测」。
