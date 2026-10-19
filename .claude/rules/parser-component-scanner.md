---
paths:
  - packages/@markuplint/vue-parser/src/**
  - packages/@markuplint/svelte-parser/src/**
  - packages/@markuplint/astro-parser/src/**
---

# component-scanner sync (vue-parser / svelte-parser / astro-parser)

- `extractComponentInfo()` in `src/component-scanner.ts` is intentionally copy-pasted across vue-parser, svelte-parser, and astro-parser (no shared module). Any fix to it must be applied to all three packages.
- The one deliberate difference: only vue-parser reports `hasSiblingRoots`, because only Vue falls attributes through to the root of a single-root template. `pretenders` decides `inheritAttrs` from it, together with `spreads` and the script it reads itself (`src/template/analyze-script.ts`), so the scanners report syntax facts (`expression` of an attribute, `spreads` of the root) and never decide what a prop is.
- Whether a root's name is a component's is the parser's own rule: `extractComponentInfo()` asks `parser.isComponentName()` (the override of each parser class), not a function of `@markuplint/parser-utils`. Keep it so: the three copies stay identical, and a language's rule lives in its parser class only (`@markuplint/parser-utils` names no language).
- After changing any `src/component-scanner.ts`, also run `npx vitest run packages/@markuplint/pretenders` — pretenders loads the scanner dynamically via the `./component-scanner` subpath export, so the parser package's own tests do not cover the integration.
