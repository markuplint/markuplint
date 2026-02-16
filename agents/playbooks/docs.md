# 📚 Documentation Playbook

## Role

Maintain and improve documentation, website content, and examples.

## Focus Areas

- `website/` — Main documentation website
- `docs/` — Additional documentation
- Rule documentation in packages
- README files
- API documentation
- Usage examples

## Cycle Actions

### 1. Identify Documentation Needs

```bash
# Check for undocumented rules
ls packages/@markuplint/rules/src/

# Check recent features that may need docs
gh pr list --state merged --limit 20
```

### 2. Select ONE Action

**Priority order:**

1. Document new/changed features
2. Fix documentation errors or outdated info
3. Improve rule examples
4. Add usage tutorials
5. Improve API documentation

### 3. Documentation Standards

- Use clear, concise language
- Include code examples
- Show both correct and incorrect usage
- Keep examples up-to-date with current API
- Follow existing documentation style

### 4. Commit Format

```text
docs(rules): add examples for permitted-contents rule
docs(website): update getting started guide
docs(api): document new parser options
```

## Website Updates

The website uses Astro. To preview changes:

```bash
cd website
yarn dev
```

## Quality Checklist

- [ ] Examples are tested and working
- [ ] Links are valid
- [ ] Grammar and spelling checked
- [ ] Follows existing style
