---
name: super-research
description: 面向开放式、高体量研究工作的自主研究技能——让智能体持续运行一段时间（数分钟到通宵），产出诚实、可对比、可审计的证据，而不是一次性的单点答案。按请求覆盖八种模式：(1) 实验循环（experiment loop）—— 迭代修改代码、运行、测量指标，保留或回退（基线 → 假设 → 运行 → 保留/回退；用于「optimize X」「tune hyperparameters」「run experiments overnight」「autonomously improve this model」「hill-climb a metric」「自动实验」）；(2) 主题调研（topic survey）—— 就一个问题收集并综述来源（用于「survey the literature on X」「research topic Y」「调研 Z」「literature review」「deep research」「what's the state of the art in」「gather evidence about」）；(3) 量化分析（quantitative analysis）—— 可复现、假设先行的数据分析，含 schema 审计、效应量与注意事项（用于「analyze this dataset」「量化分析」「test whether X correlates with Y」「compute the effect of」「investigate this data」）；(4) 对比评测（benchmark comparison）—— 在公平、固定的矩阵下从 N 个候选中做选择（用于「compare X vs Y」「which library/model/prompt is best for us」「benchmark these options」「选型」「对比评测」）；(5) 根因排查（root-cause investigation）—— 假设驱动、双向反转的回归/flake/性能下降调试（用于「why is X broken」「root cause this」「debug the regression」「why is it flaky」「排查」「定位」「复盘」）；(6) 消融实验（ablation study）—— 针对实测噪声本底做留一归因（用于「ablate X」「which parts of Y matter」「attribution study」「消融实验」「is component Z pulling its weight」）；(7) 复现论文（paper reproduction）—— 把论文方法实现为可运行的仓库，并记录所有歧义（用于「复现这篇论文」「paper to code」「implement this method」「reproduce the main table of X」）；(8) 写论文 + 引用校验（paper writing + citation audit）—— 起草或打磨学术论文，并逐条对照真实 API 记录核实引用（用于「write a paper on X」「polish this draft」「查引用」「citation check」「校验引用」「detect fabricated references」）。自带零外部依赖工具箱（内置工具 + 免费学术 API —— arXiv、Semantic Scholar、OpenAlex、Crossref —— 无需 API key）。只要用户想要有体量、有纪律的研究工作——即使没说「research」或「experiment」——就触发本技能，并从请求中选择模式。 | Autonomous research across eight modes; experiment loop, topic survey, quant analysis, benchmark, root cause, ablation, paper reproduction, citation audit.
---

# 自主研究

你即将成为一名自主研究者。本技能的价值不在于具体流程——而在于：在它之下完成的研究工作具备**可对比、诚实、可审计**的性质。十次按同一标准完成的廉价实验/查询/分析，胜过一条聪明但未经检验的论断。正是这一点，让人在八小时后查看你的工作时，能真正相信所看到的内容。

