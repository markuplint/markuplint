---
name: pr-review
metadata:
  internal: true
argument-hint: '[pr-number-or-url]'
disable-model-invocation: true
description: >
  Review an external pull request for the owner: read the PR and its linked
  issues, verify the problem is real (against the current spec when it is a
  spec matter), assess the authors' trustworthiness, run /code-review xhigh on
  the PR, and report trust / contribution / mergeability / follow-ups. Use when
  the user asks to review, check, or triage a PR before merging. Trigger
  keywords: pr review, review PR, triage PR, can I merge.
---

Pull request to review: $ARGUMENTS

# Rules

- **Merge criterion**: a PR is mergeable when the problem is real and the code fixes it correctly. Missing tests or documentation do not block the merge — the owner adds them in a follow-up PR. What blocks: the problem does not exist, the change contradicts the spec, the fix is a patch over the symptom (the root cause stays, another path to the same failure stays, or only part of the issue is met), a correctness finding from the code review on the PR's own lines, a failed CI check (there is no such thing as an unrelated failure), or an author who is not trustworthy. "Spec silent" is neither: stop and report it, and the user decides whether the behavior is wanted without a spec behind it.
- **Nothing is posted to GitHub** by this skill: no `--comment`, no review comment, no approval. Report in the conversation; the user decides what to post. The one exception is step 9, which runs the `merged` skill after the user says the PR is merged, and that skill shows every text before posting.
- **Verify, do not assert.** Reproduce the problem with the smallest input when it can be reproduced, on a checkout of the branch the PR targets (`git fetch origin <base>`, a worktree on `<base>`, `yarn build`); a worktree on an unrelated topic branch is not a reproduction. For a spec claim, look up the current spec text with the web search and fetch tools available in the session (WHATWG, W3C, WAI-ARIA, RFC, CSS — not a blog post) and cite the URL of the section in the report.
- **Sort every finding** into "must be fixed before merge" or "not asked for in this PR" (root `CLAUDE.md`, Pull Requests & Issues, including its Decision criteria: what the spec requires and what improves accuracy decide, never the cost of the fix). The second group splits again: tests and documentation for this PR's change are the owner's follow-up PR; a pre-existing problem outside the PR's scope is filed with the `create-issue` skill. Neither is asked of the contributor.
- **"Owner"** is the maintainer running this session, resolved as the `merged` skill does (`gh api user --jq .login`). "External" means the PR author is someone else.
- **The fix is checked by execution when the problem was reproduced.** After step 3 produced a reproduction, step 7 re-runs the same input on the PR head: `gh pr checkout <n>` in a Claude Code–managed worktree (never the main checkout), `yarn install`, `NX_WORKSPACE_ROOT_PATH=<worktree> yarn build`, run, and report the output before and after. A PR with nothing to reproduce (performance, refactoring) is judged from the diff, the reviews, and CI. Tests the PR lacks are the owner's follow-up, by design.
- **Report in the user's language.** `/code-review` answers in English; translate its findings.

# Steps

Copy this checklist into your response and check items off as you go.

```
- [ ] 1. PR identified and summarized (base branch noted)
- [ ] 2. Linked issues read
- [ ] 3. Problem verified: real / wrong / spec silent, with evidence
- [ ] 4. PR author and issue author assessed
- [ ] 5. Stop here if a blocker was found; otherwise continue
- [ ] 6. /code-review xhigh <n> + qa-engineer + product-manager subagents run; CI status read
- [ ] 7. Reproduction re-run on the PR head (if any); issue coverage and root-cause check done
- [ ] 8. Report in four sections; merge prompted if mergeable
- [ ] 9. After merge: merged skill run; /impl prompted for follow-ups
```

