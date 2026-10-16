---
name: create-issue
metadata:
  internal: true
argument-hint: '[problem description]'
description: >
  Investigate a problem to its root cause and file it as a GitHub Issue with
  the right labels and an As is / To be / Why / How body backed by primary
  sources. Use when asked to file, create, or open an issue, or when the `pr`
  skill hands over a leftover. Trigger keywords: create issue, file an issue,
  open an issue, 起票, Issue にして.
---

Problem to file: $ARGUMENTS

This skill posts to GitHub, yet Claude may invoke it (the `pr` skill does), so the side effect is gated by step 6: nothing is posted before the user approves the draft.

# Steps

1. **Understand the problem.** If the description above is empty, ask the user what is happening before anything else. Search for an existing report first — `gh issue list --search "<keywords>" --state all` and `gh pr list --search "<keywords>" --state all` — and stop to tell the user if one matches; sessions run in parallel, so a duplicate is likely.
2. **Find the cause.** Unless the user explicitly says to skip investigation, reproduce the problem (a spec test or a temporary script that is discarded afterwards — record the input and the observed output) and locate the cause (file and behavior). The body never contains "not investigated", "cause unknown", or "to be investigated"; if you are about to write one, go back and investigate. For a feature or improvement, the equivalent is confirming what the current code does and where the change belongs.
3. **Collect primary sources.** Use the web search and fetch tools available in the session to find the primary source behind the claim: the specification text itself (WHATWG, W3C, WAI-ARIA, RFC, CSS), the paper for an algorithm, or the official documentation of the library. A blog post or a summary is not a primary source. Required for every feature or improvement; required for a bug whenever the spec text is what decides the expected behavior.
4. **Pick labels.** Run `gh label list --limit 100` and choose from what exists — never type a label from memory. One kind label (`Bug`, `Features: Proposal`, `Specs`, …) plus every area label that applies (`Rule`, `Parser`, `Core API`, `VS Code Extension`, `Configuration File`, …).
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

6. **Confirm with the user.** Show the title, the labels, and the full body, with a summary in the user's language if it is not English. Wait for approval. Adjust and show again if asked.
7. **Create the issue.** Write the body to a file in the scratchpad directory and run:

   ```bash
   gh issue create --title "<title>" --label "<label>" --label "<label>" --assignee "<owner>" --body-file "<path>"
   ```

   `--body-file` avoids the escaping bugs an inline `--body` invites. `<owner>` is the repository owner (`gh repo view --json owner`), matching what the issue templates assign.
8. **Report** the created issue's number and URL. Issues and PRs share one number sequence, so read the number from the output rather than predicting it.
