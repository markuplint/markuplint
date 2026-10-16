---
name: impl
metadata:
  internal: true
description: >
  Implementation orchestrator — takes an agreed plan through implementation,
  code review, security review, QA, docs consistency, lint/test, commit, and
  PR creation. Use when the user says "implement it", "go ahead", or "/impl"
  after a plan has been agreed (e.g. via grill-me or the issue skill).
disable-model-invocation: true
---

# Rules

These hold for the whole run, not just the step where they first apply.

- **Strict scope**: never expand beyond the agreed scope on your own.
- **Out-of-scope findings**: the moment you notice a bug or problem outside the agreed scope, stop and ask the user with `AskUserQuestion` — one finding per question — whether to fix it in this PR or leave it. Do not batch findings for later. "Fix it" → it joins the scope (update the plan). "Leave it" → add it to the carry-over list; it goes into the PR body's "Not covered here" and, after merge, into the `pr` skill's leftover handling (`create-issue`).
- **Fix-all scope**: code-level fixes, added tests, and documentation fixes from any review step are applied on the spot. Findings that imply a spec change or scope expansion require the user's approval first.
- **Loop back**: if any step causes a major change of direction or a large code change, restart from step 5.
- **No skipping steps**: skip a step only when the user explicitly says to.
- **Review results in the user's language**: `/code-review` and `/security-review` report in English. Translate their findings into the user's language when reporting them, then fix.
- **Plan contract**: when the plan is written down (a plan-mode plan file, a spec, an issue comment), embed the full Steps checklist and these Rules in it. Once the plan is approved, follow that checklist as written. For a multi-PR plan, state that every PR repeats the checklist and that the run pauses after each PR (next rule).
- **Multi-PR plans**: when the plan spans more than one PR, finishing the `pr` skill for one PR (including its post-merge steps) does **not** start the next PR. Do the hand-off below, report, and wait for the user to say resume. The user clears or compacts context between PRs (`/exit`, `/clear`, `/compact`), so nothing may depend on this conversation surviving.

## Hand-off before pausing (multi-PR plans only)

1. Rewrite the remaining plan as a resume file at `~/.claude/plans/<topic-branch>-resume.md` (not the scratchpad — it is session-scoped). Contents: overall goal; PRs done (number, what landed); PRs remaining (scope, approach, trade-offs); carry-over issue numbers; base branch; the full Steps checklist to run next.
2. If a cross-session memory is available, record "multi-PR plan in progress" with the resume file's path and a one-line summary of what remains.
3. Report the resume file's absolute path and the remaining PRs to the user, then stop.
4. After the last PR merges, delete the resume file and the memory entry, or mark them complete.

# Steps

Copy this checklist into your response and check items off as you go.

```
- [ ] 1. Agreement confirmed (grill-me / issue plan); plan contract applied
- [ ] 2. Branch check (worktree, topic branch, right line, built)
- [ ] 3. Governing constraints read (package CLAUDE.md, .claude/rules)
- [ ] 4. Implemented test-first
- [ ] 5. /code-review medium — findings translated and fixed
- [ ] 6. /security-review — findings translated and fixed
- [ ] 7. qa-engineer (fresh-context subagent) — findings fixed
- [ ] 8. product-manager (fresh-context subagent) — findings fixed
- [ ] 9. yarn lint clean
- [ ] 10. yarn test green (+ cargo checks if crates/ touched)
- [ ] 11. Committed (git skill)
- [ ] 12. PR created (pr skill)
```

1. Confirm that implementation scope, approach, and trade-offs are agreed in the conversation. A plan approved through the `issue` skill counts as agreed. If agreement is missing, run the `grill-me` skill and reach it before continuing. If a plan document is being written, apply the Plan contract rule.
2. **Branch check**: ensure you are in a Claude Code–managed worktree on a topic branch, cut from the line the work belongs to (Branch Topology and Branch & Worktree Policy in the root `CLAUDE.md`). Fresh worktree setup: `yarn install`, then `NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build`. On a branch that has a `crates/` directory, that is not the whole setup — follow `crates/CLAUDE.md` as well (submodules, native addon) before building.
3. **Read the governing constraints** before writing code: the package-level `CLAUDE.md` of every package you will touch, plus any matching `.claude/rules/*.md`.
4. Implement exactly what was agreed, test-first: add failing spec tests that define the expected behavior (never throwaway reproduction scripts), then make them pass.
5. **`/code-review medium`**: invoke it through the Skill tool (`code-review` with argument `medium`). It runs as a forked subagent; wait for its result. Translate the findings and fix all of them.
6. **`/security-review`**: invoke it through the Skill tool (`security-review`). Wait for its result, translate the findings, and fix all of them.
7. **`qa-engineer` in a fresh context**: the model that wrote the code must not grade it. Launch a subagent with the Agent tool and have it read `.claude/skills/qa-engineer/SKILL.md`, then review `git diff origin/<base>...HEAD`. The prompt states the base branch, the agreed scope in a few lines, and "report findings with `file:line`; do not edit". Fix every finding it returns.
8. **`product-manager` in a fresh context**: same method as step 7 with `.claude/skills/product-manager/SKILL.md` (documentation consistency — JSDoc placement, comment policy). Steps 7 and 8 are independent; launch both subagents in the same message.
9. Run `yarn lint`; fix all errors. Which linters this runs differs between branches — `package.json` is the source of truth, never another branch's set.
10. Run `yarn test`; fix all failures. If the change touches `crates/`, also run `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked`: `yarn test` does not reach the Rust workspace and neither does lint-staged.
11. Commit following the `git` skill.
12. Create the PR following the `pr` skill.
