---
name: release
metadata:
  internal: true
description: >
  Release markuplint — version bump (lerna fixed mode), tag push, publish
  workflow monitoring, npm-state verification, GitHub Release notes, and X
  post drafting. Use when asked to release, publish, or cut a new version.
disable-model-invocation: true
---

# Preconditions

- **Fixed versioning**: all packages share one version (`lerna.json` `version`).
- Releases are cut from `dev`. Pushing a `v*` tag triggers `.github/workflows/publish.yml`, which runs `lerna publish from-git` with a dist-tag derived from the version string (`-alpha.*` → `alpha`, `-beta.*` → `beta`, `-rc.*` → `rc`, no prerelease suffix → `latest`) via npm OIDC Trusted Publishing.
- **Publishing cannot be undone.** Confirm with the user at each gate.
- The VS Code extension ships separately (`yarn vscode:pre-package` to verify, then `yarn vscode:release`) and is out of scope here.

# Steps

## 1. Working tree and branch

`git status` must be clean, on `dev`, up to date (`git pull origin dev`). Anything dirty or diverged: report and wait for instructions.

## 2. Unmerged PRs

```bash
gh pr list --base dev --state open
```

Present anything that looks release-relevant; confirm whether to continue.

## 3. Pre-checks

`yarn lint-check`, `yarn build`, `yarn test` must all pass in this session. Also confirm `dev` CI is green:

```bash
gh run list --branch dev --limit 5
```

## 4. Present release contents

```bash
git describe --tags --abbrev=0
git log --oneline <last-tag>..HEAD
```

Show the current version (`lerna.json`). `yarn release` derives the next version from conventional commits automatically, so do **NOT** ask the user to choose a release type — present the diff only as a "what's going in" check.

## 5. Version bump (user-executed)

`lerna version` is an interactive command (selection/confirmation prompts) that cannot be driven through the `!` prefix — the prompt renders but accepts no input. Ask the user to:

1. Exit the Claude Code session (`exit`)
2. Run the release command directly in the terminal and answer the prompts
3. Return to this conversation with `claude --continue`

```
yarn release          # graduate (stable) — the standard path
```

Guide to a prerelease variant only when the user has explicitly asked for one:

```
yarn release:rc       # RC prerelease
yarn release:beta     # beta prerelease
yarn release:alpha    # alpha prerelease
```

Notes:

- Yarn 4 does not run arbitrary pre/post lifecycle hooks, so the root `prerelease` script (build + test) is NOT executed automatically by any variant — step 3 must have passed in this session.
- All variants use `--no-push`: the version commit and tag stay local until step 6.

## 6. Push the version commit and tag

Verify the tag exists locally, then push:

```bash
git tag --points-at HEAD
git push origin dev --follow-tags
git ls-remote --tags origin
```

## 7. Watch the publish workflow

The `v*` tag push fires `publish.yml`:

```bash
gh run watch --exit-status
```

On failure, show the log URL and go to step 9.

## 8. Verify npm state (the actual success gate)

Workflow success only means the publish process exited 0. Verify the registry:

```bash
npm view markuplint version
npm view markuplint dist-tags
npm view @markuplint/rules dist-tags
```

- Version must match step 5; dist-tag must match the release type (`latest` / `rc` / `beta` / `alpha`).
- Fixed mode can still partially publish. Spot-check core packages; if ANY mismatch is found, enumerate every public package (`npx lerna list --json`) and check each.
- Confirm provenance attestations are present (`npm view markuplint --json` → `dist.attestations`).

**Do not report the release as done before this step passes.**

## 9. Failure handling

- **Workflow failed before anything published**: fix the cause, `gh run rerun`.
- **Partial publish**: published versions are immutable. Ask the user before retrying — options are `gh run rerun` (re-attempts the same tag) or a local `npx lerna publish from-package` (publishes only versions missing from the registry; requires local npm auth, which OIDC does not provide).
- **Wrong version published**: unpublish is generally impossible. Propose `npm deprecate <package>@<version> "<reason>"` plus a corrected follow-up release — only with the user's explicit approval.

## 10. GitHub Release notes

Create a GitHub Release for the tag. All content in **English**.

```bash
gh release create v<VERSION> --title "v<VERSION>" --notes "$(cat <<'EOF'
<release notes body>
EOF
)"
```

Format:

```markdown
## Highlights

- One-line summary of each major change (3-5 bullet points)

---

## Features

### @markuplint/<package>@<version>

- **Feature title** ([#PR](https://github.com/markuplint/markuplint/pull/N), [#Issue](https://github.com/markuplint/markuplint/issues/N))
  - Additional detail or context

---

## Bug Fixes

### @markuplint/<package>@<version>

- Fix description ([#PR](url))

---

## Other Changes

- `@markuplint/<package>`: Brief description of non-feature, non-fix changes

---

## Updated Packages

| Package | Version |
|---------|---------|
| markuplint | x.y.z |
| @markuplint/<package> | x.y.z |

---

**Full Changelog**: https://github.com/markuplint/markuplint/compare/vPREVIOUS...vCURRENT
```

Formatting rules:

- Group changes by package, with `### @markuplint/<package>@<version>` subheadings
- Bold the main description of each feature or fix
- Include PR and issue links where available; use external spec issue links (whatwg, w3c) when relevant
- Separate sections with `---` horizontal rules
- `Highlights` summarizes the most impactful changes (not every change)
- `Other Changes` uses a flat bullet list (no subheadings)
- `Updated Packages` lists only packages with version bumps in this release
- Omit sections that have no entries

## 11. X (Twitter) post

Generate an X post message and present it to the user for copying.

```
v<VERSION> released🎉 New features: <brief summary>. Bug fix for <brief summary>.
https://github.com/markuplint/markuplint/releases/tag/v<VERSION>
```

Rules:

- **280 characters or fewer** — count carefully; URLs always count as 23 characters (t.co)
- Summary is a single paragraph with no line breaks; URL goes on the next line
- Start with `v<VERSION> released🎉` (no space before 🎉)
- Omit the "Bug fix" sentence if there are no bug fixes; omit "New features" if there are none
- No hashtags or mentions
- End with the GitHub Release URL