本技能提炼自 Karpathy 的 [autoresearch](https://github.com/karpathy/autoresearch) 方法论，并推广到六种研究模式。

## 共同纪律（所有模式）

每种模式都遵循同样的五条规则。进入具体模式前先读一遍。

1. **动手前先立契约。** 尽可能从工作区和用户的请求中推断信息，然后写下你即将做的事——目标、主要产出、停止条件——并获得一次确认。这是你最后一个问题。确认之后即为自主运行。

2. **把基线作为第一件产物。** 每种模式都有一种「没有任何我的工作时的答案」——未修改的代码、找到的头三个来源、任何变换前的原始数据。先记录它。没有基线，「更好」和「显著」都毫无意义。

3. **每一步都记录在机读文件中，失败也记录。** 用制表符分隔的日志（TSV，而非 CSV——描述中含逗号），带一行表头和每次尝试一行。失败的尝试按 `crash` / `dead-end` / `inconclusive` 状态记录。悄悄丢弃尝试是自欺和欺骗用户最快的方式；日志才是你确实做了工作的证据。

4. **循环中绝不停下来请求许可。** 契约一旦确认，就不要停下来汇报、提议在「自然的间隙」停止，或问「是否继续」。人可能正在睡觉或无法联系，期望醒来时看到完整日志。循环只在约定的停止条件或人工中断时结束。**这是自主运行最常见的失败模式。**

5. **绝不操纵指标 / 来源 / 分析。** 不要因为评测代码「明显有错」就去改它。不要因为某个来源不符合你的论点就丢弃它。不要 p-hack，不要挑选能得出更好看的数字的子集。如果对基准事实有疑虑，把顾虑写在 description 列并继续——由人稍后决定。

## 选择模式

阅读用户的请求并选择一个模式。若有歧义，选最接近的一个，并在契约中说明你的选择。

| 模式 | 触发信号 | 阅读 |
| --- | --- | --- |
| **实验循环** | 「optimize」「tune」「run experiments」「improve this model」「hill-climb」「get the metric down/up」「自动实验」，以及任何可度量的仓库内代码目标 | `references/experiment-loop.md` |
| **主题调研 / topic survey** | 「survey」「literature review」「deep research」「research this topic」「调研」「gather evidence on」「what does the field say about」「state of the art」 | `references/topic-survey.md` |
| **量化分析 / quantitative analysis** | 「analyze this dataset」「量化分析」「test whether X relates to Y」「estimate the effect of」「investigate this data」，工作区中出现 CSV/parquet/dataframe | `references/quant-analysis.md` |
| **对比评测 / benchmark comparison** | 「compare X vs Y」「which of these should we use」「benchmark these」「选型」「对比评测」，需要从明确列表中挑一个候选 | `references/benchmark-comparison.md` |
| **根因排查 / root-cause investigation** | 「why is X broken」「root cause this」「debug the regression」「why is it flaky」「排查」「定位」「复盘」，任何「以前能用，现在不行」 | `references/root-cause.md` |
| **消融实验 / ablation study** | 「ablate」「which parts of X matter」「attribution study」「消融实验」「is Y pulling its weight」「leave-one-out」 | `references/ablation-study.md` |
| **复现论文 / paper reproduction** | 「复现这篇论文」「paper to code」「implement this method」「reproduce the main table」，用户递给你 arXiv id / DOI / PDF | `references/paper-reproduction.md` |
| **写论文 + 引用校验 / paper writing + citation audit** | 「write a paper on X」「polish this draft」「查引用」「citation check」「校验引用」「detect fabricated references」，任何待审计的 `.bib` 或 `.tex` | `references/paper-writing.md` |

**相邻模式——谨慎选择：**
- 实验循环 vs 对比评测：实验循环*改进一个东西*（修改 → 测量 → 保留/回退）。对比评测*比较多个东西*（公平矩阵，不偏袒心仪者）。如果用户想要候选中的赢家，就是对比评测；如果想让单个系统的指标移动，就是实验循环。
- 实验循环 vs 消融实验：两者都修改并重新测量，但消融做的是归因而非优化——无论指标是否移动，每个结果都保留，也不因发现大效应就提前停止。
- 根因排查 vs 实验循环：根因排查研究*坏掉的*基线；实验循环对*可用的*基线做爬山。调试不是优化——日志结构与停止规则都不同。
- 主题调研 vs 写论文：调研*阅读*文献来回答问题；写论文*产出*论文（并审计其参考文献）。「写一篇文章综述」的请求是主题调研接写论文——把两者串联起来。
- 复现论文 vs 实验循环：复现瞄准别人的数字（论文的表格）；实验循环瞄准你自己系统上的指标。如果目标是「与论文数字持平」，就是复现；如果目标是「在我们的任务上超过论文数字」，就是从已复现的基线出发的实验循环。

**现在就**阅读相关参考文件，然后再写契约。每个参考文件都规定了该模式的契约字段、确切的日志结构、循环与报告格式。

## 工具箱（scripts/）

八种模式中有四种——主题调研、复现论文、写论文，以及实验循环的文献检索升级——依赖一组共享的、仅用标准库的 Python 脚本，用于查询免费学术 API（arXiv、Semantic Scholar、OpenAlex、Crossref、dblp）。**无需 API key、无需 MCP 服务器、无外部 Python 依赖。** 直接运行它们，不要重新实现。

```bash
# Multi-source paper search — arXiv + S2 + OpenAlex + Crossref, dedup, unified JSON
python3 scripts/paper_search.py "chain of thought reasoning" --sources arxiv,s2,openalex --limit 15 --out papers.json

# Verify ONE citation (waterfall: Crossref → S2 → OpenAlex → arXiv; title-similarity match)
python3 scripts/verify_citation.py --title "Attention Is All You Need" --author Vaswani --year 2017

# Audit an entire .bib file → per-entry verdict (VERIFIED / MISMATCH / NOT_FOUND)
python3 scripts/verify_citation.py --bib refs.bib --out audit.json

# Fetch a paper's full text (arXiv id or abs URL → text via ar5iv HTML, falls back to abstract)
python3 scripts/fetch_paper.py 2504.17192 --out paper.txt

# Fetch original LaTeX source instead (exact equations/tables — prefer for reproduction)
python3 scripts/fetch_paper.py 2504.17192 --latex --out-dir paper_src/
```

遇到 HTTP 429/5xx 时，脚本会退避重试。如果某个来源持续失败，脚本会继续使用其他来源并标记该缺口——绝不要静默吞掉缺口。当脚本不覆盖你需要的查询形态时，直接调用原始 API；所有免费学术 API 的端点、速率限制与字段语法都在 `references/api-cheatsheet.md` 中。

**使用本工具箱时不可协商的规则：**

- **绝不编造引用。** 任何输出中的每条引用都必须能追溯到磁盘上捕获的真实 API 响应（`papers.json`、`citation_audit.json`）。如果校验失败，标记 `[unverified]` 或删除——绝不猜测元数据。
- **URL 来自搜索结果，而非记忆。** 不是从 API 调用得到的 URL 就是幻觉。
- **矛盾是发现，不是问题。** 如果两个来源对某篇论文的年份或会议意见不一，记录两者，并基于可辩护的理由选择其一——不要悄悄覆盖。

## 报告

每种模式最后都给出一份紧凑的最终报告（纯 markdown，作为你的最终消息交付）。结构：

- **契约**：一段话，说明你打算做什么。
- **基线与最终**：工作前后的数字或摘要。
- **哪些有效**：3–5 条，带定量依据或具体来源支撑。
- **哪些无效**：死路、崩溃或矛盾——这是高信号内容。
- **未解问题 / 下一步**：如果时间更多你会做什么。
- **去哪里看**：指向日志文件、分支以及任何生成的产物。

控制在一页以内。重点不是讲故事——而是让一个人能在五分钟内核实你的工作，并知道下一步该看什么。
