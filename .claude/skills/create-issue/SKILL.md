---
name: create-issue
metadata:
  internal: true
argument-hint: '[problem description]'
description: >
  Investigate a problem to its root cause and file it as a GitHub Issue with
  the right labels and an As is / To be / Why / How body backed by primary
  sources. Use when asked to file, create, or open an issue, or when the
  `impl` skill hands over a carry-over. Trigger keywords: create
  issue, file an issue, open an issue, report a bug as an issue.
---

Problem to file: $ARGUMENTS

This skill posts to GitHub, yet Claude may invoke it (the `impl`, `pr` and `pr-review` skills do), so the side effect is gated by step 6: nothing is posted before the user approves the draft.

A problem handed over from a carry-over ledger — a bullet of the plan file's `Carry-over` heading (`impl` step 12) or of a merged PR body's `## Not covered here` (`impl` step 15) — already records its reproduction: the minimal input, the observed output, the suspected cause and its file. That record satisfies step 2; do not investigate again what the bullet states, only what it lacks. Through `impl` step 15, the approval of step 6 covers two writes at once — creating the issue and marking the bullet in the PR body — and says so.

# Steps

1. **Understand the problem.** If the description above is empty, ask the user what is happening before anything else. Search for an existing report first — `gh issue list --search "<keywords>" --state all` and `gh pr list --search "<keywords>" --state all` — and when one matches, ask the user (kind: scope) whether the new report is the same problem or a different one; sessions run in parallel, so a duplicate is likely.
2. **Find the cause.** Unless the user explicitly says to skip investigation, reproduce the problem (a spec test or a temporary script that is discarded afterwards — record the input and the observed output) and locate the cause (file and behavior). The body never contains "not investigated", "cause unknown", or "to be investigated"; if you are about to write one, go back and investigate. For a feature or improvement, the equivalent is confirming what the current code does and where the change belongs.
3. **Collect primary sources.** Use the web search and fetch tools available in the session to find the primary source behind the claim: the specification text itself (WHATWG, W3C, WAI-ARIA, RFC, CSS), the paper for an algorithm, or the official documentation of the library. A blog post or a summary is not a primary source. Required for every feature or improvement; required for a bug whenever the spec text is what decides the expected behavior.
4. **Pick labels.** Run `gh label list --limit 100` and choose from what exists — never type a label from memory. One kind label (`Bug`, `Features: Proposal`, `Specs`, …), every area label that applies (`Rule`, `Parser`, `Core API`, `VS Code Extension`, `Configuration File`, …), and the line label for every line the issue applies to: `v5` for the `dev` line, `v6` for the next major (Branch Topology in the root `CLAUDE.md`). Both when the affected code exists on both lines; a file or behaviour that only one line has gets that line's label alone.
5. **Draft the body in English** with exactly this structure:

   ```markdown
   ## As is

   <!-- Current behavior. For a bug: environment (markuplint version, parser,
        Node.js, OS), minimal input, reproduction steps, observed output. -->

   ## To be

   <!-- Expected behavior or desired outcome. -->

   ## Why

   <!-- Rationale with links to the primary sources: the spec section,
        the paper, the official doc. -->

   ## How

   <!-- Cause location and the proposed change: files, functions, approach. -->
   ```

   Verify every path and package name you mention (`ls`, `npm view`) before it goes into the body. Pick a title that names the symptom or the capability, not the fix.

6. **Confirm with the user** through `AskUserQuestion` (kind: confirmation), not in the text of a response — a question in the text ends the turn. Show the title, the labels, and the full body, with a summary in the user's language if it is not English. Adjust and ask again if asked.
7. **Create the issue.** Write the body to a file in the scratchpad directory and run:

   ```bash
   gh issue create --title "<title>" --label "<label>" --label "<label>" --body-file "<path>"
   ```

   `--body-file` avoids the escaping bugs an inline `--body` invites. No `--assignee`: it fails for a session whose token is not a collaborator, and the maintainer assigns during triage.
8. **Report** the created issue's number and URL. Issues and PRs share one number sequence, so read the number from the output rather than predicting it.
