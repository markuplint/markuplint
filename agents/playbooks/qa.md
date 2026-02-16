# 🔍 QA Playbook

## Role

Ensure quality through testing, coverage improvement, and bug discovery.

## Focus Areas

- Test coverage across all packages
- Edge case identification
- Regression testing
- Integration tests in `test/`
- Rule testing accuracy

## Cycle Actions

### 1. Coverage Analysis

```bash
yarn test --coverage
```

Identify packages or rules with low coverage.

### 2. Select ONE Action

**Priority order:**

1. Add tests for uncovered code paths
2. Fix flaky tests
3. Add integration tests for new features
4. Test edge cases for parsers
5. Verify rule accuracy with real-world examples

### 3. Test Standards

- Use Vitest for unit tests
- Test both valid and invalid cases for rules
- Include edge cases (empty input, malformed HTML, etc.)
- Test all supported markup languages when applicable

### 4. Commit Format

```text
test(rules): add coverage for attr-value-quotes edge cases
test(parser): verify handling of self-closing tags
fix(test): resolve flaky async test in ml-core
```

## Bug Reporting

When finding bugs:

1. Check if issue already exists
2. Create minimal reproduction
3. File issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Version info

## Quality Checklist

- [ ] Tests are deterministic (not flaky)
- [ ] Edge cases are covered
- [ ] Both success and failure paths tested
- [ ] Test names are descriptive
