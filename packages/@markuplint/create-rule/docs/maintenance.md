# @markuplint/create-rule Maintenance Guide

## Overview

The `@markuplint/create-rule` package is a CLI scaffolding tool that generates boilerplate files for new markuplint rules. It supports three modes:

- **Add to project** — Creates a local plugin directory in the current project
- **Publish as package** — Scaffolds a standalone npm package
- **Contribute to core** — Adds a rule to `@markuplint/rules` within the monorepo

### File Structure

```
packages/@markuplint/create-rule/
├── bin/
│   └── create-rule.mjs       # CLI executable
├── src/
│   ├── cli.ts                 # Interactive wizard
│   ├── types.ts               # Type definitions
│   ├── create-rule-helper.ts  # Purpose-based router
│   ├── create-rule-to-project.ts
│   ├── create-rule-package.ts
│   ├── create-rule-to-core.ts
│   ├── install-scaffold.ts    # Scaffold installer
│   └── transfer.ts            # Template processing
└── scaffold/
    ├── core/                  # Core rule templates
    ├── project/               # Project plugin templates
    └── package/               # Package templates
```

## Editing Template Files

Template files live in `scaffold/{core,project,package}/`. When a user runs the CLI, these files are copied to the destination with placeholders replaced by actual values.

### Placeholder Reference

| Placeholder       | Replaced with                | Example input  | Example output |
| ----------------- | ---------------------------- | -------------- | -------------- |
| `__pluginName__`  | Plugin name (as-is)          | `my-plugin`    | `my-plugin`    |
| `__pluginName__c` | Plugin name (camelCase)      | `my-plugin`    | `myPlugin`     |
| `__ruleName__`    | Rule name (as-is)            | `no-empty-alt` | `no-empty-alt` |
| `__ruleName__c`   | Rule name (camelCase)        | `no-empty-alt` | `noEmptyAlt`   |
| `__description__` | Rule description (core only) | —              | —              |
| `__category__`    | Rule category (core only)    | —              | —              |
| `__severity__`    | Default severity (core only) | —              | —              |

### CamelCase Conversion

The `__<name>__c` suffix triggers camelCase conversion: hyphens are removed and the following letter is uppercased. For example, `__ruleName__c` with value `no-empty-alt` becomes `noEmptyAlt`. This is used for variable names in generated code.

### File Name Replacement

Template file names containing `__ruleName__` are renamed to the actual rule name. For example, `rules/__ruleName__.ts` becomes `rules/no-empty-alt.ts`.

### TypeScript-to-JavaScript Transpilation

When the user selects JavaScript, all `.ts` template files are transpiled to `.js` using the TypeScript compiler API. Keep this in mind when editing templates: the generated TypeScript must also produce valid JavaScript after transpilation.

### Prettier Formatting

All generated files are formatted with Prettier. Any `// prettier-ignore` comments in templates are automatically stripped before formatting. This means `// prettier-ignore` can be used in templates to preserve formatting of placeholder expressions that would otherwise be reformatted.

## Changing the CLI Flow

The interactive question sequence is defined in `src/cli.ts`. To add a new question:

1. Add the question using helpers from `@markuplint/cli-utils` (`input()`, `select()`, `confirm()`)
2. Add the corresponding type to `src/types.ts` (e.g., a new field on `CreateRuleCreatorParams`)
3. Pass the value through the `createRuleHelper()` call
4. Update `install-scaffold.ts` if the value needs to be passed to the `replacer` options
5. Update the relevant scaffold strategy files if the value affects their behavior

## Leveraging i18n

When writing rule implementations (whether in templates or actual rules), use the `t()` translator function from the rule context for all user-facing messages rather than hardcoded strings.

### Using the Translator

The `t()` function is available in the `verify` context of every rule:

```typescript
async verify({ document, report, t }) {
  await document.walkOn('Element', el => {
    report({
      scope: el,
      // Use t() with a sentence template and keyword arguments
      message: t('{0} is {1:c}', 'attribute', 'deprecated'),
    });
  });
}
```

The sentence templates and keywords are defined in `@markuplint/i18n`. This approach provides:

- Automatic translation to Japanese (and other supported languages)
- Consistent message formatting across all rules
- Complement form support (`:c` flag for Japanese predicate attachment)

### Adding New Keywords or Sentences

If your rule needs a keyword or sentence template that does not exist yet, add it to `@markuplint/i18n`. See the [i18n maintenance skill](../i18n/SKILL.md) for the procedure. The key points are:

1. Add the keyword to `locales/ja.json` and `$schema.json` (three-file sync rule)
2. Design sentence templates with `{0}`, `{1}` placeholders
3. Use `{0:c}` for complement forms and `{0*}` to skip translation

## Referencing Existing Rules

When creating a new rule, refer to existing implementations in `packages/@markuplint/rules/src/` for patterns and best practices.

### Recommended Examples

Simple rules to start with:

- `id-duplication` — Straightforward element traversal with duplicate detection
- `class-naming` — Attribute value checking with regex patterns

Rules with rich i18n usage:

- `deprecated-attr` — Uses complement keywords (`{0:c}`) and multiple sentence templates
- `required-attr` — Demonstrates keyword-based messages with element/attribute context

Browse the `packages/@markuplint/rules/src/` directory to find rules similar to what you are building.

## About the `fix` Callback

Auto-fix is provided as an inline `fix` callback on individual `report()` calls within `verify()`, not as a separate `RuleSeed` method. The callback receives an `IRuleFixer` helper for building `TextEdit` objects. When creating a new rule, focus on the `verify` function first. Add a `fix` callback to `report()` only if the auto-fix behavior is straightforward and well-defined.

## Command Reference

| Command                                      | Description       |
| -------------------------------------------- | ----------------- |
| `yarn test --scope @markuplint/create-rule`  | Run tests         |
| `yarn build --scope @markuplint/create-rule` | Build the package |
