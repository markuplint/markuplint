---
name: pr
metadata:
  internal: true
description: >
  Create and push a pull request — pre-flight checks, base tracking, PR body
  drafting, conflict detection, and CI watch loop. Use when asked to open,
  create, or push a PR. Trigger keywords: pull request, PR, open a PR, push
  branch, gh pr create.
---

1. Ensure that you are on a topic branch that is not `dev`, `v6`, or `main`.
2. **Determine the base branch — never assume `dev`.** Two major lines are developed in parallel (see Branch Topology in the root `CLAUDE.md`), and a v6 topic branch opened against `dev` produces a nonsense diff and a merge in the forbidden direction. Take the base from the branch's own upstream:

   ```bash
   git rev-parse --abbrev-ref '@{upstream}'   # e.g. origin/v6
   ```

   If the branch has no upstream yet, a `crates/` directory in the working tree means the base is `v6`; otherwise `dev`. Write `<base>` for the result below, and always pass it explicitly: `gh pr create --base <base>`.
3. **Base tracking (conflict prevention)**: run `git fetch origin <base>`, then `git log HEAD..origin/<base> --oneline`. If the base has advanced, sync before pushing (prefer merge over rebase unless asked otherwise).
4. **Pre-flight checks (MANDATORY — do NOT skip):**
   - If `yarn lint-check`, `yarn build`, and `yarn test` have not already been run and passed in this session, run them **now** before proceeding. Re-run after any base sync.
   - All three must pass. Fix any failures before continuing.
   - If the branch touches `website/`, also run `yarn site:build`.
   - If the branch touches `crates/`, also run `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked`. `yarn test` does not cover the Rust workspace, so without these `.github/workflows/rust.yml` is the first thing that sees the breakage.
5. Review the full diff against the base (`git diff origin/<base>...HEAD`) and re-apply the pre-commit content check from the `git` skill (secrets, sample-value conventions) across the whole PR.
6. **Write the PR body to a temp file** in the scratchpad directory and create the PR with `gh pr create --body-file "<path>"` — embedding the body inline invites escaping bugs (backticks, quotes, newlines). The PR body summarizes the **diff**, not the conversation.
7. **Mergeability check (CI watch cannot catch this):** after creation, run `gh pr view <PR_NUMBER> --json baseRefName,mergeable,mergeStateStatus`. Confirm `baseRefName` is `<base>`. If `CONFLICTING` / `DIRTY`, go back to step 3, resolve, and push again — do not wait for CI first.
8. **CI watch (MANDATORY after PR creation or additional pushes):**
   - Run `gh pr checks <PR_NUMBER> --watch` in the background to monitor all CI checks (foreground runs lose output to turn timeouts).
   - **If any check fails:**
     1. Inspect the failed check logs (`gh run view <RUN_ID> --log-failed`).
     2. Fix the issue in the worktree. Treat every failure as caused by this PR until proven otherwise — there is no such thing as an "unrelated" test failure.
     3. Run the relevant local verification (`yarn lint-check`, `yarn build`, `yarn test`; plus the `cargo` checks from step 4 for `crates/` failures) to confirm the fix.
     4. Commit, push, and run `gh pr checks <PR_NUMBER> --watch` again.
     5. Repeat until all checks pass.
   - **If all checks pass:** re-run `gh pr view <PR_NUMBER> --json mergeable,mergeStateStatus` — the base may have advanced during the CI run and introduced a new conflict. If `CONFLICTING` / `DIRTY`, return to step 7's resolution path. Otherwise open the PR in the browser with `gh pr view <PR_NUMBER> --web` and report to the user that it is ready to merge.
