# 模式：写论文 + 引用校验

当用户要求撰写、打磨或核实学术论文的参考文献时使用——「write a paper on X」「polish this draft」「check every citation」「查引用」「citation audit」。也可独立用于你信不过其引用的现有 PDF/tex。

本模式要防范的失败模式是：编造的参考文献，以及（更糟的）用真实论文去支撑它们并未提出的论断。一份参考文献是幻觉的打磨稿在审阅者打开你引用的某篇论文之前看起来完美无瑕——之后一切崩塌。**最终稿中的每条引用都必须追溯到 API 返回的记录。**

本模式分两部分。它们可以一起运行（写新论文），也可以独立运行（审计别人的论文）。

## 第一部分：写作

### 契约字段（写作）

1. **手头输入**：既有草稿（路径）、实验日志 / `results.tsv`（路径——可能是某次实验循环运行的输出）、图表、目标会议/期刊 + 模板、页数限制。
2. **论断主轴**：论文将提出的 3–7 条实证论断。在起草前写好。每条论断映射到 (a) 具体的 `results.tsv` 行/图，或 (b) 被引论文。如果某条论断两者都不映射，现在就被删减或加限定——而不是被审阅者发现。
3. **大纲**：章节结构，每节 1–2 句目的 + 关键论断。起草前与用户确认。
4. **参考文献来源**：`refs.bib` 随写随从 `scripts/paper_search.py` 的结果构建。每条条目都源于 API 记录——元数据从 JSON 复制，绝不凭记忆回忆。
5. **工作目录**：`paper/<tag>/`——draft.tex 或 draft.md、`refs.bib`、`claims.tsv`、`citation_audit.json`、修订 `LOG.md`。

### 基线——论断映射

起草前：编写 `claims.tsv`，每条实证论断一行，各自映射到其证据来源。这是你的基线产物。

```
id	claim	evidence_kind	evidence_ref	confidence	notes
K1	our method reduces val-loss by 12% at 200M params	own experiment	results.tsv row 47 (commit c3d4e5f)	high	
K2	prior work uses AdamW as default optimizer for LMs	cited paper	@vaswani2017,@brown2020	medium	need one more citation for "default"
K3	Muon has been shown to outperform AdamW at small scale	cited paper	@karpathy2024	low — single blog source	replace with peer-reviewed source or hedge
K4	our approach is "significantly better"	???	—	—	CUT — no evidence source, drop or hedge
```

没有证据的行在起草前删减或加限定。其余每一行都必须通过第二部分的审计。

### 修订日志

`LOG.md`（仅追加），每次起草或修订一轮记一条：

```
2026-07-07T14:30  outline confirmed with user (3 sections, 6 pages)
2026-07-07T15:10  drafted §2 (related work) — refs added: karpathy2024, vaswani2017, brown2020
2026-07-07T16:00  ran citation audit v1 — 2 NOT_FOUND, 1 MISMATCH; fixed metadata, replaced fabricated ref
2026-07-07T17:20  reviewer subagent pass — flagged §4 overclaims "significantly"; softened to "consistently"
```

### 起草循环

对大纲中的每一节：

1. 逐节起草。数字来自 `results.tsv` 与图表——绝不四舍五入，绝不肉眼估计。
2. 每条引用都插入在提出论断的位置。插入 `\cite{key}` 时，确保 `key` 存在于 `refs.bib` 且来自某条 `paper_search.py` 结果。如果还没有，立刻运行搜索、补上条目，再引用。
3. 每节写完后重读：每条非平凡句子是否都带有引用或 `results.tsv` 引用？空引用是反模式。
4. 全稿完成后：在评审轮之前先跑第二部分（引用校验）——你不希望审阅者发现本可由机器发现的编造内容。
5. **审稿子代理轮**——派生一个全新子代理，只给它草稿路径（不给你的 `claims.tsv`，不给你的置信度）。让它给出最强的拒稿理由：最弱的论断、缺失的基线、过度声称。在文中回应或明确让步。1–3 轮；当新发现开始变成吹毛求疵时停止。
6. **精炼只会收紧，绝不膨胀。** 如果某一轮修订结束时论断比基线更强，就回退——你已漂向过度声称。

## 第二部分：引用校验

对任何有参考文献的论文/草稿运行。可独立使用（对现有 PDF/tex「查引用」）。

### 契约字段（仅审计）

1. **参考文献来源**：`refs.bib` 的路径（或用于抽取 bib 的论文 PDF/tex）。
2. **草稿来源**：tex/md 草稿路径（第二部分第 2 步的上下文审计需要）。
3. **交付物**：`citation_audit.json`（逐条判定）、`audit_report.md`（摘要 + 修复）。
4. **修复权限**：审计者可以自动做什么、必须询问什么（见下面修复矩阵）。

