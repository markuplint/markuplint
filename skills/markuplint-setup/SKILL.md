---
name: markuplint-setup
description: Set up Markuplint in a project from scratch. Detects framework, creates config, runs initial lint, and guides the user through rule adoption with Bulk Suppressions support.
disable-model-invocation: true
argument-hint: "[target-glob]"
---

# markuplint-setup

Set up Markuplint in a project from scratch.

## When to Use

- "Set up markuplint" / "Add markuplint to this project"
- "I want to lint my HTML"
- "Install markuplint"

## Steps

### 1. Check Existing Installation

- Check `package.json` for `markuplint` and `@markuplint/*` packages
- Check for config files (`.markuplintrc*`, `markuplint.config.*`)
- If already installed, tell the user and suggest `/markuplint-configure` instead

### 2. Detect Project Type

Scan the project:

- **Package manager**: check for `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`
- **Framework**: check `package.json` dependencies for `react`, `vue`, `svelte`, `astro`, `@alpinejs/csp`, etc. Also check file extensions (`.jsx`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.pug`, `.php`)
- **Monorepo**: check for `workspaces` in `package.json` or `lerna.json` / `nx.json` / `turbo.json`

### 3. Choose Preset and Packages

Use `WebFetch` to get the latest supported syntaxes and preset information:

- Presets: fetch https://markuplint.dev/docs/guides/presets
- Framework parsers: fetch https://markuplint.dev/docs/guides/beyond-html

**Use AskUserQuestion to confirm:**

1. Detected framework — is it correct?
2. Which preset to use? (recommend based on framework)

### 4. Install Packages

Install using the detected package manager. Example:

```shell
npm install -D markuplint @markuplint/jsx-parser @markuplint/react-spec
```

**Do NOT use `npx markuplint --init`** — it requires interactive terminal input.

### 5. Create Configuration File

Write `.markuplintrc` directly. Keep it minimal — only include what's needed for the detected framework.

Static HTML needs no `parser` or `specs`:

```json
{
  "extends": ["markuplint:recommended"]
}
```

Framework projects need parser and spec:

```json
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  }
}
```

Refer to https://markuplint.dev/docs/guides/beyond-html for the exact parser/spec package names and file patterns for each framework.

#### When to use JavaScript/TypeScript config

If the project uses external config plugins or shared configs that require fine-grained merging, recommend `markuplint.config.ts` (or `.js`) with spread syntax — similar to ESLint's flat config pattern:

```ts
import type { Config } from '@markuplint/ml-config';
import reactConfig from '@example/markuplint-config-react';

const config: Config = {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    'class-naming': '/^[a-z][a-z0-9-]*$/',
  },
};

export default config;
```

This gives full control over merge order and avoids the limitations of JSON `extends` (which uses a fixed merge strategy). Use JSON for simple setups; use JS/TS when composing multiple configs.

### 6. Run Initial Lint

Run Markuplint and capture the results:

```shell
npx markuplint "$ARGUMENTS" --format JSON
```

If `$ARGUMENTS` is empty, ask the user for the target glob (e.g., `"src/**/*.html"`).

Summarize:
- Total violation count
- Breakdown by rule (which rules have the most violations)
- Whether violations are concentrated in specific files/directories

### 7. Rule-by-Rule Adoption Decision

**Use AskUserQuestion for each rule that has violations.** Present rules one at a time (or batch related rules).

For each rule, explain what it checks (fetch the rule page if needed: `https://markuplint.dev/docs/rules/{rule-id}`) and offer options:

1. **Keep as error** — fix all violations now
2. **Downgrade to warning** — keep but don't block CI
3. **Bulk suppress** — record current violations, enforce only on new code
4. **Disable** — turn off the rule

**When to recommend Bulk Suppressions:**
- Many violations in legacy code that won't be touched soon
- The rule is valuable for new code

**When to recommend disabling:**
- The rule doesn't fit the project's architecture or conventions
- The rule conflicts with a template engine being used

### 8. Apply Decisions

- Update `.markuplintrc` with disabled/warning rules
- If Bulk Suppressions were chosen, run: `npx markuplint "$TARGET" --suppress`
- Tell the user to commit `markuplint-suppressions.json`

### 9. Add npm Script

Add a lint script to `package.json`:

```json
{
  "scripts": {
    "lint:html": "markuplint \"src/**/*.html\""
  }
}
```

Adjust the glob to match the project's source files and framework extensions.
