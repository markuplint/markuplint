---
description: Create and push a pull request
---

1. Ensure that you are on a topic branch that is not `dev` or `main`.
2. **Pre-flight checks (MANDATORY — do NOT skip):**
   - If `yarn lint-check`, `yarn build`, and `yarn test` have not already been run and passed in this session, run them **now** before proceeding.
   - All three must pass. Fix any failures before continuing.
3. Review the changes on the current topic branch using appropriate `git` commands.
4. Generate and execute a one-liner `gh pr create` command to create a pull request.
