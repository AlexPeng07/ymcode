# 免费学术 API 速查表

下面所有端点都**无需 API key**。在 `scripts/` 失败或需要自定义查询时使用。始终发送带 mailto 的 User-Agent（部分 API 会给可识别的「礼貌」客户端更好的速率限制）。

## arXiv

- 搜索：`http://export.arxiv.org/api/query?search_query=all:<terms>&max_results=20&sortBy=relevance`（Atom XML）
  - 字段前缀：`ti:` 标题、`au:` 作者、`abs:` 摘要、`cat:cs.LG` 分类；组合：`au:vaswani+AND+cat:cs.CL`
- 按 id：`?id_list=1706.03762`
- PDF：`https://arxiv.org/pdf/<id>.pdf` · HTML 全文：`https://ar5iv.labs.arxiv.org/html/<id>`
- 限制：礼貌起见约 1 请求 / 3 秒；无需认证。

## Semantic Scholar (S2)

- 搜索：`https://api.semanticscholar.org/graph/v1/paper/search?query=<q>&limit=20&fields=title,authors,year,abstract,externalIds,citationCount,venue,url`
- 论文详情：`/graph/v1/paper/<id>`，其中 id 为 `arXiv:2504.17192`、`DOI:...` 或 S2 哈希
- **滚雪球**：`/graph/v1/paper/<id>/citations?fields=title,year` 与 `/references`——最好的免费引用图 API
- 限制：未认证池很紧张（429 常见——脚本会退避；若持续，放弃 S2 改用 OpenAlex）。

## OpenAlex

- 搜索：`https://api.openalex.org/works?search=<q>&per-page=25`
- 过滤：`&filter=from_publication_date:2022-01-01,cited_by_count:>50,open_access.is_oa:true`
- 按 DOI：`/works/doi:10.xxxx/yyy`——响应包含 `best_oa_location`（免费 OA-PDF 解析器，内含 Unpaywall 数据）
- 摘要以 `abstract_inverted_index` 形式给出（词 → 位置）；反转它即可重建。
- 限制：10 万/天，非常可靠。加上 `&mailto=you@example.org` 进入礼貌池。

## Crossref

- 搜索：`https://api.crossref.org/works?query.bibliographic=<title+author>&rows=5`——最适合引用核实（DOI 权威）
- 按 DOI：`/works/<doi>`
- 字段：`title[]`、`author[].family`、`issued.date-parts`、`container-title[]`、`is-referenced-by-count`
- 限制：配合礼貌 UA 时较宽松。

## dblp（CS 会议/作者）

- `https://dblp.org/search/publ/api?q=<q>&format=json&h=10`——CS 论文精确的会议/年份；适合核实会议声称。

## PubMed（生物医学）

- 搜索：`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<q>&retmax=20&retmode=json`
- 抓取：`efetch.fcgi?db=pubmed&id=<pmid>&rettype=abstract&retmode=text`
- 限制：无 key 时 3 请求/秒。

## 全文获取阶梯

1. 已知 arXiv id → ar5iv HTML（`scripts/fetch_paper.py`）
2. 已知 DOI → OpenAlex `best_oa_location` → 抓取落地页
3. Europe PMC（生物医学 OA）：`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=<q>&format=json`
4. 没有任何开放版本 → 基于摘要工作；把分析标为 `[abstract only]`。

## 来源选择

| 需求 | 使用 |
|---|---|
| CS/ML 近期预印本 | arXiv, S2 |
| 引用数 / 引用图 | S2, OpenAlex |
| 核实某条引用存在 | Crossref → S2 → OpenAlex → arXiv（瀑布式） |
| CS 会议元数据 | dblp |
| 生物医学 | PubMed, Europe PMC |
| 跨学科覆盖 | OpenAlex |
