# 模式：量化分析

当用户想要一个由数据集计算出的数据驱动答案时使用——「analyze this data」「量化分析」「test whether X relates to Y」「estimate the effect of Z」「investigate this dataset」。

本模式要防范的失败模式是：产出看起来合理、但用户无法复现、核实或理解其局限的图表或统计量。每个报告的数字都必须追溯到某个脚本，而每个脚本都必须能在原始数据上端到端跑通。

## 契约字段

1. **问题**：清晰的假设或估计目标。不是「看看这份数据」，而是「在控制 Z 之后，特征 X 能否预测结果 Y？」，或「各团队首次响应时间的中位数是多少？」。如果用户只有数据集没有问题，就在契约中协商出一个具体问题。
2. **数据集**：路径、格式（CSV / parquet / JSON / DB 连接）、已知行数、已知 schema。记下用户提醒的任何事项（已知缺失值、重复列、样本偏差）。
3. **交付物**：包含发现的 `report.md`、`analysis_log.tsv`（每个分析步骤一行），以及一个 `scripts/` 文件夹，其中的编号脚本能复现报告里的每个图和数字。可选 `figures/` 文件夹。
4. **约束**：哪些是禁区？（例如「不要与内部 HR 表关联」「每个脚本的计算必须在 10 分钟内完成」「不用 ML 库——保持可解释的统计学」）。
5. **工作目录**：专用的 `analysis/<tag>/` 文件夹。一切都放在那里。

## 基线——数据审计

在**任何**建模或假设检验之前，先产出数据审计。这是你的基线产物；如果审计暴露出足够严重的问题（schema 错误、单位错误、文件损坏），分析就停在这里，改为报告该问题。

审计是一个脚本（`scripts/00_audit.py` 或类似），输出 `audit.md`，覆盖：

- **形状**：行数、列数。
- **Schema**：列、dtype、非空计数、唯一值计数、最小值/最大值或前三取值。
- **缺失**：每列空值百分比，以及空值是否系统性（例如与另一列相关）。
- **重复**：是否有整行重复；是否有自然键重复。
- **离群值**：对每个数值列，给出第 1/99 百分位值和明显越界的值。
- **针对问题的合理性检查**：所需列是否存在，且非空方差是否足以回答问题？

如果审计揭示了致命问题（用这份数据无法回答问题），停下并报告。不要粉饰。

## 分析日志

`analysis_log.tsv`（制表符分隔），每个分析步骤一行：

```
step	script	status	finding	caveat
01	scripts/00_audit.py	done	dataset OK: 42k rows, 3.2% missing in `age`, one obvious duplicate row	age nulls concentrated in the pre-2023 cohort — possible collection bias
02	scripts/01_distributions.py	done	Y is bimodal (peaks at 12 and 34); no obvious transform makes it normal	rules out linear regression as the primary tool
03	scripts/02_correlation.py	done	corr(X, Y) = 0.31, n=41000, p<1e-9	correlation not causation; X and confounder W are also correlated at 0.42
04	scripts/03_effect_of_X_controlling_for_W.py	done	partial correlation 0.09, 95% CI [0.06, 0.12]	effect size much smaller than raw correlation suggested
05	scripts/04_robustness_stratified.py	dead-end	stratifying by W gave inconsistent effect direction across strata (Simpson-flavored)	primary finding is unstable — must caveat in report
06	scripts/05_dependent_variable_check.py	done	Y distribution stable across strata, no measurement artifact	rules out one alternative explanation for step 5
```

- **step** —— `01`、`02`……单调递增。
- **script** —— 产出该发现的文件名。不是脚本产出的就不算发生——不要肉眼估计的数字。
- **status** —— `done` / `dead-end` / `inconclusive` / `error`。每次尝试都要记录，即使没有成功。
- **finding** —— 一句话，尽可能量化。
- **caveat** —— 一句话，说明它为何比表面看起来更弱。caveat 留空很可疑。

## 脚本文件夹

- 按步骤编号（`00_audit.py`、`01_distributions.py`、……），以便读者按顺序重跑。
- 每个脚本：读取原始数据、只做一件事、把图写入 `figures/`、打印其发现（你把这些抄进日志）。脚本之间不共享可变状态，除非你中间写出一个 parquet 再读回来。
- 不依赖 Jupyter kernel 的隐藏全局状态——只能在活动 notebook 中运行的脚本不可复现。

## 循环

循环：

1. 查看分析当前状态（日志、最近的发现、剩余未解子问题）。
2. 选择下一个信息量最大的步骤。典型分析的顺序是：审计 → 单变量分布 → 双变量探索 → 用合适模型做假设检验 → 稳健性检查（子组、替代设定）→ 排除替代解释。
3. 编写脚本。运行它，捕获打印的发现与图表。
4. 追加到 `analysis_log.tsv`。如果是死路（假设被打破、变量不可用、效应在某项检查下消失），也要记录——死路正是证明该发现真实的方式。
5. 如果发现暗示了**新**假设，写在日志的 caveat 列并加入队列。**不要**在分析中途更换主问题，除非数据使其无法回答——那种情况下要显式记录变更。
6. 循环，直到问题被回答且给出量化置信区间**且**稳健性检查确认，或者数据被证明无法回答该问题。

## 判断

**效应量优先于 p 值。** p<0.001 而效应量只有 0.02 的相关，意味着巨大样本在告诉你一件无趣的事。报告效应量 + 置信区间；把 p 值当作平局裁决。

**每个发现都至少需要尝试一种替代解释。** 如果 X 预测 Y，还有什么能预测 X？你考虑了哪些混杂因素？用何种方式排除了哪些？如果一个都没考虑，你的分析还没完成。

**不要 p-hack——记录你跑过的每个设定。** 如果你试了 4 种回归设定而其中 1 个显著，日志必须展示全部 4 个。只报告显著的那个就是造假。

**当答案是「用这份数据说不清」时，就说出来。** 诚实的「无定论」发现比虚假精确的结果更好。日志让这个立场站得住脚。

## 最终报告

参见 SKILL.md 的「报告」。模式专属正文：

- **头条发现**——1–2 句，含效应量与置信度。
- **我是如何得出的**——3–6 条要点，指向 `analysis_log.tsv` 中具体的步骤 ID。
- **稳健性**——尝试了哪些替代设定，哪些经受住了检验。
- **局限**——该发现可能错误或比表面更窄的前三大原因。
- **去哪里看**：`analysis_log.tsv`、`scripts/`、`figures/` 以及审计。
