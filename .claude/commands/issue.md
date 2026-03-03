---
description: Analyze a GitHub Issue and create a resolution plan
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

## Step 1b: Register as a GitHub Issue (URL なしの場合のみ)

> This step runs ONLY when no Issue URL was provided in Step 1.

Based on the information gathered from the user, create a GitHub Issue:

1. **Draft the Issue content**:
   - Title: concise summary (e.g., `Bug: <description>` or `Feature: <description>`)
   - Body: structured with the following sections:
     ```
     ## Summary
     <problem statement>

     ## Reproduction (if bug)
     <steps to reproduce>

     ## Expected Behavior
     <what should happen>

     ## Affected Packages
     <list of packages/rules if known>
     ```
   - Labels: assign appropriate labels (`bug`, `enhancement`, etc.) if known
2. **Show the draft to the user** and ask for confirmation before creating
3. **Create the Issue**:
   ```bash
   gh issue create --title "<title>" --body "<body>" [--label "<label>"]
   ```
4. **Capture the Issue number and URL** from the output for use in subsequent steps
5. From this point forward, treat the newly created Issue the same as if it had been provided via URL

## Step 2: Create a Worktree

**CRITICAL: ALWAYS create a worktree. NEVER work in the main directory.**

1. Generate a branch name: `issue/<number>-<slug>` (slug from title, lowercase, hyphens, max 50 chars)
   - The Issue number is always available at this point (either from the URL or from Step 1b)
2. Check for existing worktrees: `git wt`
   - If a worktree for this branch already exists, use it
3. Worktree path: `../markuplint-wt/<branch-name>` (automatically determined by `wt.basedir`)
4. Execute:
   ```bash
   git wt <branch-name> dev
   cd ../markuplint-wt/<branch-name>
   ```
   `wt.hook` により `yarn install` → `yarn build` が自動実行される
5. **All subsequent work (analysis, edits, commits) MUST happen in the worktree**

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
   1. **Red**: Write failing tests first that define the expected behavior
   2. **Green**: Implement the minimal code to make the tests pass
4. **Risks**: Side effects and caveats

Present the plan to the user and wait for approval before proceeding with implementation.
