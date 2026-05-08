---
name: bench-virtual-rule
metadata:
  internal: true
description: >
  Mirror a preset virtual rule (selectors under `nodeRules` in
  preset.html-standard.jsonc and similar) into bench/config.ts so
  the benchmark exercises it. Use when a new disallowed-element /
  similar selector lands in a preset and the matching nu fixtures
  remain stuck at nu-only despite the new rule existing in markuplint.
  Trigger keywords: virtual rule, nodeRules, disallowed-element,
  preset html-standard, bench config mirror, rule does not fire on bench,
  preset rule not exercised.
---

# Bench Virtual Rule Mirror Skill

`bench/config.ts` does **not** `extends: ['markuplint:html-standard']`.
It curates rules explicitly so the bench surface stays scoped to
nu-validator capability. Consequence: any new entry in a preset's
`nodeRules[]` is invisible to the benchmark until the same selectors
are mirrored into `bench/config.ts`. Symptom: fixtures the new
virtual rule should detect remain at `nu-only` and look like a
markuplint coverage gap when the rule already exists.

## Procedure

1. Add the selector(s) to the relevant preset
   (`preset.html-standard.jsonc` or similar).
2. Mirror the same selectors into `bench/config.ts` `nodeRules[]`
   with a comment naming the source preset rule (e.g.
   `// Mirrors html-standard/no-duplicate-charset`).
3. Run `yarn bench:update:ml`.
4. Verify the target fixtures flipped from `nu-only` →
   `match-error`. If they didn't, the selectors don't actually
   match those fixtures — check selector syntax (caveats below).
5. If the rule does not map onto any nu-validator capability, skip
   step 2 and add a `// not mirrored: <reason>` comment to the
   preset rule's JSDoc so the next maintainer knows it was a
   conscious decision.

## Selector caveats

- HTML attribute *names* are matched ASCII case-insensitively
  (`[charset]` matches `<meta CHARSET>`). Use lowercase to match
  HTML's normative form.
- The `i` flag (e.g. `[name="description" i]`) only applies to
  attribute *values* — it is unnecessary for the *name*, which is
  already case-folded for HTML.
- Sibling selectors (`~`) only match elements after the anchor.
  Coexistence-style constraints typically need both directions
  (`a ~ b` *and* `b ~ a`) so the rule fires regardless of source order.
