---
name: sponsors
description: >
  Check current active GitHub Sponsors and sync README/website listings.
  Used for periodic checks and listing updates.
metadata:
  internal: true
---

# Sponsors Management Skill

Manage GitHub Sponsors listings across the project.

## Listing Files (4 locations — always update ALL in sync)

| # | File | Format |
|---|---|---|
| 1 | `README.md` (root) | `<img>` tag |
| 2 | `packages/markuplint/README.md` | `<img>` tag |
| 3 | `website/community/index.mdx` | `<Profile>` component |
| 4 | `website/i18n/ja/docusaurus-plugin-content-docs-community/current/index.mdx` | `<Profile>` component |

Match the markup of the existing entries in each file. Corporate entries are rendered larger than personal ones (README: `width="140"` vs `width="36"`; website: full `<Profile>` with `website`/`twitter` vs `<Profile mini>`).

## Tiers and Incentives

| Tier | Monthly | Incentive |
|---|---|---|
| Corporate | $100/mo | Company logo on README + website |
| Personal | $10/mo | Personal avatar on README + website |
| Badge | $5/mo | GitHub badge only (no README/website listing) |

## Fetching Active Sponsors (GitHub GraphQL API)

```bash
gh api graphql -f query='
{
  organization(login: "markuplint") {
    sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
      nodes {
        sponsorEntity {
          ... on User {
            login
            name
            avatarUrl
          }
          ... on Organization {
            login
            name
            avatarUrl
          }
        }
        tier {
          monthlyPriceInDollars
          name
        }
      }
    }
  }
}
'
```

## Update Procedure

1. **Fetch active sponsors via GraphQL API**
2. **Read current listings from all 4 files**
3. **Identify differences:**
   - New sponsors (in API but not listed) -> Add
   - Ended sponsors (listed but not in API) -> Move to Past sponsors
   - Tier changes ($10 -> $5, etc.) -> Add or remove from listings
4. **Update all 4 files in sync** (never update just one and forget the others)
5. **Moving to Past sponsors:**
   - README: Remove the line only (no Past sponsors section)
   - Website: Remove `<Profile>`, add `- [login](URL)` to Past sponsors list

## Notes

- The Japanese website version has no Corporate sponsors section (English only)
- $5/mo Badge tier sponsors are NOT listed on README/website
- Add new entries to the top of the Past sponsors list
