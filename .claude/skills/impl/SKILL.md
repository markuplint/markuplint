---
name: impl
metadata:
  internal: true
description: >
  Implementation orchestrator — takes an agreed plan through implementation,
  code review, QA, docs consistency, lint/test, commit, and PR creation. Use
  when the user says "implement it", "go ahead", or "/impl" after a plan has
  been agreed (e.g. via grill-me or the issue skill).
disable-model-invocation: true
---

# Steps

1. Confirm that implementation scope, approach, and trade-offs are agreed in the conversation. A plan approved through the `issue` skill counts as agreed. If agreement is missing, run the `grill-me` skill and reach it before continuing.
2. **Branch check**: ensure you are in a Claude Code–managed worktree on a topic branch (Branch & Worktree Policy in the root `CLAUDE.md`). Fresh worktree setup: `yarn install`, then `NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build`.
3. **Read the governing constraints** before writing code: the package-level `CLAUDE.md` of every package you will touch, plus any matching `.claude/rules/*.md`.
4. Implement exactly what was agreed, test-first: add failing spec tests that define the expected behavior (never throwaway reproduction scripts), then make them pass.
5. **`/code-review medium` (user-executed):** `/code-review` cannot be invoked by Claude. Present the following to the user, ask them to run it, and **wait here for the results**. Then fix all findings.

   ```
   /code-review medium
   ```

   Writing a substitute review yourself, or skipping this step because you cannot invoke it, is **forbidden**.
6. Run the `qa-engineer` skill; fix all findings.
7. Run the `product-manager` skill; fix all findings (includes documentation consistency — JSDoc placement, comment policy).
8. Run `yarn lint`; fix all errors.
9. Run `yarn test`; fix all failures.
10. Commit following the `git` skill.
11. Create the PR following the `pr` skill.

# Rules

- **Fix-all scope**: code-level fixes, added tests, and documentation fixes are applied on the spot. Findings that imply a spec change or scope expansion require the user's approval first.
- **Loop back**: if any step causes a major change of direction or a large code change, restart from step 5.
- **No skipping steps**: step 5 in particular — being un-invocable by Claude is not a reason to skip it; asking the user and waiting is the correct path. Skip a step only when the user explicitly says to.
- **Strict scope**: never expand beyond the agreed scope on your own.
