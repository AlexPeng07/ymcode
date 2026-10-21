---
name: arxiv
description: "当用户想要在 arXiv 上查找、阅读、引用、跟踪、下载或分析学术论文时使用本技能。包括：按主题、作者、分类或 arXiv ID 检索论文；获取摘要或完整元数据；生成 BibTeX 引用；下载 PDF；列出某领域的最新投稿（例如 cs.AI 每日摘要）；检查论文的引用影响力；查找谁引用了某篇论文、它引用了什么，或获取相关论文推荐。 | Trigger keywords: arXiv, arXiv ID, arxiv.org URL, paper search, literature review, find papers about X, cite this paper, what's new in cs.LG."
version: 2.0.0
license: MIT
platforms: [linux, macos, windows]
---

# arXiv 研究

使用免费的 arXiv API 和 Semantic Scholar API 检索、阅读、引用和分析学术论文。无需 API 密钥，无需依赖——随附脚本只使用 Python 标准库。

## 快速开始：`arxiv.py` 脚本

优先使用 `scripts/arxiv.py`，而不是直接用 `curl`——它负责 Atom XML 解析、带版本的 ID、撤稿论文检测，并输出干净可读（或 `--json`）的结果。

| 目标 | 命令 |
|------|---------|
| 检索论文 | `python scripts/arxiv.py search "GRPO reinforcement learning" --max 10 --sort date` |
| 带过滤条件的检索 | `python scripts/arxiv.py search "attention" --author vaswani --category cs.CL` |
| 完整元数据 + 摘要 | `python scripts/arxiv.py get 2601.02780,1706.03762` |
| BibTeX 引用 | `python scripts/arxiv.py bibtex 2601.02780` |
| 下载 PDF | `python scripts/arxiv.py download 2601.02780 --dest ./papers` |
| 某分类的最新论文 | `python scripts/arxiv.py new cs.CL --max 10` |
| 谁引用了这篇论文 | `python scripts/arxiv.py cites 2601.02780 --max 20` |
| 这篇论文引用了什么 | `python scripts/arxiv.py refs 2601.02780` |
| 相关论文推荐 | `python scripts/arxiv.py similar 2601.02780` |
| 机器可读输出 | 在任何命令后追加 `--json` |

常用参数：`--max N`（结果数量）、`--sort relevance|date|updated`、`--start N`（分页偏移，仅检索可用）、`--json`。

## 阅读论文内容

找到论文后，用 `webfetch` 工具阅读：

- 摘要页（快速，含元数据 + 摘要）：`https://arxiv.org/abs/2601.02780`
- 全文 HTML（最适合阅读，若可用）：`https://arxiv.org/html/2601.02780`
- PDF：`https://arxiv.org/pdf/2601.02780`

如果 HTML 不可用且必须在本地处理 PDF，先 `download` 它，然后使用 PDF 处理技能。

## 推荐的研究工作流

**针对某个主题做文献综述**
1. `search "topic" --sort date --max 15` —— 近期工作
2. `search "topic" --max 15` —— 奠基性工作（按相关性排序）
3. 交叉核对影响力：先 `python scripts/arxiv.py get ID`，再 `cites ID --max 5` 查看引用量
4. 通过 `webfetch` 打开 abs/html 链接，阅读排名靠前的候选论文
5. 对保留下来的论文执行 `bibtex ID1,ID2,...`

**深入钻研单篇论文**
1. `get ID` —— 完整摘要、版本、期刊引用、DOI
2. `refs ID` —— 它建立在哪些工作之上
3. `cites ID` —— 后续工作（按引用量排序）
4. `similar ID` —— 你可能错过的相关论文
5. 用 `webfetch` 打开 HTML/PDF 获取全文

**跟踪领域动态**
- `new cs.AI --max 20` —— 某分类的最新投稿
- 分类体系：https://arxiv.org/category_taxonomy —— 常见分类：`cs.AI`、`cs.CL`（NLP）、`cs.CV`、`cs.LG`、`cs.CR`、`stat.ML`、`math.OC`

## 原始 API 参考（脚本不够用时）

脚本覆盖了大多数需求；高级查询请使用原始 API。

### arXiv API（Atom XML）

```bash
curl -s "https://export.arxiv.org/api/query?search_query=all:transformer&max_results=5"
```

字段前缀：`all:`（全部）、`ti:`（标题）、`au:`（作者）、`abs:`（摘要）、`cat:`（分类）、`co:`（评论，例如 `co:accepted+NeurIPS`）。

布尔语法（空格需 URL 编码为 `+`）：

```
all:GPT+OR+all:BERT              # OR
all:language+model+ANDNOT+all:vision   # AND NOT
ti:"chain+of+thought"            # exact phrase
au:hinton+AND+cat:cs.LG          # combined
```

参数：`sortBy`（`relevance`|`lastUpdatedDate`|`submittedDate`）、`sortOrder`、`start`、`max_results`、`id_list`（逗号分隔的 ID）。

### Semantic Scholar API（JSON）

arXiv 没有引用数据——Semantic Scholar 填补了这一空白（免费，未认证时约每秒 1 个请求）。

```bash
# Paper details with citation counts
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2601.02780?fields=title,citationCount,influentialCitationCount,tldr"

# Author profile
curl -s "https://api.semanticscholar.org/graph/v1/author/search?query=Yann+LeCun&fields=name,hIndex,citationCount,paperCount"

# Keyword search returning JSON (alternative to arXiv search)
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=GRPO&limit=5&fields=title,year,citationCount,externalIds"
```

常用字段：`title`、`authors`、`year`、`abstract`、`tldr`（AI 摘要）、`citationCount`、`influentialCitationCount`、`isOpenAccess`、`openAccessPdf`、`fieldsOfStudy`、`publicationVenue`、`externalIds`（arXiv ID、DOI）。

## 重要细节

**速率限制** —— arXiv：约每 3 秒 1 个请求；Semantic Scholar：约每秒 1 个请求。请拉开连续调用的间隔；遇到 HTTP 429 时脚本会以清晰的提示退出。

**ID 格式** —— 新式 `2402.03300`，旧式 `hep-th/0601001`。两者在任何地方都可用。

**版本** —— `arxiv.org/abs/2601.02780` 解析到最新版本；`...v2` 是特定的不可变版本。`bibtex` 和 `download` 会保留版本后缀，使引用与你实际阅读的内容一致（后续版本可能变化很大）。

**撤稿论文** —— 脚本会对摘要表明已撤稿/撤回的条目标注 `[WITHDRAWN]`。引用这些论文时请注明该状态。

**列表的注意事项** —— `new CATEGORY` 通过检索 API 按投稿日期排序；官方的 "new today" 列表 `https://arxiv.org/list/cs.AI/new` 分组方式可能略有不同（交叉列表、替换版本）。
