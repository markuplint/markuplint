---
paths:
  - packages/@markuplint/vue-parser/src/**
  - packages/@markuplint/svelte-parser/src/**
  - packages/@markuplint/astro-parser/src/**
---

# component-scanner sync (vue-parser / svelte-parser / astro-parser)

- `extractComponentInfo()` in `src/component-scanner.ts` is intentionally copy-pasted across vue-parser, svelte-parser, and astro-parser (no shared module). Any fix to it must be applied to all three packages.
- The one deliberate difference: only vue-parser reports `hasSiblingRoots`, because only Vue falls attributes through to the root of a single-root template. `pretenders` decides `inheritAttrs` from it, together with `spreads` and the script it reads itself (`src/template/analyze-script.ts`), so the scanners report syntax facts (`expression` of an attribute, `spreads` of the root) and never decide what a prop is.
- After changing any `src/component-scanner.ts`, also run `npx vitest run packages/@markuplint/pretenders` — pretenders loads the scanner dynamically via the `./component-scanner` subpath export, so the parser package's own tests do not cover the integration.
