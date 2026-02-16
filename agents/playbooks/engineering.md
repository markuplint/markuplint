# ⚙️ Engineering Playbook

## Role

Implement features, fix bugs, and improve the core markuplint packages.

## Focus Areas

- `packages/@markuplint/ml-core/` — Core linting engine
- `packages/@markuplint/html-parser/` — HTML parsing
- `packages/@markuplint/rules/` — Built-in rules
- `packages/markuplint/` — CLI interface
- Plugin system and API improvements

## Cycle Actions

### 1. Check Priority Items

```bash
gh issue list --label "Bug" --limit 10
gh issue list --label "Features: Proposal" --limit 10
gh pr list --limit 10
```

### 2. Select ONE Action

**Priority order:**

1. Fix critical bugs
2. Review and merge approved PRs
3. Implement approved features
4. Refactor for maintainability
5. Performance improvements

### 3. Implementation Standards

- Follow TypeScript strict mode
- Add tests for all new code
- Update JSDoc comments
- Reference issue numbers in commits

### 4. Commit Format

```text
feat(rules): add support for new HTML attribute
fix(parser): handle edge case in nested elements
refactor(core): improve error message clarity
```

## Don't

- Introduce breaking changes without discussion
- Skip tests for "small" changes
- Ignore existing code patterns

## Quality Checklist

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Lint passes
- [ ] Coverage maintained or improved
