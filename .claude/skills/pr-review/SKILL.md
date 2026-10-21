---
name: pr-review
metadata:
  internal: true
argument-hint: '[pr-number-or-url]'
disable-model-invocation: true
description: >
  Review an external pull request for the owner: check it against the intake
  conditions of CONTRIBUTING.md (eligible issue, required body sections, no
  burst of PRs across repositories) and stop there when it fails them; then
  read the PR and its linked issues, verify the problem is real (against the
  current spec when it is a spec matter), assess the authors' trustworthiness,
  run /code-review xhigh on the PR, and report trust / contribution /
  mergeability / follow-ups. Use when the user asks to review, check, or
  triage a PR before merging. Trigger keywords: pr review, review PR, triage
  PR, can I merge.
---

Pull request to review: $ARGUMENTS

# Rules

- **Intake comes first.** `CONTRIBUTING.md` ("Before you open a pull request") sets the conditions a PR must meet before anyone reviews it. Step 2 checks them before any reproduction or review, because the cost of reviewing a PR that is then closed is what the conditions exist to avoid. A PR that fails them is not reviewed further.
- **Merge criterion**: a PR is mergeable when the problem is real and the code fixes it correctly. Missing tests or documentation do not block the merge — the owner adds them in a follow-up PR. What blocks: the problem does not exist, the change contradicts the spec, the fix is a patch over the symptom (the root cause stays, another path to the same failure stays, or only part of the issue is met), a correctness finding from the code review on the PR's own lines, a failed CI check (there is no such thing as an unrelated failure), or an author who is not trustworthy. "Spec silent" is neither: stop and report it, and the user decides whether the behavior is wanted without a spec behind it.
- **Nothing is posted to GitHub** by this skill except in two places: step 2 closes a PR that fails intake, and step 10 runs the `merged` and `create-issue` skills after the user says the PR is merged. All of them show every text before posting and post only after the user agrees through `AskUserQuestion` (kind: confirmation). Everything else is reported in the conversation; the user decides what to post.
- **Verify, do not assert.** Reproduce the problem with the smallest input when it can be reproduced, on a checkout of the branch the PR targets (`git fetch origin <base>`, a worktree on `<base>`, `yarn build`); a worktree on an unrelated topic branch is not a reproduction. For a spec claim, look up the current spec text with the web search and fetch tools available in the session (WHATWG, W3C, WAI-ARIA, RFC, CSS — not a blog post) and cite the URL of the section in the report.
- **Sort every finding** into "must be fixed before merge" or "not asked for in this PR" (root `CLAUDE.md`, Pull Requests & Issues, including its Decision criteria: what the spec requires and what improves accuracy decide, never the cost of the fix). The second group splits again: tests and documentation for this PR's change are the owner's follow-up PR; a pre-existing problem outside the PR's scope is filed with the `create-issue` skill. Neither is asked of the contributor.
- **"Owner"** is the maintainer running this session, resolved as the `merged` skill does (`gh api user --jq .login`). "External" means the PR author is someone else.
- **The fix is checked by execution when the problem was reproduced.** After step 4 produced a reproduction, step 8 re-runs the same input on the PR head: `gh pr checkout <n>` in a Claude Code–managed worktree (never the main checkout), `yarn install`, `NX_WORKSPACE_ROOT_PATH=<worktree> yarn build`, run, and report the output before and after. A PR with nothing to reproduce (performance, refactoring) is judged from the diff, the reviews, and CI. Tests the PR lacks are the owner's follow-up, by design.
- **Report in the user's language.** `/code-review` answers in English; translate its findings.

# Steps

Copy this checklist into your response and check items off as you go.

