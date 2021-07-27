## Flow

-   CLI

    -   (A) Target file path list
    -   (B) Configure file path
    -   (C) Params for CLI
    -   (D) Common config (Other params)

-   API(A, B, D) -> (Z) Result
-   Reporter(Z, C) -> Stdout or File I/O

---

-   Resolve Config (F)

    -   (A[0]...A[n]) Target file path list
        -   (E) The resolved configure file path list that from each target files
            -   (E') Recursive import and merge from `extends` property
                -   (E'') Merged params
    -   (B) Configure file path
        -   (B') Recursive import and merge from `extends` property
            -   (B'') Merged params
    -   if (B'') exists
        -   return (B'')
    -   else
        -   return (E'')

-   API

    -   (A[0]...A[n]) Target file path list
        -   (F[0]...F[n])
    -   (D) Other params
    -   (G) Default Config

---

-   Merge those params (Merge #229)
    -   (A[0]) Target file
        -   (G) + (F[0]) + (D) -> (Y[0]) Merged config
    -   (A[1]) Target file
        -   (G) + (F[1]) + (D) -> (Y[1]) Merged config
    -   (A[n]) Target file
        -   (G) + (F[n]) + (D) -> (Y[n]) Merged config
-   Execution
    -   MLCore.lint(A[0], Y[0]) -> (Z[0]) Result of a target file
    -   MLCore.lint(A[1], Y[1]) -> (Z[1]) Result of a target file
    -   MLCore.lint(A[n], Y[n]) -> (Z[n]) Result of a target file
-   Return
    -   (Z) Result of all

## Params

| -                | Config FIle(F) | Common Params(D) | CLI only Params(C) | API only Params |
| ---------------- | -------------- | ---------------- | ------------------ | --------------- |
| extends          | ✓              | -                | -                  | -               |
| parser           | ✓              | ✓                | -                  | -               |
| parserOptions    | ✓              | ✓                | -                  | -               |
| specs            | ✓              | ✓                | -                  | -               |
| importRules (v2) | ✓              | ✓                | -                  | -               |
| excludeFiles     | ✓              | ✓                | -                  | -               |
| rules            | ✓              | ✓                | -                  | -               |
| nodeRules        | ✓              | ✓                | -                  | -               |
| childNodeRules   | ✓              | ✓                | -                  | -               |
| locale           | -              | ✓                | -                  | -               |
| fix              | -              | ✓                | -                  | -               |
| cache (v2)       | -              | ✓                | -                  | -               |
| cache-clear (v2) | -              | ✓                | -                  | -               |
| autoLoad         | -              | ✓                | -                  | -               |
| format           | -              | -                | ✓                  | -               |
| color            | -              | -                | ✓                  | -               |
| problem-only     | -              | -                | ✓                  | -               |
| verbose          | -              | -                | ✓                  | -               |
| init             | -              | -                | ✓                  | -               |
| help             | -              | -                | ✓                  | -               |
| version          | -              | -                | ✓                  | -               |
| workspace        | -              | -                | `process.cwd()`    | ✓               |
| defaultConfig    | -              | -                | -                  | ✓(G)            |
| watch (v2)       | -              | -                | -                  | ✓               |
| extMatch         | -              | -                | -                  | ✓               |
