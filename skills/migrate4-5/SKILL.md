---
name: migrate4-5-legacy-path
description: Deprecated install path for the v4-to-v5 migration skill. Prefer npx skills add markuplint/markuplint@migrations/v4-v5 — content lives in skills/migrations/v4-v5/SKILL.md.
---

# migrate4-5 (legacy install path)

This directory exists so `npx skills add markuplint/markuplint@migrate4-5` keeps resolving after the skill moved to **`skills/migrations/v4-v5/`** (mirroring `docs/migration/v4-v5/`).

**Canonical install:**

```bash
npx skills add markuplint/markuplint@migrations/v4-v5
```

When working in the markuplint repository, read and follow **`skills/migrations/v4-v5/SKILL.md`**. When this legacy skill is the only copy installed, fetch the migration guide from the website (`/docs/migration/v4-to-v5/`) and apply the same checklist as that file (silent splits, Node 24, `--no-allow-warnings`, preset gaps).

Do not maintain divergent migration steps here — update `skills/migrations/v4-v5/SKILL.md` only.