```
- [ ] 1. PR identified and summarized (base branch noted)
- [ ] 2. Intake: eligible issue, required body sections, burst check — closed here if it fails
- [ ] 3. Linked issues read
- [ ] 4. Problem verified: real / wrong / spec silent, with evidence
- [ ] 5. PR author and issue author assessed
- [ ] 6. Stop here if a blocker was found; otherwise continue
- [ ] 7. /code-review xhigh <n> + qa-engineer + product-manager subagents run; CI status read
- [ ] 8. Reproduction re-run on the PR head (if any); issue coverage and root-cause check done
- [ ] 9. Report in four sections; merge prompted if mergeable
- [ ] 10. After merge: merged skill run; /impl prompted for follow-ups
```

1. **Identify the PR.** Resolve a URL to its number. Run `gh pr view <n> --json number,title,body,author,createdAt,baseRefName,headRefName,isCrossRepository,isDraft,state,additions,deletions,changedFiles,closingIssuesReferences,statusCheckRollup`. Stop and tell the user when `state` is not `OPEN` or `isDraft` is true, and when `.author.login` is the owner's own login (review your own PR with `/code-review` directly). Summarize in two or three lines what the PR claims to change and why. Note the base branch: `dev` and `v6` are separate lines (Branch Topology in the root `CLAUDE.md`), and a PR against the wrong one is a blocker.
2. **Intake.** Check the three conditions of `CONTRIBUTING.md` in order and record each as met or not met, with the evidence. A bot author (`.author.is_bot` is `true`, e.g. Renovate) skips this step.
   - (a) **Eligible issue.** Take the issues from `closingIssuesReferences` and from each `Fixes #N` / `Closes #N` in the body. For each, `gh issue view <N> --json labels`: it is eligible when its labels include `Pull Request Wanted`. Not met when no linked issue is eligible. A PR without any issue meets the condition only when the body says the change does not alter behavior and the diff agrees (a typo, a wording fix in documentation) — judge that from `gh pr diff <n>`.
   - (b) **Required body sections.** The body states the cause of the problem, the verification (the reproduction before the change and the tests run after it), and the AI assistance (what AI was used for and what review it did, or "None"). Headings do not matter; the content does. Not met when any of the three is missing. Whether the cause is right is judged later (step 8), not here.
   - (c) **Burst of PRs.** Run `gh search prs --author <login> --sort created --order desc --limit 100 --json repository,createdAt,title,state,url` and keep the PRs created within 24 hours either side of this PR's `createdAt`. Show the count, the number of distinct repositories, and the titles. There is no numeric threshold: when the list shows many PRs to many repositories in a short time, especially with similar titles, ask the user (kind: confirmation, recommended option first) whether to reject the PR as a burst. The answer decides the condition.
   - When all three are met, continue to step 3. When any is not met, stop: do not reproduce or review. Draft the closing comment in English. It names the conditions, never a judgement of the person: no "spam", no "AI-generated", no counts or other evidence from (c) — a judgement or a number invites an argument about the author instead of the PR, and the conditions are already public. For (a) and (b): thank the author, name each condition not met in one sentence, and link the section of `https://github.com/markuplint/markuplint/blob/dev/CONTRIBUTING.md` that states it (`#which-issues-accept-a-pull-request`, `#what-the-pull-request-body-must-contain`). For (a) on an issue that exists, say that a maintainer is working on it and nothing more: the owner adds `Pull Request Wanted` to an issue that wants outside help. For (a) with no issue, say to open one first. For (c), the whole comment is one sentence: "Closing per our [contributing guidelines](https://github.com/markuplint/markuplint/blob/dev/CONTRIBUTING.md#before-you-open-a-pull-request)." When (c) applies, (a) and (b) are not listed. A reply to the closed PR is not argued; the owner may lock the conversation. Reporting or blocking the account is the owner's own decision and not part of this skill. Show the draft and the resolved owner login, ask through `AskUserQuestion` (kind: confirmation), and on approval write the text to a file in the scratchpad directory and run `gh pr comment <n> --body-file "<path>"` then `gh pr close <n>`. Report and end the review.
