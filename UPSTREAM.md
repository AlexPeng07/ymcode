# Upstream

ymcode is an independent repository imported from MiMo-Code. It does **not**
share git history with the upstream project, so upstream changes are reviewed
as diffs rather than merged automatically.

## Baseline

- Repository: https://github.com/XiaomiMiMo/MiMo-Code
- Commit: `88673c41732fcd57bf46abe485b547c00ba78221`
- Date: 2026-10-21
- License: MIT

The pristine upstream checkout is kept at `_upstream_mimo/` and is excluded
from this repository. The import commit is `00bc4f9`.

## Reviewing upstream changes

```bash
# Update the read-only upstream checkout
git -C _upstream_mimo fetch origin main
git -C _upstream_mimo checkout origin/main

# Compare the current tree with the updated upstream (read-only review)
git -C _upstream_mimo diff --stat <old-commit>..HEAD
```

Do not merge upstream history into `main`. Port changes by reading the diff and
re-applying them as normal commits.

## Brand rename policy

First-party identifiers are renamed to ymcode. External names are deliberately
kept:

- Xiaomi MiMo model names, `mimo` / `xiaomi` provider IDs, and MiMo platform URLs.
- `opencode` / `anomalyco/opencode` upstream references and `.opencode` roots.
- Third-party product and API names referenced by bundled skills.

`script/check-brand.ts` enforces this policy. Every allowlist entry must state
a reason; whole-directory wildcards are not accepted.

## Local modifications

The main differences from upstream are documented in:

- `docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`
- `docs/superpowers/plans/2026-10-21-ymcode-rename.md`
- `docs/superpowers/plans/2026-10-21-ymcode-instincts.md`
- `docs/superpowers/plans/2026-10-21-ymcode-localization.md`
