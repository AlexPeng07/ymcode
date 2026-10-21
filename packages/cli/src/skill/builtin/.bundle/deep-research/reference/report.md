# 报告格式

独自一遍写完 `REPORT.md`。输入：`brief.md` + 所有 `findings/*.md`。写作期间不要重新搜索；如果某个缺口阻塞了某一节，说明该缺口，而不是凭记忆填补。

## 结构

```markdown
# <Title: the refined research question>

> Generated <date> · depth: <mode> · <N> sources · workspace: research/<slug>/

## Executive summary
5-10 bullet key conclusions. Each bullet cites [n]. This section alone must be
useful to someone who reads nothing else.

## Background & scope
2-4 sentences from brief.md: question, boundaries, assumptions made.

## <Body sections — organize by THEME, not by sub-agent/angle>
Synthesize across findings files; merge overlapping claims, surface disagreements.
- inline citations: "... grew 40% in 2025 [3][7]."
- conflicts: "Source A (2026-03) reports X [2], while B (2025-11) claims Y [5];
  A is newer and primary."
- flags: [single source] for claims with one citation; [speculative] for inference
  beyond the evidence.

## Comparison table (if the topic involves alternatives/options)
| Option | <key dims from brief> | Sources |

## Open questions
Unresolved gaps from Phase 4 + anything the evidence couldn't settle.

## Sources
[1] <Title> — <URL> (published <date>, accessed <today>)
[2] ...
```

## 规则

- 每个 `[n]` 都必须解析到某个 Sources 条目，且该条目的 URL 出现在某个 findings 文件中。绝不要凭记忆引用。
- 按首次提及顺序编号来源。跨 findings 文件对 URL 去重。
- 报告语言跟随用户语言；技术术语/引文保留原文。
- 长度与证据成正比，不要注水。quick ≈ 1-2 页，standard ≈ 3-5 页，deep ≈ 5-10 页。
- 优先信息密度：实体、精确数字、日期、版本——而不是填充性文字。

## 批判性通读（仅深度模式）

起草完成后，以敌意审稿人的身份重读并就地修正：
1. 是否存在需要引用却没有引用的论断？
2. 是否存在某个 [n] 其实并不支持那句话？
3. 是否有章节完全依赖早于 brief 时间范围的来源？
4. 最强的反方论证是否被呈现？
5. 执行摘要与正文是否一致？
