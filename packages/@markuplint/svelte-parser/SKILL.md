---
description: Cross-package constraints for @markuplint/svelte-parser
globs:
  - packages/@markuplint/svelte-parser/src/**/*.ts
alwaysApply: false
---

# svelte-parser constraints

- `extractComponentInfo()` in `src/component-scanner.ts` is intentionally copy-pasted across vue-parser, svelte-parser, and astro-parser (no shared module). Any fix to it must be applied to all three.
- After changing `src/component-scanner.ts`, also run `npx vitest run packages/@markuplint/pretenders` — pretenders loads the scanner dynamically via the `/component-scanner` subpath export, so this package's own tests do not cover the integration.
