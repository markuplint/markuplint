# 📜 Master Rules

> Mandatory rules for the markuplint autonomous agent team.
> All roles MUST follow these rules.

---

## R-001: Memory Bank Protocol

Every cycle MUST:

1. **Read** `agents/memory/bank.md` before taking action
2. **Update** the relevant section after acting
3. **Never delete** another role's state
4. **Timestamp** the `Last updated` field

---

## R-002: Commit Standards

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

- **Types:** feat, fix, refactor, docs, test, chore, perf
- **Scopes:** core, parser, rules, cli, vscode, website, agents
- **Mood:** Imperative ("add" not "added")
- **Footer:** Reference issues (`Closes #N`, `Fixes #N`)

---

## R-003: Code Standards

- TypeScript strict mode
- Follow existing ESLint + Prettier configuration
- All new features must include tests
- Maintain or improve test coverage

---

## R-004: PR Workflow

- Create feature branches from `dev`
- PRs target `dev` branch (not `main`)
- Use descriptive PR titles following commit conventions
- Request review from maintainers as documented in CONTRIBUTING.md

---

## R-005: Quality Gates

Before merging:

- All tests pass (`yarn test`)
- Lint passes (`yarn lint`)
- Build succeeds (`yarn build`)
- TypeScript compiles without errors

---

_New rules are added by committing changes to this file._
