---
description: Git manipulation rules
---

# Commit creation

- When asked to "commit":
  - **CRITICAL: ALWAYS start by checking `git status` to see current state**
  - **CRITICAL: NEVER trust previous state or memory - always verify current staging area**
  1. If files are already staged:
     - **CRITICAL: NEVER use `git add` or `git restore` when staged files exist**
     - **CRITICAL: NEVER modify the staging area in any way**
     - Check staged files using `git diff --staged` and create a commit message using _only_ the staged files
     - Execute `git commit` directly with the message (user will approve as appropriate)
     - The user has already prepared the staging area - respect their decision completely
  2. If no files are staged:
     - Check the differences using `git status`
     - Stage files sequentially based on the following commit granularity before committing:
       - Separate commits by package
       - Commit dependencies first (if dependency order is unclear, check using `npx lerna list --graph`)
- **AFTER EACH COMMIT:**
  - **CRITICAL: DO NOT automatically proceed to the next commit**
  - **CRITICAL: DO NOT make assumptions about what to do next**
  - **CRITICAL: DO NOT trust your memory of previous state**
  - Stop and check the current state using `git status` and `git diff`
  - Return to the beginning of this decision process (check if files are staged or not)
  - Wait for user confirmation or new instructions before proceeding
- If the OS, application settings, or context suggest a language other than English is being used, provide a translation and explanation of the commit message in that language immediately before executing the commit command.

# Commit message format

- You must write in English
- You must use the imperative mood
- You must use conventional commits
  - You must use the following types:
    - `feat`
    - `fix`
    - `docs`
    - `refactor`
    - `test`
    - `chore`
  - You must use the following scopes:
    - Each package name (without namespace)
    - `repo`
    - `deps`
    - `github`
- The message body's lines must not be longer than 100 characters
- The subject must not be sentence-case, start-case, pascal-case, upper-case

# Commit message safety guidelines

- For breaking changes or complex commit messages, ALWAYS use heredoc format (see below)
- For simple, single-line commits, use single quotes (')
- NEVER use multiple -m flags for breaking changes (causes commitlint parse errors)

## Heredoc Format (REQUIRED for Breaking Changes)

Use heredoc with command substitution to pass multi-line commit messages. This ensures:

- Special characters (like exclamation marks) are preserved correctly
- Multi-line messages are properly formatted
- commitlint can parse the message correctly

**Format:**

```bash
git commit -m "$(cat <<'EOF'
type(scope)!: subject line

BREAKING CHANGE: Rename all compiler-related types and functions

Type renames:
- OldName -> NewName
- Another -> Change
EOF
)"
```

**Important notes:**

- Use `<<'EOF'` (with quotes) to prevent variable expansion
- Close with `)` after `EOF` to complete command substitution
- Do NOT use multiple `-m` flags for breaking changes
- The entire message must be wrapped in `"$(cat <<'EOF' ... EOF)"`

## Simple Commits (Non-Breaking)

For simple, single-line commits without breaking changes:

```bash
git commit -m 'type(scope): subject line'
```

For multi-line non-breaking commits, use heredoc format as well to ensure proper formatting
