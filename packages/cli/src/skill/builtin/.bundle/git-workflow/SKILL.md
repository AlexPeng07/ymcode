---
name: git-workflow
description: "Git 工作流规范：分支命名、提交信息、PR 描述、冲突处理、回滚、标签与发布。需要提交代码、开 PR、合并分支、撤销提交或准备发布时使用。 | Trigger keywords: git, commit, branch, PR, merge conflict, revert, release tag, 提交, 分支."
---

# Git 工作流

## 分支

- 从最新 `main` 拉出：`feat/xxx`、`fix/xxx`、`refactor/xxx`、`docs/xxx`、`chore/xxx`、`test/xxx`
- slug 用简短英文，kebab-case；一个分支只做一件事
- 不直接在 `main` 上开发；不长期保留过期分支

## 提交

格式：

```
type(scope): subject
```

type 使用 `feat`、`fix`、`refactor`、`docs`、`test`、`chore`、`perf`、`build`、`ci`。

- 标题不超过 72 字符，动词开头，不加句号
- 一条提交只做一件事
- 正文说明 why、影响范围、验证方式
- 不提交密钥、`.env`、大文件、生成物、调试日志
- 提交前检查：`git status`、`git diff`、相关测试、typecheck

## PR

- 标题：一句话说明改动
- 描述：背景、改了什么、怎么验证、风险和回滚方式
- 关联 issue；附截图或日志（如适用）
- 小 PR 优先；大改动拆成可独立审查的提交
- 不把格式化、重命名和逻辑修改混在一起

## 冲突处理

1. 先理解双方意图，不盲目使用 `--ours` 或 `--theirs`
2. 解决后搜索冲突标记，确认没有残留
3. 跑相关测试
4. 不确定时问作者，不猜

## 回滚

- 已推送：优先 `git revert`，保留历史
- 本地未推送：可以 reset，但要确认没有别人的提交
- 不改写已推送的 `main`；force push 仅限个人分支且明确告知
- 回滚后补测试，防止再次发生

## 标签与发布

- 语义化版本：`vMAJOR.MINOR.PATCH`
- 发布前：门禁、测试、构建、变更说明
- 打 tag 后确认 CI 成功、资产齐全
- 发布说明写用户可见变化，不写内部琐事

## 常用安全检查

```bash
git status --short
git diff --stat
git diff --cached
git log --oneline -10
```

- 提交前确认没有意外文件
- 推送前确认分支和远端
- 合并前确认 CI 通过

## 禁止

- `git add -A` 或 `git add .` 盲加
- 对已推送提交执行 amend
- force push `main` 或 `master`
- 跳过 hooks（`--no-verify`），除非用户明确要求
- 在提交信息里写“update”“fix bug”这类无信息标题

## 输出要求

- 给出命令时优先给只读检查命令，再给写操作
- 涉及 reset、rebase、force push 前，先说明影响并确认
- 不替用户决定提交范围；先列 `git status` 和 `git diff` 摘要
