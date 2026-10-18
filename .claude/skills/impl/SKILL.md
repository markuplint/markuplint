---
name: impl
metadata:
  internal: true
description: >
  Implementation orchestrator — takes an agreed plan through implementation,
  carry-over approval, code review, security review, QA, docs consistency,
  lint/test, carry-over filing, commit, and PR creation. Invoke with `/impl`
  once a plan has been agreed (e.g. via grill-me or the issue skill).
disable-model-invocation: true
---

# Rules

These hold for the whole run, not just the step where they first apply. The ones that matter most come first: after context compaction only the start of this file is kept.

- **Carry through**: keep working until every item of the Steps checklist is done, and only stop to ask when you cannot go on without the user or before a risky step. Ending a turn on a promise ("I'll …") is not finishing a step.
- **Decision criteria**: the Decision criteria in the root `CLAUDE.md` (Pull Requests & Issues) decide what is done, what is asked, and what Claude may not decide on its own. Implementation cost is not a criterion. "Carry over", "leave as is" and "not in this PR" exist only as the user's answers to a question.
- **Questions**: every `AskUserQuestion` names its kind — **scope** (fix an out-of-scope problem in this PR or carry it over; a verification that cannot run is the same kind), **spec silent** (a behavior the criteria do not decide), **irreversible** (a write outside the repository, a destructive action), or **confirmation** (a draft, a grouping or a text a skill shows before it posts) — puts the recommended option first, and says in one or two sentences how the recommendation fares on the criteria. "Either is fine" and "it would cost more" are not reasons to ask. A question the criteria already answer is not asked: the work is done.
- **Strict scope**: never expand beyond the agreed scope on your own.
- **Out-of-scope findings**: a bug or problem outside the agreed scope may be asked about the moment it is noticed (scope question: fix in this PR / carry over), and is guaranteed to be asked at step 5 and again at step 12. "Fix" joins the scope (update the plan). "Carry over" goes into the `Carry-over` ledger of the plan file (step 5 gives the format) and becomes an issue at step 12, before anything is committed. Nothing is deferred by Claude's own decision.
- **Fix-all scope**: code-level fixes, added tests, and documentation fixes from any review step are applied on the spot. A finding that implies a spec change or a scope expansion is a question to the user, not a decision by Claude.
- **Findings ledger**: every finding from steps 6–9 goes into a table under the `Findings` heading of the plan file (number, source, `file:line`, summary, state) — the plan file, not the response, so that step 12 can read it after compaction. The only states are `fixed (<the tool result that proves it: a test run or the diff hunk>)`, `user: fix`, `user: carry over`, and `user: leave as is`. There is no "false positive", "minor", "pre-existing", or "out of scope" state: a finding Claude takes for one of those is put to the user with the evidence, and the answer becomes the state. A finding outside the PR's own lines is a scope question; "carry over" sends it to the `Carry-over` ledger.
- **Loop back**: if any step causes a major change of direction or a large code change, restart from step 5.
- **No skipping steps**: skip a step only when the user explicitly says to.
- **Review results in the user's language**: `/code-review` and `/security-review` report in English. Translate their findings into the user's language when reporting them, then fix.
- **Plan contract**: the run has two phases, and the plan file is the hand-off between them — the user may switch the model and the permission mode after approval, and the conversation may be compacted or cleared in between.
  - Phase A, planning (plan mode): steps 1–3, plus every decision that can be made before code is written: list the out-of-scope problems already visible in the code the plan touches and ask about each one (scope question); ask the spec-silent choices the plan contains; write every answer under a `Decisions` heading in the plan file (fix / carry over / leave as is, with the reason). Embed the full Steps checklist, a reference to these Rules and to the Decision criteria, and empty `Carry-over` and `Findings` headings.
  - Phase B, execution (after approval): first run `echo "$CLAUDE_EFFORT"` and write one line, in the user's language, that names the model your system prompt names and the effort the command printed, so that the user sees which model and effort the run starts on (there is no `$CLAUDE_MODEL`; the model comes from your own system prompt). No level is required: the line is there to be noticed, not to stop. Then re-read the plan file and run steps 4–14. Apply the `Decisions` as they stand and ask only for a decision the plan does not have. Re-read the plan file again at step 12.
  - For a multi-PR plan, state that every PR repeats the checklist and that the run pauses after each PR (next rule).
- **Multi-PR plans**: when the plan spans more than one PR, finishing the `pr` skill for one PR (including the `merged` skill after the merge) does **not** start the next PR. Do the hand-off below, report, and wait for the user to say resume. The user clears or compacts context between PRs (`/exit`, `/clear`, `/compact`), so nothing may depend on this conversation surviving.

## Hand-off before pausing (multi-PR plans only)

