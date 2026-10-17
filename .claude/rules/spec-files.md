---
paths:
  - "**/*.spec.ts"
---

# Existing tests are a contract

An existing test asserts behavior that is already shipped. Do not rewrite, renumber, merge, split, reorder, or delete one to make a change pass, and do not alter a fixture's input (for example, adding an attribute to the markup so a new check stops firing on it). Each of those hides the behavior change from the diff and from CI, so the only reliable signal that something changed is gone.

When a change makes an existing test fail, stop and present to the user which tests and cases fail, then ask which of these to apply:

1. Leave the test untouched and let it fail.
2. Flip only the failing assertion, keep the original line as a comment next to it, and keep every input, variable number, and test block as it is. Label the pair as follows: a `// Behavior change: <what changed>` line above the new assertion, and the original kept as `// <original line> // previous`. The phrase is the one the commit body uses for such a change (the `git` skill), so a search for it finds the test and the commit alike. No issue or PR number (the `doc` skill), and not `BREAKING CHANGE`: that names the commit marker the stable line does not use.
3. Add a new test for the new behavior under the next free ID, leaving the old test alone.

"It is a minimal change" is not a reason to skip the question — where the minimum lies is the user's call.
