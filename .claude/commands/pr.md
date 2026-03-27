---
description: Create and push a pull request
---

1. Ensure that you are on a topic branch that is not `dev` or `main`.
2. **Pre-flight checks (MANDATORY — do NOT skip):**
   - If `yarn lint-check`, `yarn build`, and `yarn test` have not already been run and passed in this session, run them **now** before proceeding.
   - All three must pass. Fix any failures before continuing.
3. Review the changes on the current topic branch using appropriate `git` commands.
4. Generate and execute a one-liner `gh pr create` command to create a pull request.
5. **CI watch (MANDATORY after PR creation or additional pushes):**
   - Run `gh pr checks <PR_NUMBER> --watch` to monitor all CI checks.
   - **If any check fails:**
     1. Inspect the failed check logs (`gh run view <RUN_ID> --log-failed`).
     2. Fix the issue in the worktree.
     3. Run the relevant local verification (`yarn lint-check`, `yarn build`, `yarn test`) to confirm the fix.
     4. Commit, push, and run `gh pr checks <PR_NUMBER> --watch` again.
     5. Repeat until all checks pass.
   - **If all checks pass:** Report the result to the user with the PR URL.
