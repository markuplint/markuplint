---
name: auto-impl
metadata:
  internal: true
argument-hint: '[issues or instruction, e.g. "every open issue labelled v5 and Bug"]'
description: >
  Semi-automatic variant of the `impl` skill: writes and subagent-reviews a
  plan file, implements without waiting for approval, opens the PR itself and
  fixes CI until it is green; for an instruction that covers several PRs it
  continues to the next PR (stacking dependent ones as drafts) and decides the
  questions itself, recording each decision. The owner merges. Invoke with
  `/auto-impl`.
disable-model-invocation: true
---

Instruction: $ARGUMENTS

# Rules

These hold for the whole run. The ones that matter most come first: after context compaction only the start of this file is kept.

- **Run `impl` with overrides**: read `.claude/skills/impl/SKILL.md` with the Read tool and follow its Rules and Steps, except where this file overrides them. This file never copies impl's steps; it cites them by number and name (step 12 "Deferred-items audit"), so that a renumbering of impl shows as a mismatch.
- **Re-read**: impl is read, not invoked, so nothing of it survives compaction. Re-read impl's SKILL.md, this file and the plan file at the start of every PR and after every compaction.
- **Resume before planning**: first search for a plan file of an earlier run of the same instruction (`grep -lF "Instruction: <instruction>" ~/.claude/plans/*.md`). When one exists, continue from its progress instead of planning again: the branches and PRs it lists already exist.
- **Claude never merges.** The owner merges and runs `/merged <n>`.
- **Approval**: typing `/auto-impl` is the owner's approval of pushing topic branches, creating PRs and editing their bodies, and, in a multi-PR run, of filing issues. No confirmation is asked for these.
- **Unattended runs** need a permission setting in which the run's `git` (switch, fetch, merge, commit, push), `gh` (pr, issue, run) and `yarn` commands do not stop at a prompt. This skill does not change settings.
- **Memories** about `/impl` (the owner runs `/pr`; a label means one PR's worth of issues) do not apply here. A memory that says to stop and report a CI failure means report it in the response and go on fixing, as the `pr` skill's step 8 does.
- **Multi-PR run** means a run whose instruction covers more than one PR's worth of work: it says all ("すべて", "全部", "every") of a label or query, or lists issue numbers. In a single-PR run every question impl asks is asked as impl asks it (grill-me, scope, spec silent, the `create-issue` draft); the differences from impl are then only the plan file, the plan review, no approval wait, and Claude opening the PR.

# Overrides of `impl`

## Plan file (impl's Plan contract)

- Always written, in plan mode or not. One file per run: in plan mode the file the harness names; otherwise `~/.claude/plans/<worktree directory name>.md`. Its first line is `Instruction: <the instruction as typed>` (the resume search reads it). Its path goes into the final report.
- Embed impl's Steps checklist with these changes, plus references to impl's and this file's SKILL.md:
  - added after 3: `3a. Plan reviewed by a fresh-context subagent (≤2 rounds)`
  - 14 becomes: `14. PR created by Claude (pr skill); CI green or recorded as blocked`
  - 15 becomes: `15. Deferred to the owner's /merged <n> (named in the final report)`
- Outside plan mode, Phase B starts right after the review; no approval is waited for. In plan mode, ExitPlanMode's approval remains, because the harness requires it: it comes once, after the plan (in a multi-PR run, the overall plan) is reviewed, and no later PR waits for approval. The model/effort line of Phase B stays.

## Step 3a: plan review

Launch a fresh-context subagent with the Agent tool, as impl's step 8 "qa-engineer" does.

- The prompt gives: the plan file's path and the section to review, the issue numbers or the instruction in a few lines, the base branch.
- It has the subagent read: impl's and this file's SKILL.md, the Decision criteria in the root `CLAUDE.md`, the `CLAUDE.md` of every package the plan touches, `.claude/rules/`.
- For a plan of one PR (a single-PR run, or one PR's section) it reviews: drift from the instruction and the issues, the spec grounding, the test plan (test-first, rule test IDs), missing `Decisions` (out-of-scope problems and spec-silent choices not yet decided), how concrete the verification is, and the embedded checklist.
- For the overall plan of a multi-PR run it reviews only what that plan holds: every issue of the instruction is in exactly one PR, the grouping, the order, and the dependencies against the definition below.
- It ends with: "report every finding with the place in the plan it concerns; do not edit".
- Two rounds at most — review, fix, review once more — as impl keeps its own validator loop (step 9 "product-manager", the `/code-review` re-run) to one extra round. The second round's findings are fixed too; there is no third. Record findings and what was done with each under a `Plan review` heading of the plan file.
- When: in a single-PR run, after impl's step 3 "Read the governing constraints". In a multi-PR run, after the overall plan is written, after each PR's Phase A, and after the overall plan is changed (one round for the change).

## Steps 14 and 15

- **Step 14**: run the `pr` skill yourself, CI watch and fixes included.
- **CI that does not turn green**: when the same check still fails after three fix attempts, or when the cause lies outside the diff and the evidence shows it (the log, the same failure on `origin/<base>`), write `blocked` and the reason in the plan file (the PR's section in a multi-PR run) and leave the PR open. A cause outside the diff is also a carry-over (scope). A single-PR run reports and stops there; a multi-PR run skips the PRs that depend on it and goes on with the others.
- **Step 15** does not wait for the merge. It runs when the owner runs `/merged <n>`, in whichever session, and stays interactive there, because only the owner decides not to file a leftover.

## Final report

First line: the owner's next task (merge in this order, `/merged <n>` after each, mark a draft ready once `/merged` has brought it up to date). Then the PR list (number, draft or not, depends on, merge order), the `blocked` PRs, how many decisions Claude made and where they are recorded, the overall-plan decisions (grouping, order), the issues filed, and the plan file's path.

# Multi-PR runs

## Plan

- **Which issues**: every issue the instruction names by label or query, or every listed number. When they all fit one PR, there is one PR, but the run keeps the multi-PR rules (Claude decides the questions).
- **Two-tier plan**:
  - The overall plan has only the grouping into PRs, the order, and each PR's dependencies. Investigate only as far as grouping needs (the issue bodies; the files and rules each one touches).
  - Each PR gets its own section, written just before work on it starts: impl's Phase A (investigation, `Decisions`, out-of-scope problems), then step 3a on that section, then implementation. The section also holds the PR's progress: branch, PR number, Findings, Carry-over, `blocked`.
- **Agreement (impl's step 1 "Agreement confirmed")** is the owner's instruction, the issue bodies, and the reviewed PR section. grill-me is not run.

## Dependencies and branches

- **A PR depends on another** when it builds on that PR's change, and also when both touch the same file or the same rule: two branches cut from the base would conflict once one merges, and would take the same next rule test ID.
  - Chains are linear. Every PR that touches a given rule is in the same chain. When a PR would join two chains, the overall plan merges them into one.
  - Within a chain, a PR that changes code many rules share (a utility, `@markuplint/ml-core`) goes first, so that the rules' PRs build on it.
  - Re-check the dependencies in each PR's Phase A, and whenever a scope decision during implementation reaches another PR's files or rules. A new dependency updates the overall plan (and step 3a runs on the change) before the next branch is cut.
- **Branches** are created in the same worktree (allowed: the Branch & Worktree Policy forbids branching only in the main checkout). Every PR, the first included, gets its own branch; the branch the harness made for the worktree is not used for a PR.
  - Name: `issue/<lowest issue number>-<slug>`, as the `issue` skill names them.
  - No dependency: `git fetch origin <base>`, then `git switch -c <branch> --no-track origin/<base>`.
  - With a dependency: `git switch -c <branch> <topic branch it depends on>`.
  - Push with `git push -u origin <branch>`.
  - After switching, redo impl's step 2 "Branch check" setup: `yarn install`, `NX_WORKSPACE_ROOT_PATH=<worktree> yarn build`, and `crates/CLAUDE.md` when the branch has `crates/`.
- **Review base**: `origin/<base>` for a PR without dependency; the topic branch it depends on for a stacked PR. The qa-engineer and product-manager reviews (impl's steps 8 and 9), step 12 (e) (the deferral grep), and the `pr` skill's step 5 (diff review) and PR body use the diff against the review base. `/code-review` and `/security-review` (impl's steps 6 and 7) see the whole branch: their findings on the dependency's lines belong to the dependency — fix them on its branch and merge it up as below. `gh pr create --base` and `yarn test:affected` keep `origin/<base>`.
- **A stacked PR** is created as a draft with base `dev` (or `v6`), never with a topic branch as base: a PR whose base is a topic branch gets no CI run. Its body's first line is `Depends on #N`. A draft does not enter the merge queue, so it cannot be merged before its dependency; the owner marks it ready.
- **After the dependency changes**:
  - It gains commits (a CI fix, a fix from a later review): merge it into every branch stacked on it, push, and watch CI.
  - It is merged: when the owner runs `/merged <n>`, the `merged` skill brings the stacked branch up to date.
  - It is closed without merging: stop that chain and report it.
- **No pause between PRs**: impl's "Multi-PR plans" rule and its "Hand-off before pausing" section are overridden. When a run is interrupted, the next `/auto-impl` with the same instruction resumes from the plan file (Rules, Resume before planning).

## Questions are decided by Claude

By impl's four kinds of question:

- **scope**, **spec silent** and **confirmation**: Claude decides by the Decision criteria (the spec, then accuracy; the more accurate option when unsure). Scope includes a verification that cannot run (impl's step 12 (a)) and the duplicate check of `create-issue`. Confirmation includes the grouping and order of the overall plan and the `create-issue` draft.
- An out-of-scope problem that is another issue of the plan is not fixed here: record it as `claude: planned in PR <k>`.
- **irreversible**: stop and ask. Here that means deleting or overwriting something outside the repository, a `breaking` behavior change on the stable line, and work based on `v4`. The writes listed under Approval are not included.
- **Recording**:
  - The Findings and `Decisions` ledgers gain the states `claude: fix`, `claude: carry over`, `claude: leave as is` and `claude: planned in PR <k>`, each with its reason. impl's step 9 and step 12 (b) are met by `fixed`, `user:` or `claude:`.
  - A `create-issue` decision goes on the Carry-over bullet it files: ` — Filed as #N (claude: new)` or ` — Not filed (claude: duplicate of #M)`.
  - The PR body gets a `## Decided without the owner` section listing this PR's `claude:` decisions with their reasons. The overall plan's decisions go into the final report. A `claude: leave as is` does not go under `## Left as is on purpose`, which holds the owner's reasons.
- Findings still open after the second review round are decided and recorded the same way.
