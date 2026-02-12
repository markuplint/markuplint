---
description: Create GitHub Release notes
---

# Release Notes Creation

Create a GitHub Release for the latest published version.

## Steps

1. Identify the latest version tag and the previous release tag
2. Analyze all commits between the two tags using `git log` and `git diff`
3. Categorize changes and draft release notes following the format below
4. Create the GitHub Release using `gh release create`
5. Generate an X (Twitter) post message and present it to the user for copying

## Release Notes Format

All content must be written in **English**.

```markdown
## Highlights

- One-line summary of each major change (3-5 bullet points)

---

## Features

### @markuplint/<package>@<version>

- **Feature title** ([#PR](https://github.com/markuplint/markuplint/pull/N), [#Issue](https://github.com/markuplint/markuplint/issues/N))
  - Additional detail or context

### @markuplint/<package>@<version>

- **Feature title** ([#PR](url))
  - Additional detail

---

## Bug Fixes

### @markuplint/<package>@<version>

- Fix description ([#PR](url))

---

## Other Changes

- `@markuplint/<package>`: Brief description of non-feature, non-fix changes
- Dependency updates, documentation improvements, refactoring, etc.

---

## Updated Packages

| Package | Version |
|---------|---------|
| markuplint | x.y.z |
| @markuplint/<package> | x.y.z |

---

**Full Changelog**: https://github.com/markuplint/markuplint/compare/vPREVIOUS...vCURRENT
```

## Formatting Rules

- Group changes by package, with `### @markuplint/<package>@<version>` subheadings
- Bold the main description of each feature or fix
- Include PR and issue links where available; use external spec issue links (whatwg, w3c) when relevant
- Separate sections with `---` horizontal rules
- The `Highlights` section summarizes the most impactful changes (not every change)
- The `Other Changes` section uses a flat bullet list (no subheadings)
- The `Updated Packages` table lists only packages with version bumps in this release
- Omit sections that have no entries (e.g., skip `Bug Fixes` if there are none)

## gh Command

```bash
gh release create v<VERSION> --title "v<VERSION>" --notes "$(cat <<'EOF'
<release notes body>
EOF
)"
```

- The tag must already exist before running `gh release create`
- Use heredoc format to preserve markdown formatting

## X (Twitter) Post

After creating the GitHub Release, generate an X post message and present it to the user for copying.

### Format

```
v<VERSION> released🎉 New features: <brief summary>. Bug fix for <brief summary>.
https://github.com/markuplint/markuplint/releases/tag/v<VERSION>
```

### Example

```
v4.11.6 released🎉 New features: Removed SVG elements 'font', 'glyph', and 'glyphRef', the HTML 'portal' element; added ARIA roles 'sectionheader' and 'sectionfooter'. Bug fix for Pug parsing.
https://github.com/markuplint/markuplint/releases/tag/v4.11.6
```

### Rules

- **Must be 280 characters or fewer** (X character limit) — count carefully before presenting
- URLs are always counted as 23 characters on X (t.co shortening)
- Summary part is a single paragraph with no line breaks; URL goes on the next line
- Start with `v<VERSION> released🎉` (no space before 🎉)
- Summarize features and bug fixes concisely in plain English
- Omit "Bug fix" sentence if there are no bug fixes; omit "New features" sentence if there are none
- Do NOT use hashtags or mentions
- End with the GitHub Release URL
