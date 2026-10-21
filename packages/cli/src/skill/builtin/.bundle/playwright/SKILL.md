---
name: "playwright"
description: "当任务需要通过 `playwright-cli` 或随附的包装脚本在终端自动化真实浏览器时使用（导航、表单填写、快照、截图、数据提取、UI 流程调试）。 | Trigger keywords: playwright-cli, browser automation, navigation, form filling, snapshot, screenshot, UI-flow debugging."
---


# Playwright CLI 技能

用 `playwright-cli` 在终端驱动真实浏览器。优先使用随附的包装脚本，这样即使该 CLI 未全局安装也能工作。
把本技能当作 CLI 优先的自动化。除非用户明确要求测试文件，否则不要转向 `@playwright/test`。

## 前置检查（必需）

在给出命令之前，先检查 `npx` 是否可用（包装脚本依赖它）：

```bash
command -v npx >/dev/null 2>&1
```

如果不可用，请停下来让用户安装 Node.js/npm（它们提供 `npx`）。原样给出以下步骤：

```bash
# Verify Node/npm are installed
node --version
npm --version

# If missing, install Node.js/npm, then:
npm install -g @playwright/cli@latest
playwright-cli --help
```

一旦 `npx` 就绪，就用包装脚本继续。全局安装 `playwright-cli` 是可选的。

## 技能路径（只需设置一次）

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
```

用户级技能安装在 `$CODEX_HOME/skills` 下（默认：`~/.codex/skills`）。

## 快速开始

使用包装脚本：

```bash
"$PWCLI" open https://playwright.dev --headed
"$PWCLI" snapshot
"$PWCLI" click e15
"$PWCLI" type "Playwright"
"$PWCLI" press Enter
"$PWCLI" screenshot
```

如果用户更愿意全局安装，这样也同样有效：

```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

## 核心工作流

1. 打开页面。
2. 做快照以获取稳定的元素引用。
3. 用最新快照中的引用进行交互。
4. 导航或 DOM 发生明显变化后重新做快照。
5. 在有用时捕获产物（截图、pdf、traces）。

最小循环：

```bash
"$PWCLI" open https://example.com
"$PWCLI" snapshot
"$PWCLI" click e3
"$PWCLI" snapshot
```

## 何时需要再次快照

在以下情况后重新做快照：

- 导航
- 点击会显著改变界面的元素
- 打开/关闭模态框或菜单
- 切换标签页

引用可能失效。当命令因引用缺失而失败时，重新做快照。

## 推荐模式

### 填写并提交表单

```bash
"$PWCLI" open https://example.com/form
"$PWCLI" snapshot
"$PWCLI" fill e1 "user@example.com"
"$PWCLI" fill e2 "password123"
"$PWCLI" click e3
"$PWCLI" snapshot
```

### 用 traces 调试 UI 流程

```bash
"$PWCLI" open https://example.com --headed
"$PWCLI" tracing-start
# ...interactions...
"$PWCLI" tracing-stop
```

### 多标签页操作

```bash
"$PWCLI" tab-new https://example.com
"$PWCLI" tab-list
"$PWCLI" tab-select 0
"$PWCLI" snapshot
```

## 包装脚本

包装脚本使用 `npx --package @playwright/cli playwright-cli`，因此无需全局安装也能运行该 CLI：

```bash
"$PWCLI" --help
```

除非仓库已统一采用全局安装，否则优先使用包装脚本。

## 参考资料

只打开你需要的内容：

- CLI 命令参考：`references/cli.md`
- 实用工作流与故障排查：`references/workflows.md`

## 护栏

- 在引用 `e12` 这类元素 id 之前，务必先做快照。
- 引用看起来失效时重新做快照。
- 除非必要，优先使用显式命令，而不是 `eval` 和 `run-code`。
- 当你没有最新快照时，使用 `eX` 这类占位引用并说明原因；不要用 `run-code` 绕过引用。
- 当视觉检查有帮助时使用 `--headed`。
- 在本仓库捕获产物时使用 `output/playwright/`，避免新增顶层产物目录。
- 默认使用 CLI 命令和工作流，而不是 Playwright 测试用例。
