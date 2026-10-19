---
name: merged
metadata:
  internal: true
argument-hint: '[pr-number]'
description: >
  Post-merge steps for a pull request of this repository: completion comment
  for an external author, report to issue authors other than the owner, and
  closing the issues a v6 merge left open. Invoked by the `pr` and
  `pr-review` skills after the user says the PR is merged, or by the user as
  `/merged <n>`.
---

PR: $ARGUMENTS

# Rules

- **Nothing is written to GitHub without showing it.** Each comment and each close is shown to the user and done once they agree through `AskUserQuestion` (kind: confirmation) — a question written in the text ends the turn and loses the remaining steps.
- **Owner** means the maintainer running this session: get the login once with `gh api user --jq .login` and compare it with `gh pr view <n> --json author --jq .author.login` / `gh issue view <m> --json author --jq .author.login`. That login is whoever the active `gh` token belongs to (`GH_TOKEN`, a bot, another account), so state the resolved login when you show a text to post. Do not use `gh repo view --json owner` — it returns the organization, not a person. A bot author (`--jq .author.is_bot` is `true`, e.g. Renovate) is treated like the owner: nobody is waiting for a comment.

# Steps

1. **Confirm the merge.** When no PR number is given above, ask the user for it. Run `gh pr view <n> --json state,mergedAt,baseRefName,author,closingIssuesReferences`. The state must be `MERGED`; otherwise stop and tell the user.
2. **Resolve the owner** as the Rules say, and whether the PR author and each linked issue author is the owner.
3. **Completion comment on the PR only when someone other than the owner authored it:** what landed, what was deliberately left out, and where the result differs from the plan. The PR body is written before review; this comment records what the merged PR actually is. An owner-authored PR gets no comment: the PR body and the conversation already carry that record.
4. **Report comment on a linked issue only when someone other than the owner filed it.** The comment says what was done and which PR did it. An issue the owner filed gets no report: the PR already says it, and the owner is not waiting to hear back.
   - When the PR merged into a branch other than the default branch (a `v6` PR), `Fixes #N` did not close the issue; check `gh issue view <m> --json state` and close the open ones with `gh issue close <m> --reason completed`. For an issue that gets a report, fold it into the close: `--comment "Fixed by #<n> (merged into <base>)."`.
5. **Report** the comments posted and the issues closed.