### 基线——机械审计

在任何上下文分析之前，先对整份 bib 跑元数据检查：

```bash
python3 scripts/verify_citation.py --bib refs.bib --out citation_audit.json
```

逐条机械判定：

| 判定 | 含义 |
|---|---|
| `VERIFIED` | 标题/作者/年份与 Crossref / S2 / OpenAlex / arXiv 中的真实记录一致 |
| `MISMATCH` | 找到记录但元数据不一致（年份错、会议错、第一作者错） |
| `NOT_FOUND` | 4 个 API 均未找到——可能是编造 |
| `UNCERTAIN` | 多个弱匹配，含糊 |

`citation_audit.json` 成为本次运行的审计日志。每条条目必须有判定；不得静默跳过。

### 上下文审计——最要紧的失败模式

用真实论文支撑它并未提出的论断，比明显编造的引用更糟，因为它能通过机械检查。对草稿中的每条引用：

1. 抽取包含 `\cite{key}` 的句子，并识别它所支撑的具体论断。
2. 抓取被引论文的摘要（来自 `citation_audit.json` 的 `matched` 字段，或 `scripts/fetch_paper.py <arxiv_id>`）。
3. 判定其一：`SUPPORTS` / `WEAK`（摘要暗示但未直接说明）/ `WRONG`（摘要不含此论断）/ `UNKNOWN`（需抓全文——标记待查）。
4. 对**承重引用**（论文贡献所依赖的论断）要读摘要之外的内容——把抓取预算花在那里。

参考文献很长时，用子代理分批处理。每个子代理拿到句子 + 摘要 + 引用 key——**不要**给它你对判定的预期。新鲜的眼光能防止确认偏差。

把上下文判定追加到 `citation_audit.json` 的每条条目。

### 修复矩阵——四种判定，四种动作

| 组合判定 | 动作 | 自动？ |
|---|---|---|
| VERIFIED + SUPPORTS | 保留 | 是 |
| VERIFIED + WEAK | 复核（必要时在文中对论断加限定） | 询问用户 |
| MISMATCH + SUPPORTS | 按 `matched` 字段修正元数据 | 是 |
| MISMATCH + WRONG | 替换 | 询问用户 |
| NOT_FOUND | 替换（搜索真实替代）或删除 | 询问用户 |
| 任意 + WRONG | 替换（找一篇真正支撑该论断的论文）或删除 + 加限定 | 询问用户 |
| UNCERTAIN / UNKNOWN | 保持标记；不要猜判定 | — |

**删除后绝不留下悬空的 `\cite`。** 删除 `.bib` 条目与删除 `\cite` 是同一个操作。如果某条论断只靠一条被移除的引用支撑，该论断现在已失去支撑——加限定或删掉。

**修复来自 API 返回的记录，绝不来自记忆。** 如果 API 说年份是 2023 而 bib 写 2022，以 API 为准。绝不要按你「以为」的论文年份去改元数据。

### 审计报告

`audit_report.md`：

```
Total entries: 47
VERIFIED + SUPPORTS: 39 (kept)
MISMATCH (fixed):    5   → metadata corrected from API records
NOT_FOUND:           2   → 1 replaced (Muon → @jordan2024muon), 1 removed + claim hedged
WRONG context:       1   → replaced (@brown2020 cited for a claim only @wei2022 makes)
UNCERTAIN:           0   remaining after review
```

## 反模式（两个部分）

- 把数字往有利方向四舍五入。
- 没有统计检验却使用「significantly（显著）」。
- 用论文支撑其摘要中并不包含的论断（第二部分第 2 步会检查）。
- 在精炼过程中扩张论断（精炼只收紧，绝不膨胀）。
- 凭记忆而非 API 结果填写 bib 元数据。
- 仅凭标题匹配就把承重引用标为 `VERIFIED`，而不读摘要。

## 最终报告

参见 SKILL.md 的「报告」。模式专属正文：

- **写了/审计了什么**——一段话。
- **论断映射摘要**——共多少条论断，多少由自己的实验支撑、多少由引用文献支撑，写作过程中删减/加限定了多少。
- **审计结果**——按判定分类的条目计数、采取的动作、未解决的 `UNCERTAIN` 条目。
- **残余风险**——带限定进入最终稿的 WEAK 或 UNKNOWN 引用，以及原因。
- **去哪里看**：`claims.tsv`、`refs.bib`、`citation_audit.json`、`audit_report.md`、草稿、`paper/<tag>/`。
