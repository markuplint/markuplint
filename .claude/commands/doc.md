---
description: Documentation policy — JSDoc-first; no code-derivable markdown
---

Maintain documentation under this repository's documentation policy. **The implementation is the absolute source of truth.**

# Documentation Policy

1. **Repository markdown must contain no WHAT or HOW that is derivable from code or scripts.** AI agents and contributors read code directly; restating it in markdown creates drift, not value. If a markdown section can be reconstructed by reading the code, delete it.
2. **WHY and non-derivable constraints live in JSDoc at the closest code.** Spec citations, invariants, intended contracts, and known limitations belong in JSDoc on the symbol they constrain. Architecture-level WHY goes in module-level JSDoc at the owning package's entry point (`src/index.ts`).
3. **JSDoc scope depends on visibility:**
   - **Public API symbols** (exported from a published package entry point — lands in `.d.ts` and IDE hover) MAY contain WHAT for end users.
   - **Internal code** JSDoc must not restate WHAT — only WHY, constraints, and non-obvious contracts.
4. **Do NOT create new `ARCHITECTURE.md`, `docs/*.md`, or similar explanatory markdown.** That content belongs in JSDoc (rule 2).
5. **Exempt — rule READMEs** (`packages/@markuplint/rules/src/*/README.md` + `README.ja.md`): these are WEBSITE SOURCE (user-facing). Both languages MUST stay in sync — updating only one is a recurring mistake; always verify.
6. **Exempt — package READMEs** (`packages/**/README.md`): npm-facing user documentation, not covered by rule 1.

# Rules

- Use the language specified in each document
- **NEVER modify the implementation** when updating documentation — do not change function bodies, type definitions, export statements, or even the ordering of declarations
- **NEVER include specific dependency version numbers** (e.g., `postcss-selector-parser 7.1.1`) — versions change frequently and cause maintenance burden. `package.json` is the source of truth. Specification versions like ARIA 1.3 are not dependencies and may be mentioned.
- If the intent of code or documentation is unclear, ask the user rather than guessing

# JSDoc

- Every exported function and type must have a JSDoc comment
- Required tags:
  - `@param` — for each parameter; type annotation may rely on TypeScript, but a description is mandatory
  - `@returns` — description of the return value is mandatory
  - `@template` — for each type parameter; include a description
- Do not add redundant type annotations that TypeScript already provides — describe purpose, semantics, and constraints

# Final Step (MANDATORY)

After all documentation changes are complete, **always run `yarn lint`** to verify formatting, spelling, and style. Fix any errors before committing.
