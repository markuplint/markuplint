---
sidebar_position: 6
title: 'Spec data and types'
---

# Spec data and types

The types and the fields that v5 marked `@deprecated` (`Removed in v6.`) are removed, together with a few that were kept for compatibility. `@markuplint/html-spec` no longer carries them: its data has no prose of the specifications and no content category of an element.

This is not a change for a config, apart from the `NodeRule` fields below. The spec data structures are not part of the public API of `@markuplint/ml-spec`, but they affect code that reads the spec through `@markuplint/ml-spec` or `@markuplint/html-spec`, the authors of an extended spec (`ExtendedSpec`, for example a `*-spec` package), and the code that calls the APIs that are listed here.

A key that is removed from a spec and still written in a JSON or JavaScript object is ignored when the spec is read: nothing fails at run time, and TypeScript reports it where the object is typed.

## Spec fields {#spec-fields}

| v5                                                                                                        | v6                                                                      |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `cites` of `MLMLSpec`, `ExtendedSpec` and the default export of `@markuplint/html-spec`, the `Cites` type | Removed. `schemaToSpec()` no longer reads the `cites` of an extension.  |
| `categories` of `ElementSpec`                                                                             | Removed. The categories that the rules use are `def['#contentModels']`. |
| `omission` of `ElementSpec`                                                                               | Removed.                                                                |
| `description` of `ElementSpec`, `Attribute` and `ARIARoleInSchema`                                        | Removed.                                                                |
| `valueDescriptions` of `ARIAProperty`                                                                     | Removed.                                                                |

- `getAttrSpecs()` no longer returns `description: ''` on an attribute.
- `@markuplint/vue-spec` and `@markuplint/alpine-spec` no longer set the `description` of an attribute.
- `schemaToSpec()` no longer merges the `categories` of an element: the `categories` of an extension replaces the one of the base spec, as any other key of an element spec does.
- The generator of `@markuplint/html-spec` still reads the text of the W3C documents, which it keeps in a type of its own, and drops it before it writes `index.json`.

## ARIA role fields {#aria-roles}

The names that ARIA 1.2 used for two fields of a role are removed, and the names of ARIA 1.3 are the only ones. `index.json` is written with them.

| v5                      | v6                                |
| ----------------------- | --------------------------------- |
| `requiredContextRole`   | `requiredAccessibilityParentRole` |
| `requiredOwnedElements` | `allowedAccessibilityChildRoles`  |

This applies to `ARIARole` of `@markuplint/ml-spec` and to the roles of `def['#aria']` in an extended spec:

```json title="v5"
{ "name": "x-item", "requiredContextRole": ["list"], "requiredOwnedElements": ["listitem"] }
```

```json title="v6"
{ "name": "x-item", "requiredAccessibilityParentRole": ["list"], "allowedAccessibilityChildRoles": ["listitem"] }
```

An extended spec that still writes the old names is not read for them: the role is taken as one that has no required parent and no required owned element, and `require-parent-role` and `require-owned-elements` do not check it.

## Attribute type names {#attribute-types}

| v5                             | v6                             |
| ------------------------------ | ------------------------------ |
| `BrowsingContextName`          | `NavigableTargetName`          |
| `BrowsingContextNameOrKeyword` | `NavigableTargetNameOrKeyword` |

The HTML Standard renamed the valid browsing context name to the valid navigable target name, and the check is the same. The removed names are no longer in the type schema of `@markuplint/types`, and a value is not checked against a name that is not a type: it matches.

## Custom CSS syntax {#custom-css-syntax}

`CustomCssSyntax` of `@markuplint/types` no longer has `syntax.ebnf` and `syntax.properties`.

- A definition that had `ebnf` made every value match, because it was never implemented. Its values are now checked by `syntax.def`.
- `properties` registered a property, which `apply` named as `<'my-prop'>`. Define it as a type in `syntax.def` and apply it as `<my-prop>`:

```ts title="v5"
{
	ref: 'https://example.com/',
	syntax: {
		apply: "<'my-prop'>",
		def: {},
		properties: { 'my-prop': 'a | b' },
	},
}
```

```ts title="v6"
{
	ref: 'https://example.com/',
	syntax: {
		apply: '<my-prop>',
		def: { 'my-prop': 'a | b' },
	},
}
```

## Config types {#config-types}

`categories`, `roles` and `obsolete` of `NodeRule` (`@markuplint/ml-config`, and the `NodeRule` of `markuplint/testing-tool`) are removed. Nothing read them: a `nodeRules` entry is matched by `selector` or `regexSelector`. Delete them from the entry and use `selector` or `regexSelector`.

A config that still has them is not an error at run time: the keys are ignored, as they were. `config.schema.json` does not list them, so an editor that validates the config reports them.

## ARIA version of a rule {#aria-version}

The rules that check WAI-ARIA (the successors of the v4 `wai-aria` rule, see [ARIA](/docs/migration/v4-to-v5/aria#aria-version)) no longer read `options.version`. The v5 guide says that the option is dropped and the schema of the rules does not list it, but the rules still read it when a config set it.

```json title="v5"
{ "rules": { "no-redundant-role": { "value": true, "options": { "version": "1.1" } } } }
```

```json title="v6"
{ "ruleCommonSettings": { "ariaVersion": "1.1" }, "rules": { "no-redundant-role": true } }
```

A config that still has `options.version` is not an error: the option is ignored, and the rule checks against `ruleCommonSettings.ariaVersion`, or the recommended version when there is none.

## `@markuplint/file-resolver` {#file-resolver}

- `ConfigProvider#recursiveLoad()` no longer has the overload with the `depth` argument, which was ignored. Remove the argument.
- `hasResolvableCollision()` is removed. It has no replacement: `disambiguatePretendersForFile()` decides by itself whether there is anything to resolve.
