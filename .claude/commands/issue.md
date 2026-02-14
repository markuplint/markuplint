---
description: Analyze a GitHub Issue and create a resolution plan
---

You are given a GitHub Issue URL as input: $ARGUMENTS

Follow these steps in order:

## Step 1: Fetch Issue Information

1. Extract owner/repo/number from the Issue URL
2. Run `gh issue view <URL> --json number,title,body,labels,comments,assignees,state` to retrieve all Issue details

## Step 2: Create a Worktree

1. Generate a slug from the Issue title (lowercase, spaces to hyphens, alphanumeric and hyphens only, strip leading/trailing hyphens, truncate to 50 chars)
2. Branch name: `issue/<number>-<slug>`
3. Worktree path: `../<branch name with slashes replaced by hyphens>` (under the parent directory of the current repository)
4. Execute:
   ```bash
   git worktree add ../<worktree-dir> -b issue/<number>-<slug> dev
   cd ../<worktree-dir>
   yarn install && yarn build
   ```

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
