---
description: Update documentation commands
---

Thoroughly identify any omissions or inconsistencies in the documentation. **The implementation is the absolute source of truth.**

# Scope

- README.md is intended for API users
- ARCHITECTURE.md is intended for contributors
- JSDoc comments in source code
- Other documents should match their respective content

# Rules

- Use the language specified in each document
- **NEVER modify the implementation** — do not change function bodies, type definitions, export statements, or even the ordering of functions and type definitions
- **NEVER include specific dependency version numbers** (e.g., `postcss-selector-parser 7.1.1`) in documentation — versions change frequently and cause maintenance burden. Refer to `package.json` as the source of truth. Note: specification versions like ARIA 1.3 are not dependencies and may be mentioned.
- If the intent of code or documentation is unclear, ask the user rather than guessing

# Localized Documents (MANDATORY)

**CRITICAL: Many documents have localized variants (e.g., `README.ja.md` alongside `README.md`). You MUST update ALL localized versions when editing a document.**

Before editing any `.md` file, ALWAYS check for sibling files matching the pattern `<basename>.<lang>.md`:

```bash
# Example: when editing README.md, check for localized versions
ls README*.md
```

- If `foo.md` exists alongside `foo.ja.md`, `foo.zh.md`, etc., update **every** localized file with equivalent changes
- Each localized file must be written in its respective language (e.g., `.ja.md` in Japanese)
- Do NOT skip this step. Forgetting to update localized docs is a recurring mistake — always verify

# JSDoc

- Every exported function and type must have a JSDoc comment
- Required tags:
  - `@param` — for each parameter; type annotation may rely on TypeScript, but a description is mandatory
  - `@returns` — description of the return value is mandatory
  - `@template` — for each type parameter; include a description
- Do not add redundant type annotations that TypeScript already provides — focus on describing the purpose and semantics

# Final Step (MANDATORY)

After all documentation changes are complete, **always run `yarn lint`** to verify formatting, spelling, and style. Fix any errors before committing.