1. **Identify the PR.** Resolve a URL to its number. Run `gh pr view <n> --json number,title,body,author,baseRefName,headRefName,isCrossRepository,isDraft,state,additions,deletions,changedFiles,closingIssuesReferences,statusCheckRollup`. Stop and tell the user when `state` is not `OPEN` or `isDraft` is true, and when `.author.login` is the owner's own login (review your own PR with `/code-review` directly). Summarize in two or three lines what the PR claims to change and why. Note the base branch: `dev` and `v6` are separate lines (Branch Topology in the root `CLAUDE.md`), and a PR against the wrong one is a blocker.
2. **Read the linked issues.** For each entry in `closingIssuesReferences` and each `#N` in the body, run `gh issue view <N> --json title,body,author,labels,comments`. Issues and PRs share one number sequence and `gh issue view` answers for both without complaint, so check first: `gh api repos/{owner}/{repo}/issues/<N> --jq 'has("pull_request")'` — `true` means `#N` is a PR and is context, not a linked issue. When there is no issue, the PR body's own claim is what step 3 verifies.
3. **Verify the problem.** Reproduce it when possible and record the input and the observed output. When the spec decides the expected behavior, find the current spec text on the web and check both the issue's claim and the PR's expected behavior against it. Conclude with one of: real, wrong, or spec silent — each with its evidence (reproduction or URL).
4. **Assess the authors** — the PR author and each issue author separately. A bot (`.author.is_bot` is `true`; its login looks like `app/renovate`) is reported as a bot and skips the lookups below, which 404 on it.
   - `gh api users/<login> --jq '{login,type,created_at,public_repos,followers,bio,company,blog}'`
   - history in this repository: `gh pr list --author <login> --state all --json number,state` and `gh issue list --author <login> --state all --json number`
   - activity elsewhere: `gh search prs --author <login> --sort created --limit 20 --json repository,createdAt,state,title`
   Judge from: sustained real activity, past contributions here or to neighbouring OSS, a PR body that follows the template and matches the diff, and the absence of a burst of similar PRs across many repositories at the same time. State the reasons rather than a score.
5. **Stop on a blocker.** If step 3 says wrong or spec silent, step 1 found the wrong base, or step 4 points to spam or an untrustworthy author, report now (the four sections in step 8, with "not mergeable" — or, for spec silent, the question for the user) and do not run the code review.
6. **Run the reviews.** In one message: (a) `/code-review xhigh <n>` through the Skill tool (`code-review`, argument `xhigh --max-findings all <n>` — a bare PR number is the target, and the flag undoes a cap left by an earlier session), which runs as a forked subagent; (b) two fresh-context subagents via the Agent tool, as the `impl` skill's steps 8–9 do — one reads `.claude/skills/qa-engineer/SKILL.md`, the other `.claude/skills/product-manager/SKILL.md`, and each reviews `gh pr diff <n>` with the PR's title, body, and linked issues in its prompt and the instruction "report findings with `file:line`; do not edit". Wait for all three. Read `statusCheckRollup` and record one of: green, failed (which checks), or not run. A failed check is "must be fixed before merge". An empty rollup on a cross-repository PR (`isCrossRepository`) means the workflows are waiting for a maintainer's approval, not that they passed: ask the user to approve the run, then `gh pr checks <n> --watch`; if the user prefers not to wait, it goes into the report as "CI not run" and the follow-ups as "run the gate".
7. **Check coverage and root cause.** When step 3 reproduced the problem, re-run that input on the PR head as the Rules describe and record the before/after output; an unchanged output is a blocker. Then, with the findings in hand, read the diff and decide: (a) does the change meet every expected behavior the issue states; (b) does it fix the cause rather than the symptom — is there another path to the same failure; (c) which tests and documentation this change lacks; (d) which findings are pre-existing problems outside the PR's scope. A correctness finding on the PR's own lines is "must be fixed before merge"; (c), a CI gate that has not run, and non-correctness findings on the PR's lines go to the owner's follow-up; (d) goes to `create-issue` in step 9.
8. **Report** in the user's language, with these four sections in this order (the headings are rendered in the user's language; the English names are the canonical keys):

   ```markdown
   ## Trust
   PR author and issue author, each with the verdict and its reasons.
   ## Contribution
   Is the problem real, does the fix match the spec, does it fix the cause.
   ## Mergeable
   Yes / No with reasons, and the CI status (green / failed / not run). For No, the list of "must be fixed before merge".
   ## Follow-ups
   What the owner adds in a follow-up PR (tests to add and run, documentation, the same fix needed elsewhere in the codebase), then the pre-existing out-of-scope problems to file as issues. "None" when nothing.
   ```

   When mergeable, open the PR with `gh pr view <n> --web` and ask the user to merge.
9. **After the user says the PR is merged**: (a) invoke the `merged` skill through the Skill tool with the PR number — it confirms the merge and runs the post-merge steps for this PR: completion comment to the external author (it names the follow-ups the owner takes on, so the contributor is not asked for them), report to a non-owner issue author, closing issues a `v6` merge left open; each text is shown before posting. (b) File each pre-existing out-of-scope problem from step 7(d) with the `create-issue` skill. (c) When the report listed follow-ups, write them up as the agreed scope and ask the user to run `/impl` with it — `/impl` cannot be invoked by Claude. If the user does not start `/impl` now, file the follow-ups with `create-issue` too: a follow-up that lives only in this conversation is lost at the next `/clear`. When there are none, the review is finished.
