---
name: list-rule-test
metadata:
  internal: true
description: >
  List rule test IDs with filtering and stats. Use when checking test ID
  coverage, finding missing [rule-name-NNN] prefixes, or picking the next
  available ID number of a rule. Trigger keywords: test id, test ids, rule test
  list, missing id prefix, next test id, list-rule-test.
argument-hint: "[--rule <name>] [--next <name>] [--no-id] [--stats] [--json]"
---

List the test IDs of the behavior tests of `packages/@markuplint/rules/src/**/*.spec.ts` (what a behavior test is: `packages/@markuplint/rules/CLAUDE.md`). Run from the repository root — the script resolves `packages/@markuplint/rules/src` relative to the working directory. Pass the user's arguments (`$ARGUMENTS`) as the options — only the documented flags, nothing else:

```bash
node .claude/skills/list-rule-test/scripts/list-rule-test.mjs $ARGUMENTS
```

Options (`--rule`, `--next`, `--no-id`, `--stats`, `--json`) are documented in the script's header comment — read it before choosing flags. `--next <rule>` prints the ID to give the next test of a rule: the highest number plus one, so the ID of a removed test is not given again.

`--no-id` output must be empty: any hit is a behavior test missing its mandatory `[rule-name-NNN]` ID prefix. (`src/test-ids.spec.ts` enforces this in `yarn test`, and also that no other test has an ID.)
