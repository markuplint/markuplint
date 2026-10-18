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

1. Ensure that you are on a topic branch — not `dev`, `v6`, `v4`, `main`, or a prerelease branch, as in the branch guard of the `git` skill.
2. **Determine the base branch.** Two major lines are developed in parallel (Branch Topology in the root `CLAUDE.md`); a v6 topic branch opened against `dev` diffs against the wrong tree and merges in the wrong direction. If a PR already exists for the branch, take the base from it (the command errors when there is none — treat that as "no PR"):

   ```bash
   gh pr view --json baseRefName --jq .baseRefName
   ```

   Otherwise a `crates/` directory in the working tree means the base is `v6`, else `dev`; ask the user for `v4` maintenance work. Do not derive the base from `@{upstream}`: after the first `git push -u`, it is the topic branch's own remote ref. Write `<base>` for the result below, and always pass it explicitly: `gh pr create --base <base>`.
3. **Base tracking (conflict prevention)**: run `git fetch origin <base>`, then `git log HEAD..origin/<base> --oneline`. If the base has advanced, sync with `git merge origin/<base>` before pushing — never rebase (see Branch & Worktree Policy in the root `CLAUDE.md`).
4. **Pre-flight checks:**
   - If `yarn lint-check`, `yarn build`, and `yarn test` have not already been run and passed in this session, run them **now** before proceeding. Re-run after any base sync.
   - All three must pass. Fix any failures before continuing.
   - If the branch touches `website/`, also run `yarn site:build`.
   - If the branch touches `crates/`, also run `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and `cargo test --locked`. `yarn test` does not cover the Rust workspace, so without these `.github/workflows/rust.yml` is the first thing that sees the breakage.
5. Review the full diff against the base (`git diff origin/<base>...HEAD`) and re-apply the pre-commit content check from the `git` skill (secrets, sample-value conventions) across the whole PR.
6. **Write the PR body to a temp file** in the scratchpad directory and create the PR with `gh pr create --body-file "<path>"` — embedding the body inline invites escaping bugs (backticks, quotes, newlines). The PR body summarizes the **diff**, not the conversation.
   - When the diff changes runtime behavior, a public type, the meaning of a configuration, or an emitted format (pretenders JSON, CLI output, the language-server protocol), the body has a `## Behavior changes` section; a PR of docs or tests alone has none. For each change: (a) the judgment — `experimental` (an `@experimental` API, option or output; may ship from the stable line), `not breaking` (intended usage keeps working — say why), or `breaking` (made on the next-major line, or shipped from the stable line as an exception the user approved on this PR: the commit's paragraph then starts with `Behavior change (stable, approved): `, and a migration guide is in this section and on the website); (b) the affected data, API or option; (c) a before → after example; (d) what a user does about it — on the feature's website page (en and ja) as well, when it has one. The `product-manager` review checks this section; the compatibility policy is in that skill.
   - `## Not covered here` is the carry-over ledger that the `merged` skill reads after the merge. One leftover per `- ` bullet: each bullet says enough to become an issue without this conversation — the minimal input, the observed output, the suspected cause and its file — and ends with ` — Filed as #N`. Under the `impl` skill the section is the plan file's `Carry-over` ledger copied as is, and `impl` step 12 has filed every bullet before the commit. When this skill runs on its own, write the leftovers in the same form and file each one with the `create-issue` skill before `gh pr create`, so that the marker is there either way. A bullet without the marker is unfinished work, not a note. When nothing is deferred, the section reads `None.`. A decision not to change something is not a leftover: it goes under `## Left as is on purpose` with the user's reason (the `leave as is` entries of the plan's `Decisions`), never into this section.
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
9. **After the user says the PR is merged**, invoke the `merged` skill through the Skill tool with the PR number. Every post-merge step — the completion comment, the report on linked issues, closing the issues a `v6` merge left open, and any leftover the ledger still holds — lives there, so that it is read at the moment it runs instead of being carried from this invocation across the whole CI wait.
