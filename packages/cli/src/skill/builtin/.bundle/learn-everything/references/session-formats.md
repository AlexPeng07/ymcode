# 会话格式

把这些作为默认格式，按学员与主题调整长度和标签。

## 课程状态（`learn/<slug>/course-state.md`，或可移植状态块）

持久记录。有文件工具时，把它作为文件在章节边界更新。没有文件工具时，在每个章节检查点把同样内容作为代码围栏块输出，并在前面加一行说明，告诉学员可以保存它、日后粘贴回来继续。

```markdown
# Course state: [subject]
**Learner:** [level, goal, pace — one line]
**Source:** [file/topic + scope]

## Chapters
- [x] 1. [title] — mastered: [concepts] | weak: [concepts]
- [ ] 2. [title]  ← current, [position within chapter]
- [ ] 3. ...

## Concept table
| Concept | Status | Evidence | Next review |
|---|---|---|---|

## Review queue
- [concept] — last asked: [chapter N] — [result]

## Error log
- [chapter N]: [main error class, one line]
```

保持紧凑——这是工作状态，不是课堂笔记。跨会话两次正确回答的概念行可以退役。

## 课程地图

```markdown
# Learning plan: [subject]

**Target capability:** [observable end capability]
**Starting level:** [level and brief evidence]
**Source scope:** [document pages/sections or topic boundaries]

| Chapter | Objective | Key concepts | Source | Practice outcome |
|---|---|---|---|---|
| 1. ... | ... | ... | pp. ... | ... |

**How we will work:** We will study one chapter at a time. You will attempt practice before solutions are shown.

## Start
[Diagnostic or Lesson 1 opening]
```

## 单课

```markdown
# Chapter [N]: [title]

**Why it matters:** ...
**By the end, you can:**
- ...
- ...

## 1. [concept]
[Explanation]

### Worked example
[Reasoned example]

### Common trap
[Misconception or boundary]

## Check
[One short active-recall question]
```

材料密集时，等学员回应后继续下一段讲解或练习。

## 练习提示

```markdown
## Practice [N]
**Skill tested:** [concept/cognitive level]
**Task:** ...
**Success criteria:** ...

Reply with your reasoning, not only the final answer.
```

不要在同一份回复中包含解法文本。

## 反馈

```markdown
**Verdict:** [Correct / Mostly correct / Partially correct / Needs revision]

**What worked:** ...
**Key gap:** ...
**Correction:** ...

**Next step:** [revision request, follow-up question, or advancement]
```

## 章节检查点

```markdown
## Chapter checkpoint
- Completed: ...
- Strong concepts: ...
- Needs review: ...
- Next chapter: ...

### Cumulative recall
1. ...
2. ...
3. ...
```

## 进度报告

```markdown
# Progress
**Course:** ...
**Completed:** [x/y chapters]
**Current:** ...
**Mastered:** ...
**Practicing:** ...
**Review needed:** ...
**Recommended next action:** ...
```
