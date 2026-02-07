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
- If the intent of code or documentation is unclear, ask the user rather than guessing

# JSDoc

- Every exported function and type must have a JSDoc comment
- Required tags:
  - `@param` — for each parameter; type annotation may rely on TypeScript, but a description is mandatory
  - `@returns` — description of the return value is mandatory
  - `@template` — for each type parameter; include a description
- Do not add redundant type annotations that TypeScript already provides — focus on describing the purpose and semantics
