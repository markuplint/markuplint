---
paths:
  - "**/*.spec.ts"
---

# Existing tests are a contract

An existing test asserts behavior that is already shipped. Do not rewrite, renumber, merge, split, reorder, or delete one to make a change pass, and do not alter a fixture's input (for example, adding an attribute to the markup so a new check stops firing on it). Each of those hides the behavior change from the diff and from CI, so the only reliable signal that something changed is gone.

When a change makes an existing test fail, stop and present to the user which tests and cases fail, then ask which of these to apply:

1. Leave the test untouched and let it fail.
2. Flip only the failing assertion, and keep every input, variable number, and test block as it is. A test or `describe` name or a comment that the flipped assertion contradicts is reworded to state the current behavior; that rewording is the one change besides the assertion that this choice makes to an existing test. A test ID stays as it is even when its category no longer fits (a `valid` test that now expects a violation), as the ID is what other places refer to. The reason for the change goes in the body of the commit that makes it, in the form the `git` skill gives for the kind of change and the release line (`dev` / `v6`): a `Behavior change (…):` paragraph, a breaking-change marker, or the explanation of the body. The test file carries no comment about the change: it describes the current behavior, as the `doc` skill asks of test names and comments (its rule 7). A comment on why the current assertion holds, such as the passage of a specification it follows, is not about the change and stays.
3. Add a new test for the new behavior under the next free ID, leaving the old test alone.

"It is a minimal change" is not a reason to skip the question — where the minimum lies is the user's call.
