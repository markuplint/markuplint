---
name: analyze-issue
metadata:
  internal: true
argument-hint: '<issue URLs or numbers> | <label or query>'
description: >
  Find the open issues that belong in the same pull request as the given ones
  and group issues into pull requests by recorded conditions (same package or
  family, one fix changes the other's reproduction, one shared reader).
  Read-only: proposes, writes nothing. Run by the `issue`, `impl` and
  `auto-impl` skills before planning, or by the user as `/analyze-issue`.
  Trigger keywords: related issues, group issues, which issues together, one PR.
---

Input: $ARGUMENTS

# Rules

- **Read-only.** Nothing is written to GitHub (no comment, label, close) or to the repository. The report is the response; the caller copies it into its plan.
- **It proposes; the caller decides.** Joining an issue to a PR is a scope decision of the caller: the `issue` and `impl` skills ask it as a scope question with this report's proposal as the recommended option; a multi-PR run of `auto-impl` decides it and records it as `claude:`. Run by the user directly, the report ends with the proposal.
- **One line.** Candidates are issues of the same line as the input (`v5` / `dev` or `v6`, as the issue labels and the root `CLAUDE.md` say).
- **Conditions, not themes.** Two issues are joined only by a condition of Grouping below, named in the report. A shared theme or a similar title is not a condition.

# Steps

1. **Read the input.**
   - Issues: `gh issue view <n> --json number,title,body,labels,state` for each.
   - A label or query: `gh issue list --state open --label <label> --limit 200 --json number,title,labels` (or `--search`); every issue listed is input.
2. **Cause and place of each input issue.** Read the code the issue names (grep the rule, function, file) and write:
   - Cause, in one sentence: "<code> reads / makes <what> wrong".
   - Place to fix: package, file, function. When the issue's How names one, check it in the code; when the code says otherwise, the code wins and the report says so.
   - Reproduction: the minimal input and output from the issue body.
3. **Candidates** (when the input is issues, not a label or query that already lists every issue to plan):
   - Search the open issues by every name of step 2 — the package, the rule, the function, the file: `gh issue list --state open --search "<name>" --limit 50 --json number,title,labels`.
   - List the open issues that share the input's area label (`Parser`, `Specs`, `Rule`, `Core API`) and line label, and read the body of each whose title names a package or rule of the same family (Grouping (b)).
   - Drop a candidate that an open PR already fixes (`gh pr list --state open --search "<n> in:body" --json number,body`, a `Fixes #<n>` line) and name it in the report.
   - Do step 2 for each remaining candidate.
4. **Group** the input issues and the candidates by Grouping below. A candidate that no condition joins to an input issue is left out.
5. **Report**:
   - A table: PR (proposed) | issues | condition that joins them, with the pair (`(c) #4921 ← #4922`) | places to fix.
   - For `auto-impl`: the pairs of separate PRs that touch the same file or rule (they are chained; Dependencies and branches of `auto-impl`).
   - The candidates checked and not joined, each with the reason (no condition holds), and the ones dropped for an open PR.
   - For a single input issue: the issues to join it with, or "none".

# Grouping

Wide PRs, few carry-overs. Two issues go into one PR when any of these holds:

- (a) Their places to fix are in the same package.
- (b) Their places to fix are in the same family:
  - parsers: `@markuplint/parser-utils`, `ml-ast`, `*-parser`
  - specs: `@markuplint/ml-spec`, `html-spec`, `types`, `*-spec`
  - DOM: `@markuplint/ml-core`, `selector`
  - rules that share a checking or helper module (`rules/src/wai-aria/checkings/`, `rules/src/helpers.ts`)
- (c) The fix of one changes the output of the other's reproduction (the other's expected value depends on it).
- (d) Several readers read the same value or data each on their own, and one shared reader fixes both.

Joining is transitive: when #1 and #2 are joined and #2 and #3 are joined, all three are one PR. Size is not a condition (Decision criteria in the root `CLAUDE.md`).

A problem found while implementing a PR goes through the same conditions against that PR: one that a condition joins is fixed in it; otherwise it is filed as an issue (the caller's carry-over).
