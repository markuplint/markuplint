---
name: merged
metadata:
  internal: true
argument-hint: '[pr-number]'
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/leftovers.mjs *)
description: >
  Post-merge steps for a pull request of this repository: completion comment
  for an external author, report to issue authors other than the owner,
  closing the issues a v6 merge left open, and filing every leftover of the PR
  body's "Not covered here" that has no issue yet. Invoked by the `pr` and
  `pr-review` skills after the user says the PR is merged, or by the user as
  `/merged <n>`.
---

## PR state and unfiled leftovers

!`node ${CLAUDE_SKILL_DIR}/scripts/leftovers.mjs status "$ARGUMENTS"`

# Rules

- **The leftover loop ends only when `leftovers.mjs status` prints `(none)`.** "Some remain" is not an end state of this skill. A bullet leaves the list through `mark`, with `Filed as #N` once its issue exists or with `Not filed: <reason>` when the user decides not to file it. Claude does not decide which (Decision criteria in the root `CLAUDE.md`).
- **Nothing is written to GitHub without showing it.** Each comment, each close, each issue, and each `mark` of the PR body (`Filed as #N` with the issue it approves, `Not filed:` with the user's reason) is shown to the user and done once they agree through `AskUserQuestion` (kind: confirmation) — a question written in the text ends the turn and loses the loop.
- **Bullets an external author wrote** (a contributor's `## Not covered here`) are candidates, not the owner's ledger: each is asked about one by one (kind: scope — file it, or `Not filed:` with the reason).
- **Owner** means the maintainer running this session: get the login once with `gh api user --jq .login` and compare it with `gh pr view <n> --json author --jq .author.login` / `gh issue view <m> --json author --jq .author.login`. That login is whoever the active `gh` token belongs to (`GH_TOKEN`, a bot, another account), so state the resolved login when you show a text to post. Do not use `gh repo view --json owner` — it returns the organization, not a person. A bot author (`--jq .author.is_bot` is `true`, e.g. Renovate) is treated like the owner: nobody is waiting for a comment.

# Steps

1. **Read the block above.** It must say the PR is `MERGED`; otherwise stop and tell the user. When it says `error: no PR number given`, ask the user for the number and run `node ${CLAUDE_SKILL_DIR}/scripts/leftovers.mjs status <n>` yourself. When it reports any other error (`gh` failed, the argument is not a PR number), show that line and stop: a retry with the same input gives the same error. When it ends with a `warning:` line, read the section with `gh pr view <n> --json body` before step 3.
2. **Resolve the owner** as the Rules say, and whether the PR author and each linked issue author (`gh pr view <n> --json closingIssuesReferences`) is the owner.
3. **File the leftovers** while the list above is not `(none)`:
   - When it has two or more items, state once the line the user can run to hand the end condition to a separate evaluator, with `<n>` replaced by the PR number: `/goal node ${CLAUDE_SKILL_DIR}/scripts/leftovers.mjs status <n> prints (none), its output is shown in the response, and every issue number is reported`. The evaluator reads only what is in the conversation, which is why the output has to be shown. Continue without waiting.
   - Propose which items share one root cause (one issue per cause) and confirm the grouping with `AskUserQuestion` (kind: confirmation).
   - For each group, in order: run the `create-issue` skill with the bullet text as the problem. The bullet is the reproduction; investigate only what it lacks, and delegate that to a subagent only for a bullet that gives no reproduction at all. After the issue exists, run `node ${CLAUDE_SKILL_DIR}/scripts/leftovers.mjs mark <n> <index> "Filed as #<issue>"` — `<index>` is the number in the most recent `status` output, and the script prints the remaining list, renumbered. An item the user decides not to file gets `mark <n> <index> "Not filed: <the user's reason>"`.
   - Repeat until the script prints `(none)`, and show that output.
4. **Completion comment on the PR only when someone other than the owner authored it:** what landed, what was deliberately left out, where the result differs from the plan, and the issue numbers from step 3. The PR body is written before review; this comment records what the merged PR actually is. An owner-authored PR gets no comment: the PR body and the conversation already carry that record.
5. **Report comment on a linked issue only when someone other than the owner filed it.** The comment says what was done and which PR did it. An issue the owner filed gets no report: the PR already says it, and the owner is not waiting to hear back.
   - When the PR merged into a branch other than the default branch (a `v6` PR), `Fixes #N` did not close the issue; check `gh issue view <m> --json state` and close the open ones with `gh issue close <m> --reason completed`. For an issue that gets a report, fold it into the close: `--comment "Fixed by #<n> (merged into <base>)."`.
6. **Report** the issue numbers from step 3 and the comments posted. When step 4 was skipped, the numbers reach the user here.
