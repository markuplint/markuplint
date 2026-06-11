---
description: Check and update GitHub Sponsors listings across README and website
---

Check and update GitHub Sponsors listings.

## Steps

1. Fetch active sponsors and their tiers via GitHub GraphQL API:

```bash
gh api graphql -f query='{ organization(login: "markuplint") { sponsorshipsAsMaintainer(first: 100, activeOnly: true) { nodes { sponsorEntity { ... on User { login name avatarUrl } ... on Organization { login name avatarUrl } } tier { monthlyPriceInDollars name } } } } }'
```

2. Read current listings from these 4 files:
   - `README.md` (root)
   - `packages/markuplint/README.md`
   - `website/community/index.mdx`
   - `website/i18n/ja/docusaurus-plugin-content-docs-community/current/index.mdx`

3. Show a diff report:
   - New sponsors (not yet listed)
   - Ended sponsors (to be moved to Past sponsors)
   - Tier changes

4. After user confirmation, update all 4 files in sync.

See `.claude/skills/sponsors/SKILL.md` for listing formats and tier details.
