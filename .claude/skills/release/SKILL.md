---
name: release
metadata:
  internal: true
description: >
  Release markuplint — branch promotion, version bump (lerna fixed mode), tag
  push, publish workflow monitoring, npm-state verification, GitHub Release
  notes, and X post drafting. Use when asked to release, publish, or cut a new
  version.
disable-model-invocation: true
---

# Preconditions

- **Fixed versioning**: all packages share one version (`lerna.json` `version`).
- **The release branch is not the development branch.** See [Branch model](#branch-model) — getting this wrong is the single most common mistake in this repository.
- Pushing a `v*` tag triggers `.github/workflows/publish.yml`, which runs `lerna publish from-git` with a dist-tag derived from the version string (`-alpha.*` → `alpha`, `-beta.*` → `beta`, `-rc.*` → `rc`, no prerelease suffix → `latest`) via npm OIDC Trusted Publishing.
- **Publishing cannot be undone.** Confirm with the user at each gate.
- **Run this in the user's main checkout, not in a worktree.** The worktree rule in the root `CLAUDE.md` is for topic-branch work; a release needs `main` checked out where the user runs `yarn release`, and a worktree holding `main` blocks the main checkout from switching to it. If this skill is invoked from a worktree session, stop before any checkout or merge and hand the steps to the user for the main checkout.
- The VS Code extension ships separately (`yarn vscode:package` to verify the VSIX build locally, then `yarn vscode:release`) and is out of scope here.

# Branch model

| Release type | Cut from | How work gets there |
| --- | --- | --- |
| **Stable** (`X.Y.Z`) | `main` | Merge `dev` (or the prerelease branch) into `main` first, then run `yarn release` on `main` |
| **Prerelease** (`-rc.N` / `-beta.N` / `-alpha.N`) | A dedicated branch, e.g. `v5-rc`, `v5-alpha` | Branch off **the line being released**, run `yarn release:rc` there, then merge that branch back into that line |
| Development | `dev` (v5 line), `v6` (next major), `v4` (v4 maintenance) | — never released from directly |

Verify the claim rather than trusting this table if anything looks off:

```bash
git log --oneline main --grep="chore(release)"   # stable releases live on main
git log --oneline v5-rc --grep="chore(release)"  # rc.0–rc.4 live on v5-rc
```

Three consequences that matter:

- **`main` looking "stale" is normal.** It carries the last released version until the next release. Merging into `main` *is* the release act, not a chore someone forgot.
- **Never run `yarn release` on `dev`.** `.husky/pre-commit` rejects every commit on `dev`, and Lerna only passes `--no-verify` when `commitHooks` is `false` (it defaults to `true`), so the version commit is refused. `main` and the prerelease branches are not guarded.
- **Prereleases are rare** — the v5 cycle is the only one so far. Keep using a dedicated branch for them; the v6 line will need the same, cut from `v6` (not from `dev`).

## Releasing while two lines are live

`dev` (v5, the shipped major) and `v6` (the next major) are developed in parallel. Every one of the following is an open decision — **treat a request to release anything from the v6 line as blocked until the user has decided each point explicitly**, and say so rather than improvising:

- **`publish.yml` does not build the native addon.** It runs `yarn build`, and `@markuplint/core` has no `build` script — only `build:napi` / `build:napi:debug` — so `lerna publish from-git` would ship `@markuplint/core` without its `*.node` binary, and no per-platform packages at all. Publishing cannot be undone, so a v6 publish is blocked until `publish.yml` cross-builds napi.
- **The version namespace is shared.** `lerna.json` is at the same version on both branches and versioning is fixed-mode, so both lines derive their next version from conventional commits into the same `v*` tag namespace and the same CHANGELOG lineage. The v6 line cannot rely on automatic derivation to reach `6.0.0`; the target version is a decision, not an inference — the automatic derivation in step 4 applies to the v5 line only.
- **dist-tags are a single slot per name.** The tag comes from the version string alone (`-alpha.*` → `alpha`, and so on), so a v6 prerelease and a v5 prerelease using the same suffix overwrite each other's tag. Run `npm dist-tag ls markuplint` before any prerelease and confirm which line owns which tag.
- **Merging `v6` into `main` retires the v5 line in one step.** Per [What the `main` merge switches over](#what-the-main-merge-switches-over), that merge flips the production docs, the JSON Schema `$ref` URLs, and VS Code completion to v6 for every existing v5 user simultaneously. There is no staged path. Do not merge `v6` into `main` for a prerelease — use a dedicated prerelease branch, which leaves `main` alone.

## What the `main` merge switches over

For a stable release, merging into `main` flips four user-facing surfaces at once. There is no way to stage them separately, so treat the merge as the point of no return:

| Surface | Wiring |
| --- | --- |
| npm packages | the `v*` tag push fires `publish.yml` |
| markuplint.dev (production docs) | `website/config.js` — no `NEXT_VERSION` ⇒ production URL, editUrl `main` |
| JSON Schema | `config.schema.json` and every rule `schema.json` `$ref` a `raw.githubusercontent.com/.../main/...` URL |
| VS Code completion | `vscode/package.json` — `markuplint.defaultConfig` `$ref` and `jsonValidation[0].url` point at that same schema |

Website changes therefore reach production in the same step. Confirm with the user that the website is in a shippable state before merging.

# Steps

## 1. Determine the release type and target branch

Ask the user only for the release channel (stable / rc / beta / alpha) if it is not already clear — the semver bump is derived, see step 4 — then pick the branch from [Branch model](#branch-model). Everything below writes `<release-branch>` for that branch.

`git status` must be clean. Anything dirty: report and wait for instructions.

```bash
git fetch origin
git checkout <release-branch>
git pull origin <release-branch>
```

For a **stable** release, merge the source branch in first and let the user review the diff before continuing:

```bash
git merge origin/dev          # or the prerelease branch, e.g. origin/v5-rc
```

For a **prerelease**, create the branch from the line being released if it does not exist yet — `git checkout -b v5-rc origin/dev` for the v5 line, `git checkout -b v6-alpha origin/v6` for the next major. Cutting a v6 prerelease from `dev` silently drops everything the v6 line adds.

## 2. Unmerged PRs

```bash
gh pr list --base <source-branch> --state open
```

`<source-branch>` is the development branch the release draws from — `dev` for the v5 line, `v6` for the next major. Present anything that looks release-relevant; confirm whether to continue. (PRs target the development branch, not the release branch.)

## 3. Pre-checks

`yarn lint-check`, `yarn build`, `yarn test` must all pass **in this session, on the release branch after the merge**. This is the only real gate:

- On a release branch with a `crates/` directory, `yarn test` is not the whole gate: add `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked` (what `.github/workflows/rust.yml` enforces), and confirm `@markuplint/core` was built with `yarn build:napi` — `yarn build` alone does not produce the addon.
- `.github/workflows/test.yml` also triggers on `push` to `dev`, so `gh run list --branch dev --workflow=test.yml` is real evidence for `dev`. It is not evidence for `main` or a prerelease branch — those still need this session's own `yarn lint-check`, `yarn build`, and `yarn test`, each run as its own command. For the v6 line, `test.yml` alone is not evidence either; `rust.yml` and `cargo-deny.yml` must be green too.
- Yarn 4 does not run arbitrary pre/post lifecycle hooks, so the root `prerelease` script (build + test) is NOT executed by any `yarn release*` variant.
- `publish.yml` does not run tests either — it installs, builds, and publishes.

If the release touches any rule the benchmark covers, also run the pre-release checklist in the `bench-xref` skill (including its `--dry-run` review before `--write`).

## 4. Present release contents

```bash
git describe --tags --abbrev=0
git log --oneline <last-tag>..HEAD
```

Show the current version (`lerna.json`). `yarn release` derives the next version from conventional commits automatically, so do **NOT** ask the user to choose a version bump — present the diff only as a "what's going in" check.

## 5. Version bump (user-executed)

Before handing over, remove `vscode/package-lock.json` if it exists. It is a gitignored leftover of an npm-based extension build (`vscode/scripts/install.mjs` deletes it only on success; a manual `vsce package` or an interrupted build leaves it behind). `lerna version` updates every per-package `package-lock.json` it finds and passes it to `git add`, which refuses ignored paths — the run then dies after every manifest and CHANGELOG has been rewritten and staged, one step short of the commit (v5.0.1).

```bash
ls vscode/package-lock.json
```

(No output and a non-zero exit mean there is nothing to remove; that is the normal case.)

If it exists, remove it:

```bash
rm vscode/package-lock.json
```

If the run does fail there anyway, nothing needs recomputing: the staged tree is exactly what Lerna was about to commit, so finish its last two steps by hand and continue with step 6.

```bash
git commit -m "chore(release): publish"   # keep hooks on; lint-staged restores lerna.json's tab indentation
git tag v<VERSION> -m v<VERSION>          # annotated, same as Lerna's gitTag
```

`lerna version` is an interactive command (selection/confirmation prompts) that cannot be driven through the `!` prefix — the prompt renders but accepts no input. Ask the user to:

1. Exit the Claude Code session (`exit`)
2. Confirm they are on `<release-branch>`, then run the release command directly in the terminal and answer the prompts
3. Return to this conversation with `claude --continue`

```
yarn release          # graduate (stable) — run on main
```

For a prerelease, on the dedicated branch:

```
yarn release:rc       # RC prerelease
yarn release:beta     # beta prerelease
yarn release:alpha    # alpha prerelease
```

Notes:

- Graduating from a prerelease: `--conventional-graduate` targets every package carrying a prerelease id, and `semver.inc` returns the same base version for major, minor and patch alike — `5.0.0-rc.4` becomes `5.0.0` even when the range contains a `feat!`.
- All variants use `--no-push`: the version commit and tag stay local until step 6.

## 6. Push the version commit and tag

Verify the tag exists locally, then push:

```bash
git tag --points-at HEAD
git push origin <release-branch> --follow-tags
git ls-remote --tags origin
```

## 7. Merge back

- **Stable**: merge `main` back into `dev` so the version commit is not lost. Then carry `dev` forward into `v6` — the version commit has to reach the next-major line too, and `dev` → `v6` is the only permitted direction.
- **Prerelease**: merge the prerelease branch into the line it was cut from (`dev` or `v6`), then, if it was `dev`, carry `dev` forward into `v6`.

The merge back is pushed directly, not through a PR. `dev` is protected, but the admin bypass lets the push through (the output says "Bypassed rule violations"); opening a PR for it only produces a conflict-prone merge PR. The merge commit itself has to be made with `--no-verify`, because lint-staged's `yarn cli` task always fails on the fixtures that are meant to contain errors (`test/fixture/027.html` and friends) — so run `yarn lint-check`, `yarn build`, and `yarn test` on the merged tree first, then:

```bash
git checkout dev
git merge origin/main --no-edit --no-verify
git log --graph --oneline -3        # the merge commit must have two parents
git push origin dev
```

If the hook has dropped `MERGE_HEAD` and the commit has one parent, rebuild it with `git commit-tree <tree> -p <main> -p <dev>`. If the push is rejected because `dev` moved (Renovate lands often), `git fetch origin dev`, merge it in, and push again.

Do this before step 8 so a failure in verification does not leave the branches diverged.

## 8. Watch the publish workflow

The `v*` tag push fires `publish.yml`:

```bash
gh run watch --exit-status
```

On failure, show the log URL and go to step 10.

## 9. Verify npm state (the actual success gate)

Workflow success only means the publish process exited 0. Verify the registry:

```bash
npm view markuplint version
npm view markuplint dist-tags
npm view @markuplint/rules dist-tags
```

- Version must match step 5; dist-tag must match the release channel (`latest` / `rc` / `beta` / `alpha`).
- Fixed mode can still partially publish. Spot-check core packages; if ANY mismatch is found, enumerate every public package (`npx lerna list --json`) and check each.
- Confirm provenance attestations are present (`npm view markuplint --json` → `dist.attestations`).

**Do not report the release as done before this step passes.**

## 10. Failure handling

- **Workflow failed before anything published**: fix the cause, `gh run rerun`.
- **Partial publish**: published versions are immutable. Ask the user before retrying — options are `gh run rerun` (re-attempts the same tag) or a local `npx lerna publish from-package` (publishes only versions missing from the registry; requires local npm auth, which OIDC does not provide).
- **Wrong version published**: unpublish is generally impossible. Propose `npm deprecate <package>@<version> "<reason>"` plus a corrected follow-up release — only with the user's explicit approval.

## 11. GitHub Release notes

Create a GitHub Release for the tag. All content in **English**.

Write the notes to a file in the scratchpad directory, then pass it with `--notes-file` (inline notes invite escaping bugs):

```bash
gh release create v<VERSION> --title "v<VERSION>" --notes-file "<path>"
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

## 12. X (Twitter) post

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
