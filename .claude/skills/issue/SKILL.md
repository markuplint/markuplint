---
name: issue
metadata:
  internal: true
description: >
  Analyze or create a GitHub Issue and build a TDD resolution plan. Use when
  given an Issue URL to work on, or when a problem report needs to be filed as
  an Issue first. Trigger keywords: issue, GitHub issue, file an issue, fix
  issue, resolve issue, issue triage.
disable-model-invocation: true
---

Input: $ARGUMENTS

Follow these steps in order:

## Step 1: Understand the Problem

**If a GitHub Issue URL is provided:**

1. Extract owner/repo/number from the Issue URL
2. Run `gh issue view <URL> --json number,title,body,labels,comments,assignees,state` to retrieve all Issue details
3. Proceed to **Step 2**

**If NO URL is provided (or input is empty/a keyword):**

1. Ask the user to describe the problem using AskUserQuestion or conversation:
   - What is happening? (bug, feature request, refactoring, etc.)
   - How to reproduce? (for bugs)
   - What is the expected behavior?
   - Which packages or rules are affected? (if known)
2. Gather enough context to form a clear problem statement before proceeding
3. Do NOT skip this step — do NOT guess or assume the problem
4. Proceed to **Step 1b**

## Step 1b: Register as a GitHub Issue (only when no URL was provided)

> This step runs ONLY when no Issue URL was provided in Step 1.

Based on the information gathered from the user, create a GitHub Issue.
Use the repository's existing Issue templates (`.github/ISSUE_TEMPLATE/`) as the format reference:

1. **Determine the Issue type** and match to an existing template:
   - Bug → `bug_report.md` format (label: `Bug`)
   - Feature request → `feature.md` format (label: `Features: Proposal`)
   - Spec update → `update_specs.md` format (label: `Specs`)
2. **Fetch available labels** to avoid typos:
   ```bash
   gh label list --limit 50
   ```
3. **Verify referenced paths and libraries exist** (check paths with `ls`, packages with `npm view`) before putting them in the Issue body
4. **Draft the Issue content** following the matched template's structure — read the template file itself for the section layout
5. **Show the draft to the user** and ask for confirmation before creating
6. **Create the Issue**:
   ```bash
   gh issue create --title "<title>" --body "<body>" --label "<label>"
   ```
7. **Capture the Issue number and URL** from the output for use in subsequent steps
8. From this point forward, treat the newly created Issue the same as if it had been provided via URL

## Step 2: Ensure You Are in a Worktree

**CRITICAL: NEVER work in the main working directory.**

Branch work happens in a Claude Code–managed worktree (see the Branch & Worktree Policy in the root `CLAUDE.md`). If this session is not already in one, set one up via the harness worktree feature before touching any file. Branch name: `issue/<number>-<slug>` (slug from title, lowercase, hyphens, max 50 chars — the Issue number is always available at this point). Remember the fresh-worktree setup: `yarn install`, then `NX_WORKSPACE_ROOT_PATH=<worktree-absolute-path> yarn build`.

## Step 3: Analyze the Problem

Read through the Issue body and comments carefully, then organize the following:

1. **Summary**: What is happening / what is being requested
2. **Reproduction**: For bugs, reproduction steps and environment
3. **Related Code**: Identify files, functions, and rules mentioned in the Issue and explore the codebase
4. **Impact Scope**: Packages and features potentially affected by the fix

## Step 4: Propose a Resolution Plan

Based on the analysis, present a resolution plan following **TDD (Test-Driven Development)**:

1. **Approach**: The chosen solution and rationale
2. **Files to Change**: List of files to modify or add
3. **Implementation Steps**: Follow the **Red-Green** cycle for each behavior unit:
   1. **Red**: Write failing tests first that define the expected behavior — as spec-file tests, never as throwaway reproduction scripts
   2. **Green**: Implement the minimal code to make the tests pass
4. **Risks**: Side effects and caveats

Present the plan to the user and wait for approval.

## Step 5: Hand Off to /impl

Once the plan is approved, continue with the `impl` skill — it owns the implementation pipeline (implement → review → QA → lint/test → commit → PR). Do not re-negotiate the agreed scope there.