1. Rewrite the remaining plan as a resume file at `~/.claude/plans/<topic-branch>-resume.md` (not the scratchpad — it is session-scoped). Contents: overall goal; PRs done (number, what landed); PRs remaining (scope, approach, trade-offs); the `Decisions` and the `Carry-over` ledger with its issue numbers; base branch; the full Steps checklist to run next.
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
- [ ] 5. Carry-overs approved — every out-of-scope finding so far asked one by one; Carry-over ledger written
- [ ] 6. /code-review medium — findings in the ledger, translated and fixed
- [ ] 7. /security-review — findings in the ledger, translated and fixed
- [ ] 8. qa-engineer (fresh-context subagent) — findings in the ledger and fixed
- [ ] 9. product-manager (fresh-context subagent) — findings in the ledger and fixed; /code-review re-run once
- [ ] 10. yarn lint clean
- [ ] 11. yarn test green (+ cargo checks if crates/ touched)
- [ ] 12. Deferred-items audit — nothing postponed is still open; every Carry-over bullet filed as an issue
- [ ] 13. Committed (git skill)
- [ ] 14. PR created (pr skill)
```

1. Confirm that implementation scope, approach, and trade-offs are agreed in the conversation. A plan approved through the `issue` skill counts as agreed. If agreement is missing, run the `grill-me` skill and reach it before continuing. If a plan document is being written, apply the Plan contract rule (Phase A).
2. **Branch check**: ensure you are in a Claude Code–managed worktree on a topic branch, cut from the line the work belongs to (Branch Topology and Branch & Worktree Policy in the root `CLAUDE.md`). Fresh worktree setup: `yarn install`, then `NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build`. On a branch that has a `crates/` directory, that is not the whole setup — follow `crates/CLAUDE.md` as well (submodules, native addon) before building.
3. **Read the governing constraints** before writing code: the package-level `CLAUDE.md` of every package you will touch, plus any matching `.claude/rules/*.md`.
4. Implement exactly what was agreed, test-first: add failing spec tests that define the expected behavior (never throwaway reproduction scripts), then make them pass. In Phase B this step starts with the model/effort line and the re-read of the plan file that the Plan contract rule describes.
5. **Carry-overs approved**: list every problem noticed since step 4 began that lies outside the agreed scope — a bug in neighbouring code, a case the spec requires that another path misses, a test that should exist for code this PR does not change. When the list is empty, write "none" and go on. For each item, apply the plan's `Decisions` entry when it has one; otherwise ask (scope question: fix in this PR / carry over). "Fix" joins the scope: go back to step 4. "Carry over" is appended under the `Carry-over` heading of the plan file as one bullet — `- <the minimal input, the observed output, the suspected cause and its file, in one to three self-contained sentences>` — written now, while the reproduction is in context, so that step 12 can file it without investigating again. The ledger lives in the plan file, not in the response: it has to survive compaction and `/clear`.
6. **`/code-review medium`**: invoke it through the Skill tool (`code-review` with argument `medium`). It runs as a forked subagent; wait for its result. Put every finding in the `Findings` ledger, translate, and fix all of them.
7. **`/security-review`**: invoke it through the Skill tool (`security-review`). Wait for its result, put every finding in the ledger, translate, and fix all of them.
8. **`qa-engineer` in a fresh context**: the model that wrote the code must not grade it. Launch a subagent with the Agent tool and have it read `.claude/skills/qa-engineer/SKILL.md`, then review `git diff origin/<base>...HEAD`. The prompt states the base branch, the agreed scope in a few lines, and "report every finding with `file:line`, the minor ones included; do not edit". Put every finding it returns in the ledger and fix it.
9. **`product-manager` in a fresh context**: same method as step 8 with `.claude/skills/product-manager/SKILL.md` (documentation consistency — JSDoc placement, comment policy). Steps 8 and 9 are independent; launch both subagents in the same message. When every finding of steps 6–9 is in a `fixed` or `user:` state, run `/code-review medium` once more — the validator → fix → repeat loop, kept to one round: its new findings are fixed and added to the ledger, and the loop does not run a third time.
10. Run `yarn lint`; fix all errors. Which linters this runs differs between branches — `package.json` is the source of truth, never another branch's set.
11. Run `yarn test`; fix all failures. If the change touches `crates/`, also run `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked`: `yarn test` does not reach the Rust workspace and neither does lint-staged.
12. **Deferred-items audit**: re-read the plan file. List in your response everything this run postponed, skipped, or noted "for later", and close each item against a tool result from this session — an item with no result to point at stays open. Go through, in order: (a) every verification step the plan or the conversation named beyond lint and test (a reproduction, a manual check, a dry run) — the ones not yet executed get executed now, with their output shown; when one cannot be executed (no real input exists for it), say so and ask the user to waive it or to keep the PR open, and record a waiver where the next session will find it; (b) every finding in the `Findings` ledger is in a `fixed` or `user:` state; (c) every out-of-scope finding from steps 6–9 that is not yet in the `Carry-over` ledger is asked about as step 5 does; then **every bullet of the `Carry-over` ledger is filed as its own issue with the `create-issue` skill** — the bullet is the reproduction, and `create-issue` confirms each draft with `AskUserQuestion` — and the bullet gets ` — Filed as #N` appended in the plan file; while any bullet has no `Filed as #N`, step 13 does not start; (d) every assumption made without checking (a command's output format, a tool's availability, a field name) — check it now; (e) the one trace a deferral leaves in the diff: run `git diff origin/<base> | grep -nE '^\+.*(TODO|FIXME|XXX|\.skip\(|\.todo\(|skipIf\()'` and show the output, which must be empty. An empty list is reported as such, naming what was checked. If closing an item changes code, steps 10–11 run again. Nothing is committed with an open item.
13. Commit following the `git` skill.
14. Create the PR following the `pr` skill. Its `## Not covered here` is the `Carry-over` ledger copied as is, markers included, and its `## Left as is on purpose` is the `leave as is` entries of `Decisions`.
