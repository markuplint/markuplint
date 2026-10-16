---
name: pr
metadata:
  internal: true
description: >
  Create and push a pull request — pre-flight checks, base tracking, PR body
  drafting, conflict detection, and CI watch loop. Use when asked to open,
  create, or push a PR. Trigger keywords: pull request, PR, open a PR, push
  branch, gh pr create.
---

1. Ensure that you are on a topic branch that is not `dev`, `v6`, or `main`.
2. **Determine the base branch.** Two major lines are developed in parallel (Branch Topology in the root `CLAUDE.md`); a v6 topic branch opened against `dev` diffs against the wrong tree and merges in the wrong direction. Take the base from the branch's upstream:

   ```bash
   git rev-parse --abbrev-ref '@{upstream}'   # e.g. origin/v6
   ```

   If the branch has no upstream yet, a `crates/` directory in the working tree means the base is `v6`; otherwise `dev`. Write `<base>` for the result below, and always pass it explicitly: `gh pr create --base <base>`.
3. **Base tracking (conflict prevention)**: run `git fetch origin <base>`, then `git log HEAD..origin/<base> --oneline`. If the base has advanced, sync with `git merge origin/<base>` before pushing — never rebase (see Branch & Worktree Policy in the root `CLAUDE.md`).
4. **Pre-flight checks:**
   - If `yarn lint-check`, `yarn build`, and `yarn test` have not already been run and passed in this session, run them **now** before proceeding. Re-run after any base sync.
   - All three must pass. Fix any failures before continuing.
   - If the branch touches `website/`, also run `yarn site:build`.
   - If the branch touches `crates/`, also run `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked`. `yarn test` does not cover the Rust workspace, so without these `.github/workflows/rust.yml` is the first thing that sees the breakage.
5. Review the full diff against the base (`git diff origin/<base>...HEAD`) and re-apply the pre-commit content check from the `git` skill (secrets, sample-value conventions) across the whole PR.
6. **Write the PR body to a temp file** in the scratchpad directory and create the PR with `gh pr create --body-file "<path>"` — embedding the body inline invites escaping bugs (backticks, quotes, newlines). The PR body summarizes the **diff**, not the conversation.
7. **Mergeability check (CI watch cannot catch this):** after creation, run `gh pr view <PR_NUMBER> --json baseRefName,mergeable,mergeStateStatus`. Confirm `baseRefName` is `<base>`. If `CONFLICTING` / `DIRTY`, go back to step 3, resolve, and push again — do not wait for CI first.
8. **CI watch (after PR creation and after every additional push):**
   - Run `gh pr checks <PR_NUMBER> --watch` in the background to monitor all CI checks (foreground runs lose output to turn timeouts).
   - **If any check fails:**
     1. Inspect the failed check logs (`gh run view <RUN_ID> --log-failed`).
     2. Fix the issue in the worktree. Treat every failure as caused by this PR until proven otherwise — there is no such thing as an "unrelated" test failure.
     3. Run the relevant local verification (`yarn lint-check`, `yarn build`, `yarn test`; plus the `cargo` checks from step 4 for `crates/` failures) to confirm the fix.
     4. Commit, push, and run `gh pr checks <PR_NUMBER> --watch` again.
     5. Repeat until all checks pass.
   - **If all checks pass:** re-run `gh pr view <PR_NUMBER> --json mergeable,mergeStateStatus` — the base may have advanced during the CI run and introduced a new conflict. If `CONFLICTING` / `DIRTY`, return to step 7's resolution path. Otherwise open the PR in the browser with `gh pr view <PR_NUMBER> --web` and report to the user that it is ready to merge.
9. **After the user says the PR is merged** — confirm with `gh pr view <PR_NUMBER> --json state,mergedAt`, then work through the three items below in order. Each one posts to GitHub, so show its text to the user and post it once they agree. Two of them hinge on who the author is. "Owner" below means the maintainer running this session: get the login once with `gh api user --jq .login` and compare it with `gh pr view <PR_NUMBER> --json author --jq .author.login` / `gh issue view <n> --json author --jq .author.login`. That login is whoever the active `gh` token belongs to (`GH_TOKEN`, a bot, another account), so state the resolved login when you show the text to post. Do not use `gh repo view --json owner` — it returns the organization, not a person. A bot author (`--jq .author.is_bot` is `true`, e.g. Renovate) is treated like the owner: nobody is waiting for a comment.
   1. **Completion comment on the PR only when someone other than the owner authored it:** what landed, what was deliberately left out, and where the result differs from the plan. The PR body is written before review; this comment records what the merged PR actually is. An owner-authored PR gets no comment: the PR body and the conversation already carry that record.
   2. **Report comment on a linked issue only when someone other than the owner filed it.** The comment says what was done and which PR did it. An issue the owner filed gets no report: the PR already says it, and the owner is not waiting to hear back.
      - When the PR merged into a branch other than the default branch (a `v6` PR), `Fixes #N` did not close the issue; check `gh issue view <n> --json state` and close the open ones with `gh issue close <n> --reason completed`. For an issue that gets a report, fold it into the close: `--comment "Fixed by #<PR> (merged into <base>)."`.
   3. **File each leftover as its own issue with the `create-issue` skill** — one invocation per limitation, untested site or follow-up named in the PR body's "Not covered here". A leftover that lives only in the PR body or in memory is lost. Hand over only what is reproduced and has an identified cause; `create-issue` does the investigation, labelling, drafting, and the confirmation before posting. Put the new issue numbers in the completion comment in 9.1 when that comment is posted after them; when 9.1 is skipped, report the numbers to the user instead.
