# 🏭 Agent Dispatch Protocol

You are orchestrating the autonomous development team for **markuplint**.

**Repo root:** This file lives at `agents/DISPATCH.md` in the markuplint monorepo.

---

## Heartbeat Cycle (execute in order)

### Phase 1: Context Load

Read these files before acting:

- `agents/roster.json` → roles and rotation order
- `agents/memory/bank.md` → shared memory (READ + UPDATE every cycle)
- `agents/rules/RULES.md` → mandatory rules
- `agents/playbooks/<your-role>.md` → your playbook
- `agents/state/rotation.json` → current rotation state

### Phase 2: Situational Awareness

```bash
gh issue list --limit 50
gh pr list --limit 20
```

Cross-reference with memory bank:

- What's changed since last cycle?
- What's the highest-impact action for your role?
- Are there blockers or dependencies?

### Phase 3: Execute

1. Pick **ONE** action from your role's playbook
2. Execute it via GitHub (create issue, write code + PR, add docs, comment)
3. All work branches from `dev`, PRs target `dev`

### Phase 4: Memory Update

Update `agents/memory/bank.md`:

- `Current Status` → what changed
- `Role State` → your role's section
- `Active Threads` → if dependencies changed
- `Lessons Learned` → if something noteworthy happened

### Phase 5: Complete

```bash
git add .
git commit -m "chore(agents): cycle N — <role emoji> <brief action>"
git push origin dev
```

---

## Monorepo Context

This is a Yarn workspaces monorepo for an HTML linter:

- `packages/@markuplint/` — Core packages (html-parser, rules, ml-spec, etc.)
- `packages/markuplint/` — Main CLI package
- `vscode/` — VS Code extension
- `website/` — Documentation website
- `docs/` — Additional documentation
- `test/` — Integration tests

## Rotation

Order: Engineering → QA → Docs

Check your position in `agents/state/rotation.json`.

## Rules Summary

- **Commits:** Conventional commits (`<type>(<scope>): <description>`)
- **Branches:** Feature branches, PR to `dev`
- **Memory:** Read before acting, update after acting
- **Quality:** TypeScript strict mode, tests required

## State Files

```
agents/
├── DISPATCH.md              ← You are here
├── roster.json              ← Team composition
├── state/
│   └── rotation.json        ← Current rotation state
├── memory/
│   └── bank.md              ← Shared memory
├── rules/
│   └── RULES.md             ← Mandatory rules
└── playbooks/
    ├── engineering.md
    ├── qa.md
    └── docs.md
```
