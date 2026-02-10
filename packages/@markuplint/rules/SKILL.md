---
description: Perform maintenance tasks for @markuplint/rules
---

# rules-maintenance

Maintain rule test suites, especially when `@markuplint/html-spec` changes.

## Input

`$ARGUMENTS` specifies the task:

| Task                              | Description                           |
| --------------------------------- | ------------------------------------- |
| `add-spec-tests <rule> <element>` | Add tests after a spec change         |
| `update-test-expectations`        | Fix tests broken by spec data changes |

## Task: add-spec-tests

### Which test file?

| Spec change                         | Test file                              |
| ----------------------------------- | -------------------------------------- |
| ARIA (implicitRole, permittedRoles) | `src/wai-aria/index.spec.ts`           |
| Attributes (new/changed/enum)       | `src/invalid-attr/index.spec.ts`       |
| Content model                       | `src/permitted-contents/index.spec.ts` |

### Test Pattern

```typescript
import { mlRuleTest } from 'markuplint';
import rule from './index.js';

// Valid case — no violations
const { violations } = await mlRuleTest(rule, '<img src="x.png" alt="desc" role="math">');
expect(violations).toStrictEqual([]);

// Invalid case — exact violation object
const { violations } = await mlRuleTest(rule, '<img src="x.png" alt="desc" role="navigation">');
expect(violations).toStrictEqual([
  {
    severity: 'error',
    line: 1,
    col: 38,
    message: 'Cannot overwrite the "navigation" role to the "img" element according to ARIA in HTML specification',
    raw: 'navigation',
  },
]);

// ARIA version test
const { violations } = await mlRuleTest(rule, '<button role="separator" ...>', {
  rule: { options: { version: '1.1' } },
});
```

### Conventions

- `toStrictEqual` with exact `{ severity, line, col, message, raw }` — **never** loose assertions
- Always include both valid and invalid cases
- Some roles need ARIA attributes in HTML: `separator` → `aria-valuenow`, `meter` → `aria-valuenow`

## Task: update-test-expectations

When `html-spec` data changes break existing tests:

1. Run `yarn test` to find failures
2. Verify the new behavior is correct (not a regression)
3. Update expected violation objects (message strings, etc.)
4. Common cause: adding enum values changes error message strings

## Rules

1. **Always run `yarn test` (full suite)**, not just the rules package
2. **Use `toStrictEqual` with exact objects** — no loose assertions
3. **Check `ml-spec` algorithm tests** when changing ARIA mappings —
   `ml-spec/src/algorithm/aria/get-permitted-roles-spec.spec.ts` has hardcoded role arrays
