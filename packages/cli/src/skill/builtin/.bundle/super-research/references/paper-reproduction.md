# 模式：复现论文

当用户递给你一篇论文（arXiv id、DOI、PDF 或 URL）并要求可运行的代码实现时使用——「复现这篇论文」「paper to code」「implement this method」「reproduce the main table of X」。

本模式要防范的失败模式是：产出一个*看起来*像该论文实现的仓库，却悄悄偏离论文——硬编码数字、凭想象填入的未说明超参，或者从未真正重跑论文实验的「复现」。每个歧义都必须是**记录在案的决策**，而不是看不见的猜测。每个报告的数字都必须来自你自己代码的真实运行，而不是论文。

## 契约字段

1. **论文**：arXiv id / DOI / URL。还有：是否存在官方参考实现？（在承诺从零复现之前，先用 WebFetch 搜 GitHub——用户可能只想让你运行他们的代码。）
2. **范围**：复现哪些实验。几乎从不是「全部」。通常是主结果表 + 用户关心的一两个消融。一个命中数字的限定范围复现，胜过十个开了头又放弃的全量复现。
3. **算力现实性**：如果论文的完整训练在本环境不可行（多节点、数周 TPU 等），先就一条**缩小规模的验证路径**达成一致：更小的模型、数据子集、更少的步数。最终报告会说明哪些是全量、哪些是缩放——绝不悄悄假装。
4. **交付物**：`paper/<tag>/` 目录，含 `plan.md`、`analysis.md`、代码仓库、`config.yaml`、`results.tsv` 与 `REPORT.md`。
5. **冻结输入**：论文文本就是规格。如果存在官方仓库且与论文矛盾，在日志中标出差异——不要不记录选择就默默跟随任何一方。
6. **停止条件**：数字落在与论文报告值约定容差内，或给出有合理解释的已记录差距（算力更少、未说明的超参、数据版本），或算力预算耗尽。

## 基线——磁盘上的论文产物

在写第一行实现代码之前，先产出这些产物。它们是基线；如果产不出来，复现尚不可行。

```bash
# LaTeX source — preferred: exact equations, tables, hyperparameters
python3 scripts/fetch_paper.py <arxiv_id_or_url> --latex --out-dir paper/<tag>/src/
# Fallback (some e-prints are PDF-only): readable text via ar5iv
python3 scripts/fetch_paper.py <arxiv_id_or_url> --out paper/<tag>/paper.txt
```

然后编写：

- **`plan.md`** —— 用你自己的话概述方法（附章节/公式编号）、范围决策（复现哪些实验）、仓库骨架（文件树，每个文件一行职责说明）、依赖图。
- **`analysis.md`** —— 对骨架中的每个文件，在写任何代码之前：输入/输出、它实现的论文公式、边界情形，以及**论文的每一处含糊之处**。歧义清单就是复现的风险登记册。
- **`config.yaml`** —— 论文提到的每个超参，附论文中的取值与章节引用。未说明者标为 `# [uncertain: not specified in paper, using common default of X]`。

如果论文经受不住与 `analysis.md` 的接触——歧义清单长到大多数数字都只能靠猜——就停下并报告，而不是继续。

## 复现日志

`results.tsv`（制表符分隔），每次尝试运行任何实验一行。结构与实验循环相同，另加一个 `target` 列：

```
commit	experiment	target	metric	resource	status	description
a1b2c3d	main_table_row1	0.312	0	0	crash	shape mismatch in attention block — see run.log
b2c3d4e	main_table_row1	0.312	0.415	1.2	discard	fixed shape bug; runs but 30% off paper — investigate
c3d4e5f	main_table_row1	0.312	0.318	1.2	keep	set warmup steps to 500 per §4.2; within tolerance
c3d4e5f	main_table_row2	0.287	0.291	1.3	keep	same config generalizes to row 2
```

- **experiment** —— 该行对应哪项论文结果（例如 `main_table_row1`、`ablation_no_dropout`）。
- **target** —— 论文为该实验报告的数字。从论文填入一次，此后绝不修改。
- **metric / status** —— 同实验循环（`keep` / `discard` / `crash`）。

单独的 `ambiguities.tsv`（或 `analysis.md` 中的一节）记录每次歧义处理：论文中的哪一处、歧义是什么、你选择了什么、为什么。这些是审阅者最先阅读的决策。

## 循环

按依赖顺序实现（依据 `plan.md` 的依赖图）。对每个模块：

1. 记下当前分支/提交——回退点。
2. 实现该模块的最小可用版本。一个模块一个提交。
3. 单元级冒烟测试：它产出的形状/类型是下一模块期待的吗？是则前进；否则修复。
4. 一旦有足够模块能端到端跑限定范围的实验，就运行：`<run command> > run.log 2>&1`。
5. 机械地提取指标。向 `results.tsv` 追加一行。
6. 与 `target` 比较：
   - 在容差内 → 标记 `keep`，继续下一个实验或消融。
   - 差得远 → 这才是有意思的情况。**不要**对着论文的测试数字调参（那是对目标过拟合——一种已知的自欺并欺人方式）。改为：重读 `analysis.md`，重访歧义，检查日志中你凭猜测填入的超参。
   - 崩溃 → `tail -n 50 run.log`；修复或记录为死路。
7. 每次处理歧义时即时记录。

**绝不修改论文。** 论文文本就是规格；如果论文有错或自相矛盾，注明并选定一种处理——不要为了迎合你的做法而改写论文。

## 判断

**全量训练还是缩放验证，永远要说清是哪种。** 如果你因为全量数据上 10 万步不可行而在子集上跑了 100 步，报告要在开头说明。悄悄只用 1% 算力的「复现」是隐瞒式谎言。

**差距是正常的——解释它们。** 复现很少能精确命中论文数字（算力不同、未说明的超参、数据集版本、框架数值差异）。有合理已记录原因的 3% 差距是有效结果；「差不多就行」的 30% 差距不是。

**不要靠调参调到论文数字。** 如果你发现自己在扫超参，直到某个特定测试集数字出现，就停下。那是对目标过拟合，产出的是一个背下论文表格、而非复现其方法的仓库。如果用户明确要求做目标匹配的扫描，就在报告中显著注明。

**配置优先于代码。** 每个超参都放在 `config.yaml`，绝不硬编码在模块里。审阅者先看配置——把未说明的默认值埋在代码深处，恰好隐藏了最要紧的歧义。

**官方仓库的分歧也是发现。** 如果论文说一套、发布的代码做另一套，那是论文 1 对实现 0——你必须选一个并记录选了哪个。不要把「代码这么写的」当作自动高于论文的基准事实。

## 最终报告

参见 SKILL.md 的「报告」。模式专属正文：

- **复现摘要**——一段话：引用的论文、复现范围、算力路径（全量还是缩放）。
- **数字表**——`experiment | paper | ours | gap | note`。这张表**就是**报告；其余一切都在支撑它。
- **已处理的歧义**——论文歧义清单及每处如何决策。审阅者正是拿它与论文文本核对。
- **已知偏离**——你在何处、为何偏离论文（或官方仓库），以及对数字的预期影响。
- **复现命令**——能从零重新生成数字表的精确 shell 命令。
- **去哪里看**：`plan.md`、`analysis.md`、`config.yaml`、`results.tsv`、`ambiguities.tsv`、代码仓库、`paper/<tag>/`。
