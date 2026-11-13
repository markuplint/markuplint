---
name: major-rotation
metadata:
  internal: true
description: >
  Rotate the release lines when a new major is released as stable: the lts
  line ends, stable becomes lts, experimental becomes stable. Switches
  Renovate, workflow triggers, the commit guard, labels, commitlint, the
  support policy, docs and the repository settings together. Run from the
  release skill as part of the stable release of a new major.
disable-model-invocation: true
---

The lines and their roles are defined once in `scripts/release-lines/lines.ts`; its module JSDoc says what each role receives and how they rotate. Below, `N` is the major being released as stable (today's `experimental` line), so before the rotation `N-2` is `lts`, `N-1` is `stable` on `dev`, and `N` is `experimental` on `vN`.

Every write outside the repository (branch creation, settings, rulesets, dist-tags, labels, closing Issues) is shown to the user and done only once they agree.

# 1. Decide before touching anything

Ask the user, one question at a time:

- The release itself is ready: the open decisions in the release skill's "Releasing while two lines are live" are all settled.
- `N-2` ends with this release (the support policy promises the newest stable and the one before it). Confirm whether one last `N-2` release is needed first: the release reminder Issue for `vN-2`, if open, lists what is unreleased.
- Whether a `vN+1` experimental line starts now or later. Until it starts, the list has no `experimental` line.

# 2. Cut the new lts branch

Before `vN` reaches `main`, cut `vN-1` from the last `N-1` release: `git fetch origin --tags`, then `git push origin v<N-1-latest-tag>^{commit}:refs/heads/vN-1` (the newest `vN-1.*` tag, `git tag -l 'vN-1.*' --sort=-v:refname`). Commits that are on `dev` but unreleased stay on `dev` and become part of `N`; if one is a fix `N-1` users need, cherry-pick it to `vN-1` and release it there.

# 3. Edit the line definition, then let the spec name the rest

On a topic branch from the tree that becomes the new `dev` (the `vN` line after it is merged), change `RELEASE_LINES` in `scripts/release-lines/lines.ts`: drop `N-2`, set `N-1` to `lts` on `vN-1`, set `N` to `stable` on `dev`, and add `N+1` as `experimental` on `vN+1` if it starts now. Then run `npx vitest run scripts/release-lines` and fix every failure. It covers:

- `.github/renovate.json`: `baseBranchPatterns`, and the `enabled: false` rule of the lts line (`matchBaseBranches`; its `description` names the line and its Node.js floor — rewrite it for `N-1`)
- `.github/labeler.yml`: the `v<major>` label of each base branch
- `.husky/pre-commit`: the guarded branches (`stable` and `experimental`; not `lts`, where `lerna version` commits)
- `branches:` of every workflow in `.github/workflows/`
- the Branch Topology table of the root `CLAUDE.md`
- the version tables of the support policy page, en and ja (`website/community/support-policy.mdx` and its `website/i18n/ja/...` copy), and of `SECURITY.md`. The spec checks the status column only: rewrite the other columns (dist-tag, Node.js), the sentence that names which version ends next, and the end-of-life row of `SECURITY.md`

# 4. What the spec cannot see

Work through each item; search for the old branch names (`v<N-2>`, `vN` where it meant experimental) and the old majors to catch what is new since this list was written.

Workflows and scripts:

- `test.yml`: the `vN` line's own copy has `base_ref == 'vN'` conditions (full shards, Rust jobs). Now that the line is on `dev`, turn them into the default path; keep the merge queue gate (`merge_group`, `ci-ok`) on `dev`.
- `rust.yml`, `cargo-deny.yml`, `lint.yml` and other workflows that only the `vN` line has: retarget their `branches:` to `dev` (and `vN+1`).
- `nightly.yml`, `spec-citation-watch.yml`, `update-html-spec.yml`, `website.yml`, `website-vrt.yml`, `test-vscode.yml`: hardcode `dev` as the stable line. They stay correct as long as `dev` is the stable line; check the Node.js / runtime matrices against the new stable's `engines`.
- `scripts/affected-tests/`: the default `--base` and the `crates/` test for the next-major line (`classify.ts`).
- `.commitlintrc.js`: `no-breaking-change-on-stable-line` tells the lines apart by `crates/Cargo.toml`; re-key it to what marks the `N+1` line before the first commit on the new `dev`.
- `.github/renovate.json`: rules that mention only one line (the Cargo rule names "v6"), and the lts rule's Node.js reason. The old lts branch keeps its own `renovate.json`; Renovate reads `dev`'s only.
- The release reminder (`scripts/release-reminder/`) follows `lines.ts`; close the open `vN-2` reminder Issue with a comment that the line has ended.

Packages:

- Optional peers `^N-1.x` of `@markuplint/*` (`packages/markuplint`, `file-resolver`, `pretenders`): `lerna version` does not rewrite them; raise them to `^N.0.0` (`peer-dependencies.spec.ts`).
- `language-server` dispatches on the loaded `markuplint` version (`document-events.ts`); add a branch if `N` changed the API it calls.

Documentation and skills:

- Migration guide `website/docs/migration/v<N-1>-to-vN/` (en and ja) and `website/sidebars.ts`.
- `website/config.js` and the `NEXT_VERSION` preview, `website/docs/guides/ai.md` (`tree/dev/skills` link), `CONTRIBUTING.md` (base branches, nightly), `.github/ISSUE_TEMPLATE/*`.
- `tests/external/bench/xref-issue.ts` links to `blob/dev/...`.
- Skills and `CLAUDE.md` files that name a line: `release`, `git`, `pr`, `merged`, `issue`, `create-issue`, `product-manager`, `bench-*`, `.claude/rules/spec-files.md`, `packages/@markuplint/html-spec/CLAUDE.md`, and the line-only `crates/CLAUDE.md`, which now applies to `dev`. Also `CLAUDE.local.md` and the memory files outside the repository, if any name a line.

# 5. Outside the repository

Confirm each with the user before doing it:

- GitHub rulesets and branch protection: the merge queue and required checks stay on `dev`; `vN-1` gets the protection the old lts branch had; the old lts branch loses its required checks or is archived (renamed or locked; it is not deleted, tags point into it).
- npm dist-tags: `publish.yml` gives a stable release of a major below `latest` the `v<major>` tag. After `N` is on `latest`, confirm `npm dist-tag ls markuplint` shows `vN-1` once `N-1` releases again, and decide what `next` / `canary` / `rc` should point at.
- Labels: the descriptions of `v<N-2>` (ended), `vN-1` (lts), `vN` (stable), and a `vN+1` label when that line starts.
- The website deploy (`NEXT_VERSION`), the Renovate Dependency Dashboard (tick a box on it so Renovate re-runs with the new `baseBranchPatterns`).

# 6. Verify

- `yarn lint-check`, `yarn build`, `yarn test` on the new `dev`; the line-only gates of the old `vN` line (`crates/CLAUDE.md`) now run on `dev`.
- After the merge: a PR into each line gets its label and the right workflows; Renovate's next run lists the three new base branches on the Dependency Dashboard and nothing for the ended line; the release reminder's dry run (`workflow_dispatch` with `dry-run`) covers the new `lts` and `stable` lines.
