---
name: bench-rule-enable
metadata:
  internal: true
description: >
  Enable an existing or newly-added markuplint rule on the
  nu-validator bench by editing tests/external/bench/config.ts. Covers
  the flat-rule case (rules: { '<name>': true }) and the severity
  override case (rules: { '<name>': { severity: 'error' } }) that
  bench-virtual-rule does not. Use when a rule exists in the registry
  but the relevant nu fixtures stay nu-only because the rule is not
  enabled in the bench config, or when a rule's default severity is
  warning but the spec text it mirrors is a MUST / MUST NOT.
  Trigger keywords: enable bench rule, bench config flat rule,
  severity override bench, rule not flagging on bench, warning vs
  error in bench, escalate severity bench, wai-aria-implicit-props
  bench, bench coverage missing rule.
---

# Bench Rule Enable Skill

`tests/external/bench/config.ts` curates rules explicitly (no
`extends: ['markuplint:html-standard']`). A rule that exists in the
markuplint registry will not affect bench verdicts until it is added
to that file. This skill covers the two non-virtual-rule patterns:

- **Flat enable**: adding `'<rule-name>': true` for a rule whose
  default behaviour matches the bench's spec-conformance lens.
- **Severity override**: adding `'<rule-name>': { severity: 'error' }`
  for a rule whose default severity is `'warning'` but whose
  underlying assertion is a MUST / MUST NOT in the spec text.

For preset-defined virtual rules (`nodeRules[]` selectors), use
`bench-virtual-rule` instead.

## When to add a rule to the bench

The bench is the spec-conformance comparison surface. A rule belongs
in `bench/config.ts` only when its assertions map onto a
nu-validator capability. Use this checklist:

1. The rule is registered in `packages/@markuplint/rules/src/index.ts`.
2. The rule reports diagnostics with severity `'error'` (or you
   intend to override severity — see the next section).
3. Either:
   - nu-validator currently fires on the same markup pattern, OR
   - the spec the rule cites contains MUST / MUST NOT language and
     the discrepancy in nu's coverage is documented in
     `bench-triage`'s audit log.

If both nu and the spec are silent, do **not** enable the rule in
the bench — it would inflate `ml-only` without producing a
spec-aligned signal.

## Pattern 1: flat enable

Most new conformance rules ship as flat enable: add
`'<rule-name>': true` to `rules` in `tests/external/bench/config.ts`
(entries kept alphabetical). After editing:

```sh
yarn build --scope @markuplint/rules
yarn bench:update --target markuplint --filter '<bench fixture path>'
```

Expect the targeted fixtures to flip from `nu-only` to
`match-error`. If a fixture stays `nu-only`, the rule is not
matching that specific HTML (re-read the rule and the fixture).

## Pattern 2: severity override

A rule whose default `meta.defaultSeverity` is `'warning'` does not
contribute to bench verdicts (see `compare.ts#judgeMlState` — only
errors flip ml state). Override for the bench-only run by adding
`'<rule-name>': { severity: 'error' }` to `bench/config.ts`.

The inline comment on the override must include:

- The spec citation that justifies treating the rule as error
- A reason why the user-facing default stays at `'warning'` (so the
  next maintainer does not "harmonise" by raising the user-facing
  default unconditionally)

## Side-effect check

Severity overrides have ripple effects: fixtures that previously
were `match-clean` (both clean) may flip to `ml-only` (ml strict, nu
lax). This is **not a regression** when:

- The spec the rule cites is a MUST / MUST NOT, and
- The fixture's filename includes `-haswarn` (nu fires only a
  warning, not an error)

Confirm by inspecting
`tests/external/snapshots/diff/markuplint-only.json` after the bench
run: filter `entries[]` to those whose `ruleIds` include the rule.

Each affected fixture should be a legitimate "ml strict, nu lax"
case per the bench-triage SKILL ml-only readings. Anything else is a
real over-detection — back out the severity override.

## Verification

```sh
yarn bench:update --target markuplint
yarn bench:compare
```

Compare `tests/external/snapshots/diff/summary.md`:

- Per-category match-error count for the rule's domain should rise
- nu-only count should fall by the same amount (within nu-validator
  parallel-load flicker)
- ml-only delta should match the side-effect analysis above

Pin against `--concurrency 1` before filing for a stable verdict.
