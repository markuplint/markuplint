---
name: worktree
description: >
  Create, use, and clean up a git worktree for branch work in this repo, and the
  one-time git-wt / gh setup. Use when starting any feature branch, running
  `git wt`, setting up a worktree, or when `git wt` is not installed. The repo
  forbids branch work in the main working directory; all branches live under
  `.worktree/<branch-name>`. Trigger keywords: worktree, git wt, git-wt, new
  branch, feature branch, create branch, worktree setup, install git-wt.
---

# Worktree procedure

The behavioral constraints (never commit to `dev`, `cd` standalone, no `&&`, no
`git -C`, husky does not run so lint manually) are in the root `CLAUDE.md` and
always apply. This skill is the how-to.

## One-time setup

`gh` (GitHub CLI) is required by `/pr`, `/release`, `/issue`, `/sponsors`.
Install per <https://github.com/cli/cli#installation> and `gh auth login`.

If `git wt` ([git-wt](https://github.com/k1LoW/git-wt)) is not installed:

```bash
brew install k1LoW/tap/git-wt
git config wt.basedir ".worktree"
git config --add wt.hook "yarn install"
git config --add wt.hook "yarn build"
```

## Procedure

1. **Check for existing worktrees first**: `git wt`
   - If the target branch already has a worktree, work there.
2. **Create a new worktree** for a new branch:
   ```bash
   git wt <branch-name> dev
   ```
   The `wt.hook` runs `yarn install` → `yarn build` automatically.
3. **Move into it**: `cd .worktree/<branch-name>`
4. **Do all edits, commits, and pushes** from within the worktree.
5. **Clean up** when done: `git wt -d <branch-name>` (removes worktree + deletes branch).

If `yarn build` reports success but `packages/*/lib/` is empty, or tests fail to
resolve `@markuplint/*`, delete the **main** repository's `node_modules/` and
re-run `yarn build` from the worktree (Nx resolves the main repo's modules first
because the worktree is nested inside it).
