---
name: merged
metadata:
  internal: true
argument-hint: '[pr-number]'
description: >
  Post-merge steps for a pull request of this repository: completion comment
  for an external author, report to issue authors other than the owner, and
  closing the issues a v6 merge left open. Invoked by the `pr` and
  `pr-review` skills after the user says the PR is merged or queued (it waits
  for a queued PR to be merged), or by the user as `/merged <n>`.
allowed-tools: Bash(node .claude/skills/impl/scripts/leftovers.mjs *)
---

PR: $ARGUMENTS

# Rules

- **Nothing is written to GitHub without showing it.** Each comment and each close is shown to the user and done once they agree through `AskUserQuestion` (kind: confirmation) — a question written in the text ends the turn and loses the remaining steps. The push of step 5 to a branch the `auto-impl` skill stacked is not asked about: invoking `auto-impl` approved pushing its branches.
- **Owner** means the maintainer running this session: get the login once with `gh api user --jq .login` and compare it with `gh pr view <n> --json author --jq .author.login` / `gh issue view <m> --json author --jq .author.login`. That login is whoever the active `gh` token belongs to (`GH_TOKEN`, a bot, another account), so state the resolved login when you show a text to post. Do not use `gh repo view --json owner` — it returns the organization, not a person. A bot author (`--jq .author.is_bot` is `true`, e.g. Renovate) is treated like the owner: nobody is waiting for a comment.

# Steps

1. **Confirm the merge, and wait for it when the PR is in the merge queue.** When no PR number is given above, ask the user for it. Run `gh pr view <n> --json state,mergedAt,mergeStateStatus,baseRefName,author,closingIssuesReferences`.
   - `MERGED`: go on.
   - `OPEN`, and the user said the PR is queued — or ran `/merged <n>` on it, which is the same report: every merge into `dev` goes through the merge queue, so what the user reports is "queued", not "merged", and waiting for the merge is this skill's job. Find the queue run of the PR: `gh run list --event merge_group --limit 20 --json databaseId,headBranch,status,conclusion,createdAt`, the newest one whose `headBranch` is `gh-readonly-queue/<base>/pr-<n>-<sha>`. Do not filter by workflow: a queue run that fails to start (`startup_failure`) has no workflow name, so `--workflow=test.yml` drops it and the PR looks as if it were still waiting; that conclusion means the PR left the queue (next item). Watch it in the background (`gh run watch <id> --exit-status`: a foreground watch loses its output to the turn timeout). When it ends green, the merge follows within a minute: run `gh pr view <n> --json state,mergedAt` until it says `MERGED`. When there is no queue run yet, the PR may be waiting behind others, or the click did not queue it: look again, and tell the user if there is still none after a minute.
   - The queue run failed or was cancelled, or the PR left the queue (`OPEN` with no run going): stop, name the jobs that failed (`gh run view <id> --json jobs`), and tell the user. The PR is not merged, and nothing below runs.
   - A PR into a branch that has no queue (`v6`, `v4`) is merged by the user directly: `MERGED`, or stop and tell the user.
2. **Resolve the owner** as the Rules say, and whether the PR author and each linked issue author is the owner.
3. **Completion comment on the PR only when someone other than the owner authored it:** what landed, what was deliberately left out, and where the result differs from the plan. The PR body is written before review; this comment records what the merged PR actually is. An owner-authored PR gets no comment: the PR body and the conversation already carry that record.
4. **Report comment on a linked issue only when someone other than the owner filed it.** The comment says what was done and which PR did it. An issue the owner filed gets no report: the PR already says it, and the owner is not waiting to hear back.
   - When the PR merged into a branch other than the default branch (a `v6` PR), `Fixes #N` did not close the issue; check `gh issue view <m> --json state` and close the open ones with `gh issue close <m> --reason completed`. For an issue that gets a report, fold it into the close: `--comment "Fixed by #<n> (merged into <base>)."`.
5. **Leftovers and stacked PRs.** These run here, not only in the session that opened the PR, because `/merged <n>` may come from a later session.
   - When the PR body has a `## Not covered here` section, run `node .claude/skills/impl/scripts/leftovers.mjs status <n>` from the worktree root and resolve its output as the `impl` skill's step 15 says. Skip this when that step 15 called this skill: it runs the check itself right after.
   - When the first line of an open draft PR's body is `Depends on #<n>` (`gh pr list --state open --draft --search "Depends on #<n> in:body" --json number,body,headRefName`; check the first line), the `auto-impl` skill stacked it. Bring it up to date: `git worktree list` shows whether its branch is checked out in a worktree; work there, or else in a Claude Code–managed worktree (never the main checkout) with `git switch <branch>`. Run `git fetch origin <base>`, `git merge origin/<base>`, push, and watch its CI as the `pr` skill's step 8 does; then report that it can be marked ready. Its diff does not shrink to its own change until this merge (a `v6` PR is squashed).
6. **Report** the comments posted, the issues closed, and the stacked PRs brought up to date.
