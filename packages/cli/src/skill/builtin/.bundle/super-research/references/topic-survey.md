# 模式：主题调研

当用户想通过收集并综述外部来源回答一个研究问题时使用——「survey the literature」「调研 X」「state of the art in Y」「gather evidence about Z」。

本模式要防范的失败模式是：产出一份听起来合理、却无法追溯回来源的综述。每条论断都必须能追溯到 `sources.tsv` 中的具体一行。

## 契约字段

1. **研究问题**：一个问题，锋利到有明确答案。如果用户问「RL 现在什么状态」——协商成「截至 2026 年中期，离线 RL 的三大开放问题是什么」或类似表述。含糊的问题产出含糊的综述。
2. **范围边界**：时间窗（例如「2024 年以来的论文」）、来源类型（同行评审 / 博客 / 基准 / 代码仓库——要明确）、语言，以及用户关心的显式包含/排除项。
3. **深度**：至少多少来源才停止？短综述默认 15，彻底综述默认 30。还包括饱和判据——当最近 5 个来源没有为你的综述增加新论断时停止。
4. **交付物**：Markdown 报告 + `sources.tsv`（证据表）+ 可选的 `claims.tsv`（论断 ↔ 来源映射）。目标长度（通常报告正文 1–3 页）。
5. **工作目录**：专用的 `survey/<tag>/` 文件夹。一切——日志、来源、笔记、草稿——都放在那里。

## 基线

你的基线是搜索之前的**结构化问题分解**：

- 编写 `question.md`，包含：问题、子问题、理想答案应是什么样，以及你要搜索的 5–10 个关键词变体/同义词簇。这会迫使你在 Google 之前先思考。
- 然后做一次「冷启动」搜索——用最显而易见的查询搜 3 次——并把结果记入 `sources.tsv`。这是你的基线轮。它告诉你（也给日后的人）一次朴素搜索会返回什么。

## 证据日志

`sources.tsv`（制表符分隔），每遇到一个来源一行：

```
id	url_or_id	kind	year	title	relevance	credibility	claim_ids	notes
S001	arxiv.org/abs/2405.12345	paper	2024	Attention Is All You Need V2	high	high	C1,C3	primary reference on X
S002	nitter.net/andrejkarpathy/status/…	tweet	2026	Thread on Y	medium	low	C2	anecdotal but from primary author
S003	dead-link	404	—	—	dead	dead	—	referenced by S001 but 404
```

- **id** —— `S001`、`S002`……单调递增。这是报告引用时使用的编号。
- **url_or_id** —— 足以重新找到该来源。
- **kind** —— `paper` / `preprint` / `blog` / `docs` / `code` / `tweet` / `book` / `talk` / `podcast` / `other`。明确写出，以便审阅者为其加权。
- **year** —— 用于按新近度过滤。
- **title** —— 简短。
- **relevance** —— `high` / `medium` / `low` —— 该来源对你的综述推动有多大。
- **credibility** —— `high`（同行评审、第一作者、官方文档）、`medium`（高引用预印本、可靠博客）、`low`（匿名博客、无佐证）、`dead`（404、已撤稿）。不要因为来源支持你的论点就上调可信度。
- **claim_ids** —— 该来源支撑的论断 ID（见下文 `claims.tsv`）。仅作背景的来源可以留空。
- **notes** —— 一行，必要时可机读（「supersedes S001」「contradicts C3」）。

**记录你看过的每个来源，包括死路和重复项。** 日志的意义不是当参考文献目录——而是当审计轨迹。变成 404 的来源，或读摘要后发现跑题的论文，都是值得记录的真实工作。悄悄丢弃来源，正是综述被指责挑樱桃的根源。

## 论断日志（可选但建议）

`claims.tsv`，你的综述将依赖的每条独立论断一行：

```
id	claim	support_sources	contradict_sources	confidence
C1	Muon optimizer outperforms AdamW on small-scale LM training by 5-15% val loss reduction	S001,S004,S007	S012	high
C2	SwiGLU activation is universally better than GeLU	S002,S008	S015,S016	medium — two credible contradicting sources
C3	Byte-level tokenization is competitive with BPE below 1B params	S001	—	low — single source
```