3. **Read the linked issues.** For each entry in `closingIssuesReferences` and each `#N` in the body, run `gh issue view <N> --json title,body,author,labels,comments`. Issues and PRs share one number sequence and `gh issue view` answers for both without complaint, so check first: `gh api repos/{owner}/{repo}/issues/<N> --jq 'has("pull_request")'` — `true` means `#N` is a PR and is context, not a linked issue. When there is no issue, the PR body's own claim is what step 4 verifies.
4. **Verify the problem.** Reproduce it when possible and record the input and the observed output. When the spec decides the expected behavior, find the current spec text on the web and check both the issue's claim and the PR's expected behavior against it. Conclude with one of: real, wrong, or spec silent — each with its evidence (reproduction or URL).
5. **Assess the authors** — the PR author and each issue author separately. A bot (`.author.is_bot` is `true`; its login looks like `app/renovate`) is reported as a bot and skips the lookups below, which 404 on it.
   - `gh api users/<login> --jq '{login,type,created_at,public_repos,followers,bio,company,blog}'`
   - history in this repository: `gh pr list --author <login> --state all --json number,state` and `gh issue list --author <login> --state all --json number`
   - activity elsewhere: the search of step 2(c), reused
   Judge from: sustained real activity, past contributions here or to neighbouring OSS, and a PR body whose cause and verification match the diff. State the reasons rather than a score.
6. **Stop on a blocker.** If step 4 says wrong or spec silent, step 1 found the wrong base, or step 5 points to an untrustworthy author, report now (the four sections in step 9, with "not mergeable" — or, for spec silent, the question for the user) and do not run the code review.
7. **Run the reviews.** In one message: (a) `/code-review xhigh <n>` through the Skill tool (`code-review`, argument `xhigh --max-findings all <n>` — a bare PR number is the target, and the flag undoes a cap left by an earlier session), which runs as a forked subagent; (b) two fresh-context subagents via the Agent tool, as the `impl` skill's steps 8–9 do — one reads `.claude/skills/qa-engineer/SKILL.md`, the other `.claude/skills/product-manager/SKILL.md`, and each reviews `gh pr diff <n>` with the PR's title, body, and linked issues in its prompt and the instruction "report findings with `file:line`; do not edit". Wait for all three. Read `statusCheckRollup` and record one of: green, failed (which checks), or not run. A failed check is "must be fixed before merge". An empty rollup on a cross-repository PR (`isCrossRepository`) means the workflows are waiting for a maintainer's approval, not that they passed: ask the user to approve the run, then `gh pr checks <n> --watch`; if the user prefers not to wait, it goes into the report as "CI not run" and the follow-ups as "run the gate".
8. **Check coverage and root cause.** When step 4 reproduced the problem, re-run that input on the PR head as the Rules describe and record the before/after output; an unchanged output is a blocker. Then, with the findings in hand, read the diff and decide: (a) does the change meet every expected behavior the issue states; (b) does it fix the cause rather than the symptom — is there another path to the same failure, and does the cause the body states match what the diff fixes; (c) which tests and documentation this change lacks; (d) which findings are pre-existing problems outside the PR's scope. A correctness finding on the PR's own lines is "must be fixed before merge"; (c), a CI gate that has not run, and non-correctness findings on the PR's lines go to the owner's follow-up; (d) goes to `create-issue` in step 10.
9. **Report** in the user's language, with these four sections in this order (the headings are rendered in the user's language; the English names are the canonical keys):

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
10. **After the user says the PR is merged**: (a) invoke the `merged` skill through the Skill tool with the PR number — it confirms the merge and runs the post-merge steps for this PR: completion comment to the external author (it names the follow-ups the owner takes on, so the contributor is not asked for them), report to a non-owner issue author, closing issues a `v6` merge left open; each text is shown before posting. (b) File each pre-existing out-of-scope problem from step 8(d) with the `create-issue` skill. (c) When the report listed follow-ups, write them up as the agreed scope and ask the user to run `/impl` with it — `/impl` cannot be invoked by Claude. If the user does not start `/impl` now, file the follow-ups with `create-issue` too: a follow-up that lives only in this conversation is lost at the next `/clear`. When there are none, the review is finished.
