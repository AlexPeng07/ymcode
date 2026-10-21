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

- 首次启动会自动迁移旧 mimocode 数据（复制）。
- 隔离数据：`YMCODE_HOME=/tmp/example`。
- 强制语言：`YMCODE_LOCALE=zh` / `YMCODE_LOCALE=en`。

## 目录与忽略

```text
.ymcode/                 项目级配置（新）
~/.config/ymcode         全局配置
~/.local/share/ymcode    数据/记忆/DB
~/.ymcode                安装目录（旧 ~/.mimocode 迁移）
_upstream_mimo/          上游只读快照（gitignore）
.scratch/                构建临时文件（gitignore）
packages/cli/dist/       构建产物（gitignore）
```

## Windows 坑

- 测试临时目录清理可能 `EBUSY`：fixture 已加 30 次重试；plugin 测试仍可能因模块缓存持有句柄失败，属于环境清理失败，不是功能失败。
- `new URL(...).pathname` 在 Windows 会得到 `/F:/...`，`Bun.file` 打不开；用 `fileURLToPath(new URL(...))`。
- TUI 测试默认英文：`packages/cli/test/preload.ts` 设置 `YMCODE_LOCALE=en`，避免系统时区 zh 导致英文断言失败。
- tmux 不可用；TUI 交互式驱动/截图未做。
