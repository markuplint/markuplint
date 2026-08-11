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

1. Ensure that you are on a topic branch that is not `dev` or `main`.
2. **Base tracking (conflict prevention)**: run `git fetch origin dev`, then `git log HEAD..origin/dev --oneline`. If the base has advanced, sync before pushing (prefer merge over rebase unless asked otherwise).
3. **Pre-flight checks (MANDATORY — do NOT skip):**
   - If `yarn lint-check`, `yarn build`, and `yarn test` have not already been run and passed in this session, run them **now** before proceeding. Re-run after any base sync.
   - All three must pass. Fix any failures before continuing.
   - If the branch touches `website/`, also run `yarn site:build`.
4. Review the full diff against the base (`git diff origin/dev...HEAD`) and re-apply the pre-commit content check from the `git` skill (secrets, sample-value conventions) across the whole PR.
5. **Write the PR body to a temp file** in the scratchpad directory and create the PR with `gh pr create --body-file "<path>"` — embedding the body inline invites escaping bugs (backticks, quotes, newlines). The PR body summarizes the **diff**, not the conversation.
6. **Mergeability check (CI watch cannot catch this):** after creation, run `gh pr view <PR_NUMBER> --json mergeable,mergeStateStatus`. If `CONFLICTING` / `DIRTY`, go back to step 2, resolve, and push again — do not wait for CI first.
7. **CI watch (MANDATORY after PR creation or additional pushes):**
   - Run `gh pr checks <PR_NUMBER> --watch` in the background to monitor all CI checks (foreground runs lose output to turn timeouts).
   - **If any check fails:**
     1. Inspect the failed check logs (`gh run view <RUN_ID> --log-failed`).
     2. Fix the issue in the worktree. Treat every failure as caused by this PR until proven otherwise — there is no such thing as an "unrelated" test failure.
     3. Run the relevant local verification (`yarn lint-check`, `yarn build`, `yarn test`) to confirm the fix.
     4. Commit, push, and run `gh pr checks <PR_NUMBER> --watch` again.
     5. Repeat until all checks pass.
   - **If all checks pass:** re-run `gh pr view <PR_NUMBER> --json mergeable,mergeStateStatus` — the base may have advanced during the CI run and introduced a new conflict. If `CONFLICTING` / `DIRTY`, return to step 6's resolution path. Otherwise open the PR in the browser with `gh pr view <PR_NUMBER> --web` and report to the user that it is ready to merge.
