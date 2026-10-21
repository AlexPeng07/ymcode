# 免费来源端点（无需 API key）

默认工具是 WebSearch + WebFetch。针对特定类型的视角，这些免费端点能给出更好的结构化结果。它们都无需密钥；遇到 429/5xx 时退避一次，然后跳过该来源继续。

## 通用网络搜索（WebSearch 工具不可用时的兜底）

如果 WebSearch 工具缺失或报错，可通过 WebFetch 使用 DuckDuckGo HTML——已验证能返回完整的 SERP 结果：

```
WebFetch https://html.duckduckgo.com/html/?q=<url-encoded query>
```

- 结果链接会被包装成 `//duckduckgo.com/l/?uddg=<url-encoded real URL>`——抓取前先解码 `uddg` 得到真实 URL。
- 支持操作符：`site:github.com`、`"exact phrase"`，以及作为查询参数的 `df=y`（过去一年）/ `df=m`（过去一月）。
- 中文话题还可以试试 Bing：`WebFetch https://www.bing.com/search?q=<query>&setlang=zh`（免密钥可用，质量参差）。


## 学术 / 论文

```bash
# arXiv (Atom XML)
curl -s "http://export.arxiv.org/api/query?search_query=all:\"deep+research+agent\"&sortBy=submittedDate&sortOrder=descending&max_results=10"

# Semantic Scholar (JSON; rate limit ~1 req/s unauthenticated)
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=deep+research+agent&fields=title,year,abstract,citationCount,externalIds,url&limit=10"

# OpenAlex (JSON, generous limits; add mailto for politeness)
curl -s "https://api.openalex.org/works?search=deep%20research%20agent&per-page=10&mailto=research@example.com"
```

arXiv 论文全文：用 WebFetch 抓 `https://arxiv.org/abs/<id>` 取摘要，或抓 `https://ar5iv.org/abs/<id>` 取 HTML 全文。

## 代码 / GitHub

```bash
# Repo search (60 req/h unauthenticated)
curl -s "https://api.github.com/search/repositories?q=deep+research+agent&sort=stars&per_page=10"

# README of a repo
curl -s "https://raw.githubusercontent.com/<owner>/<repo>/HEAD/README.md"
```

## 社区 / 讨论

- Hacker News：`https://hn.algolia.com/api/v1/search?query=<q>&tags=story`（JSON，免密钥）
- Reddit：WebFetch `https://www.reddit.com/search/?q=<q>`，或在任意帖子 URL 后追加 `.json`
- Stack Overflow：`https://api.stackexchange.com/2.3/search/advanced?q=<q>&site=stackoverflow`（JSON）

## 数据 / 事实

- Wikipedia REST：`https://en.wikipedia.org/api/rest_v1/page/summary/<title>`（JSON）
- Wikidata：`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=<q>&language=en&format=json`

## 可选升级（仅当已配置时——绝不强制要求）

如果环境中已有这些 MCP 服务器/工具，在其擅长的场景优先使用；否则静默忽略：

- Firecrawl MCP → WebFetch 渲染不佳的重 JS 页面
- arxiv / paper-search MCP → 论文下载 + PDF 文本抽取
- 任意搜索类 MCP（Tavily/Exa/...）→ 比 WebSearch 质量更高的 SERP

绝不要在调研过程中要求用户安装或配置任何东西。
