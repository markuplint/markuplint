---
description: Run nu-html-checker compatibility benchmark
disable-model-invocation: true
---

Run the nu-html-checker compatibility test suite against markuplint and generate a report.

## Step 1: Ensure submodule is available

Check if `tests/external/validator/tests/html` exists.

- **If missing**, run:
  ```
  git submodule update --init tests/external/validator
  ```
- **If present**, optionally update to latest:
  ```
  git submodule update --remote tests/external/validator
  ```

## Step 2: Ensure build is up to date

Run `yarn build` if not already done in this session.

## Step 3: Generate the report

```
node --experimental-strip-types tests/external/nu-validator-report.ts
```

This produces `tests/external/nu-validator-report.md`.

## Step 4: Show the report

Read and display the generated `tests/external/nu-validator-report.md` to the user.

## Step 5 (optional): Run as vitest

If the user wants pass/fail CI-style output:

```
npx vitest run --config vitest.nu-validator.config.ts
```
