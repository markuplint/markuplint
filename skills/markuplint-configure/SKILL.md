---
name: markuplint-configure
description: Add, remove, or adjust Markuplint rules for specific files or elements. Analyzes violations, proposes scope-appropriate configuration changes, and confirms with the user.
disable-model-invocation: true
argument-hint: "[file:line or rule-name]"
---

# markuplint-configure

Add, remove, or adjust Markuplint rules.

## When to Use

- "Add a rule for ..." / "Enable the ... rule"
- "Disable this warning" / "Ignore this error"
- "Configure markuplint for this file"
- "This markuplint warning is wrong"
- "Apply ... rule only to this section"
- User points to a specific file/line and asks about a Markuplint violation

## Steps

### 1. Understand the Context

**Determine the documentation site based on the installed markuplint version:**

```shell
npx markuplint --version
```

- If the version contains `alpha`, `beta`, or `rc` (e.g., `5.0.0-alpha.1`) → use `https://next.markuplint.dev` as the doc base
- Otherwise (stable release) → use `https://markuplint.dev` as the doc base

Use the determined doc base for all documentation URLs in subsequent steps.

If `$ARGUMENTS` contains a file path or line reference, read that file first.

Run Markuplint on the target to see current violations:

```shell
npx markuplint "path/to/file.html" --format JSON
```

If no specific file, run on the project and summarize.

### 2. Identify What the User Wants

Determine the intent:

- **Add a rule** — enable a new rule or change its value
- **Disable a rule** — turn off a rule globally or for specific elements
- **Adjust scope** — change where a rule applies

If unclear, **use AskUserQuestion** to clarify.

### 3. Determine the Scope

**Use AskUserQuestion to confirm the intended scope.**

| User intent | Scope | Where to configure |
| --- | --- | --- |
| "I don't want this rule anywhere" | Project-wide | `rules` in config |
| "I don't want this in certain files" | File-level | `excludeFiles` or `overrides` |
| "I don't want this on specific elements" | Element-level | `nodeRules` or `childNodeRules` |

**Important distinction for file-level scope — ask the user:**

- **`excludeFiles`**: Markuplint completely ignores the file. VS Code extension won't show warnings either. Use when the file should never be linted.
- **`overrides`** with `overrideMode: "merge"`: Markuplint still processes the file but with different rules. VS Code shows remaining warnings. Use when you want partial coverage.
- **npm script glob**: Only affects CLI/CI runs. VS Code still lints everything. Use when VS Code warnings are acceptable but CI should skip certain files.

### 4. Determine Element-Level Configuration

If the scope is element-level, choose between:

- **`nodeRules`** — applies to the matched element itself
- **`childNodeRules`** — applies to children of the matched element. Add `"inheritance": true` to affect all descendants, not just direct children.

The AI agent should propose a CSS selector based on the code context. Use the element's class, ID, tag name, or attributes to build the selector.

For rule details, fetch the rule's documentation:
`{doc-base}/docs/rules/{rule-id}` (where `{doc-base}` is determined in Step 1)

### 5. Propose the Change

Show the user the exact configuration change before applying.

**Always explain:**
- What the change does
- What the trade-off is
- If there's a better alternative

Example proposals:

#### Disable a named rule from a preset

```json
{
  "rules": {
    "a11y/specific-rule": false
  }
}
```

#### Element-specific rule with nodeRules

```json
{
  "nodeRules": [
    {
      "selector": ".legacy-component",
      "rules": {
        "class-naming": false
      }
    }
  ]
}
```

#### Descendants of a section with childNodeRules

```json
{
  "childNodeRules": [
    {
      "selector": ".legacy-section",
      "inheritance": true,
      "rules": {
        "wai-aria": false
      }
    }
  ]
}
```

#### File-level exclusion

```json
{
  "excludeFiles": ["./src/legacy/**/*"]
}
```

#### File-level override

```json
{
  "overrideMode": "merge",
  "overrides": {
    "./src/legacy/**/*": {
      "rules": {
        "character-reference": false
      }
    }
  }
}
```

### 6. Confirm with AskUserQuestion

**Never modify the config file without user confirmation.**

### 7. Apply and Verify

1. Update `.markuplintrc` using `Edit` tool
2. Run lint again on the same target
3. Report the before/after violation count to confirm the change worked

## Quick Reference: Common Configurations

These are frequently requested. Propose them directly when relevant:

### OGP (Open Graph Protocol)

```json
{
  "nodeRules": [
    {
      "selector": "meta[property]",
      "rules": {
        "invalid-attr": {
          "options": {
            "allowAttrs": ["property"]
          }
        }
      }
    }
  ]
}
```

### Allow custom data attributes

```json
{
  "rules": {
    "invalid-attr": {
      "options": {
        "allowAttrs": ["data-testid"]
      }
    }
  }
}
```

### Selector tips

- Ancestor matching: use `:is(nav *)` (NOT `:closest()` — it is deprecated)
- For selector syntax details: `{doc-base}/docs/guides/selectors`
- For all config properties: `{doc-base}/docs/configuration/properties`
