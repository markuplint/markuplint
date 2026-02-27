---
name: migrate4-5
description: Guides you through migrating markuplint configuration from v4 to v5. Detects current versions, reviews the migration guide, interactively confirms breaking changes and new rules with the user, updates config files and tests. For Claude Code.
---

# migrate4-5

Guides you through migrating markuplint configuration from v4 to v5.

## When to Use

Use this skill when the user requests any of the following:

- "Upgrade markuplint to v5"
- "Migrate markuplint from v4 to v5"
- "Update markuplint version"
- "markuplint migration"

## Steps

### 1. Detect Current Versions

- Detect the current versions of markuplint-related packages (`markuplint`, `@markuplint/*`) from `package.json` and list them
- Locate and review configuration files (`.markuplintrc`, `.markuplintrc.json`, `markuplint.config.js`, etc.)

### 2. Review the Migration Guide

- Use WebFetch to retrieve https://markuplint.dev/docs/migration/ or https://next.markuplint.dev/docs/migration/ and review breaking changes between the versions
- Check the version-specific migration guide (e.g., v4-to-v5) if available
- Pay special attention to Named Rule Group changes
- Identify newly added rules and list those not included in the recommended preset
- Inspect source code and preset definitions in `node_modules/markuplint` for accurate information

### 3. Confirm with the User (use AskUserQuestion extensively)

**Important: Always use AskUserQuestion at each decision point. Never make decisions without user confirmation.**
**AskUserQuestion supports up to 4 questions at once. Batch related questions for efficiency.**
**For rules that require configuration values, always confirm the specific values (whether `true` suffices or custom values are needed).**

#### Phase 1: Handling Breaking Changes

- Confirm the approach for each breaking change (adopt latest behavior vs. preserve legacy behavior)
- If ARIA version changes exist, confirm the approach
- Confirm the update scope of related parsers/plugins (e.g., `@markuplint/pug-parser`)
- Discuss alternatives for removed/deprecated features

#### Phase 2: Adopting New Rules

- Present the list of rules not included in the recommended preset and confirm whether to adopt each
- Provide explanations and benefits for each rule to help the user decide
- All rules may be presented as options at once

#### Phase 3: Rule Configuration Values (for each rule adopted in Phase 2)

- **Always confirm whether `true` is sufficient or custom configuration is needed**
- Rules like `attr-order` significantly change behavior based on their configuration values — have the user specify the exact attribute order
- For rules depending on external configuration (e.g., browserslist), explain this and verify the project's setup
- After receiving answers, repeat them back to confirm mutual understanding

### 4. Update Dependency Versions

- Update markuplint-related package versions in `package.json`
- Run the package manager to update dependencies
- **Ensure parser versions match the markuplint core version** (e.g., `@markuplint/pug-parser` should be the same version)

### 5. Update Configuration Files

Update configuration files based on the user's responses. Key areas:

- Preset name changes
- `overrideMode` behavior changes
- `nodeRules` / `childNodeRules` selector and format changes
- Conversion to Named Rule Groups (see reference below)
- `parser` configuration format changes
- Addition of new rules

### 6. Update Tests

- Run markuplint and review the output for each test case
- Include `ruleId` and Named Rule Group names in test output format
- Update fixture files to comply with new rules (especially attr-order)
- **Changing attribute order affects column numbers** — update expected values in related tests accordingly
- Ensure all tests pass

### 7. Commit

Split commits by package and change type:

1. `feat(markuplint)!: upgrade markuplint to vX.X.X` — package.json + lockfile
2. `test(markuplint): update test expectations` — test expectation updates
3. `feat(markuplint): convert rules to new format` — configuration file changes
4. `test(markuplint): add tests for new rules` — tests for new rules

## Reference: Named Rule Groups

In versions that support Named Rule Groups, adding a `name` property to `nodeRules` entries creates a Named Rule Group. The `name` serves as a reference key from the `rules` section and is displayed as `[name]` in violation messages.

### Pattern 1: Add name to nodeRules

```js
// Before
nodeRules: [
  {
    selector: 'img',
    rules: {
      'required-attr': { value: 'alt', reason: '...' },
    },
  },
]

// After
nodeRules: [
  {
    name: 'my-project/img-require-alt',  // added
    selector: 'img',
    rules: {
      'required-attr': { value: 'alt', reason: '...' },
    },
  },
]
```

### Pattern 2: Convert rules to Named Rule Groups

```js
// Before — defined directly in rules section
rules: {
  'disallowed-element': {
    value: ['br'],
    reason: '...',
  },
}

// After — nested as Named Rule Group
rules: {
  'my-project/no-br': {
    rules: {
      'disallowed-element': {
        value: ['br'],
        reason: '...',
      },
    },
  },
}
```

Named Rule Groups defined in presets can be individually controlled in the `rules` section:

```js
rules: {
  'performance/img-aspect-ratio': false,                    // disable entirely
  'a11y/require-accessible-name': { severity: 'warning' },  // change severity
}
```

## Reference: attr-order Rule

- Attributes are ordered according to the specified array
- `{ group: 'aria' }` groups `aria-*` attributes together
- `{ group: 'data' }` groups `data-*` attributes together
- Attributes not in the array are placed after the specified groups in alphabetical order
- **Existing fixture attribute order may need to be changed**
- Changing attribute order shifts column numbers, so expected values in other rule tests may also need updating

## Reference: Test Output Format

Violation messages for rules with Named Rule Groups include the group name. To verify in tests:

```js
const formatted = violations.map(
  (v) =>
    `${n(v.filePath)}:${v.line}:${v.col} ${v.message} (${v.ruleId})${v.name ? ` [${v.name}]` : ''}`,
);
```

Example output:

- `file.html:9:9 ... (permitted-contents) [html-standard/permitted-contents]`
- `file.html:26:3 ... (disallowed-element) [my-project/no-br]`

## Reference: `-c` Flag Behavior

In some versions, the `-c` flag completely replaces the project's configuration file with the specified configuration. When using `-c` in tests, be aware that only the specified configuration may be applied.

## Reference: no-unsupported-features

- A rule that detects browser-unsupported elements and attributes based on browserslist configuration
- Becomes a no-op in projects without browserslist configuration