如果某条论断没有任何反向来源，这很可疑——要么所有人意见一致（成熟领域的常见情形），要么你还没足够努力地寻找反方证据。在置信度中注明这一点。

## 循环

循环直到饱和，或达到深度下限且最近 5 个来源未增加新论断：

1. 挑选覆盖最弱子问题。选一个查询——在迭代间变换关键词、站点、时间窗。
2. 抓取结果。对每条结果，读足够内容（摘要、第一节、关键图表）以判断相关性。
3. 记入 `sources.tsv`——记录你看过的每个来源，而不只是有用的。
4. 如果它支持或反驳某条已有论断，更新 `claims.tsv`。如果它引入了一条新的独立论断，新增一行。
5. 每约 5 个来源，完整重读 `claims.tsv`——综述就在这里发生。论断是否变得更锋利？某条论断是否在新证据下崩塌？是否浮出新的子问题？
6. 继续循环。

## 学术/论文为主的综述——使用工具箱

当你关心的来源是同行评审论文或 arXiv 预印本（而非博客/推文/文档）时，优先使用共享脚本，而不是临时 WebFetch。它们一次调用多个免费 API，并为你自动去重：

```bash
# Multi-source paper search — arXiv + S2 + OpenAlex + Crossref
python3 scripts/paper_search.py "<query>" --sources arxiv,s2,openalex --limit 20 --year-from 2022 --out papers.json

# Snowball from a central paper (S2's citation graph)
# → see references/api-cheatsheet.md § Semantic Scholar for `/paper/<id>/citations` and `/references`

# Fetch a paper's full text or LaTeX for close reading
python3 scripts/fetch_paper.py <arxiv_id> --out papers/<slug>.txt
python3 scripts/fetch_paper.py <arxiv_id> --latex --out-dir papers/<slug>/src/
```

对论文综述有回报的策略：

- 跑 2–4 个查询变体（同义词、子领域术语）再合并——关键词搜索会漏掉相邻文献。
- 滚雪球：对 2–3 篇最核心的论文，沿 S2 的 citations/references 走（见 `references/api-cheatsheet.md`）。一次好的滚雪球胜过又一轮关键词扫描。
- 也用 WebFetch 抓综述论文的相关工作章节和 awesome-list——它们能浮现出关键词搜索排序不到的内容。
- **最终报告中的每个 URL 都必须来自 `papers.json` 的某一行，或你确实执行过的抓取。** 凭记忆回忆的 URL 是幻觉；不要写出来。
- 需要并行抽取 10–25 篇论文时，按每批 3–5 个派生子代理，给每批提供已抓取的文本文件路径（不是摘要）以及 `question.md` 中的字段结构。

## 判断

**深度优先，广度其次。** 认真读一篇论文，往往比泛读十篇更能推动综述。优先沿高质量来源的引用链走，而不是再次搜索关键词。

**矛盾是金矿——标出它们，不要抹平。** 如果两个可靠来源意见不一，这正是该子问题的发现。你的职责是呈现它，而不是挑选赢家，除非证据明显不对称。

**积极更新论断。** 新出现的高可信度反向证据，应当迫使你下调某条论断的置信度，即使你已经写好了那一节。如果你发现自己在维护先前立场而不是更新它，那就是做错了。

**绝不编造引用。** 如果找不到支持你想提出的论断的来源，不要发明一个。弱化该论断（「似为常见做法，但我们未能找到同行评审来源」）并注明。

## 最终报告

参见 SKILL.md 的「报告」。正文的模式专属结构：

- **对研究问题的回答**——开头 2–3 句。如果确实开放，就直说。
- **各子问题的发现**——每段一个。每条非平凡的句子都在行内引用 `S00N`。
- **矛盾与开放问题**——来源在何处分歧，以及哪些尚未定论。
- **方法学说明**——考察了多少来源，在第 N 个来源达到饱和，排除项及原因。
- **去哪里看**：`sources.tsv`、`claims.tsv`、`survey/<tag>/` 文件夹。
