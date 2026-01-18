---
description: Start a new feature development cycle
---
1. Verify Clean State
   - Run `git status --porcelain`
   - If the output is not empty, STOP. Ask the user to commit or stash changes before starting a new feature.

2. Switch to Main and Update
   - // turbo
   - Run `git checkout main`
   - // turbo
   - Run `git pull origin main`

3. Create Feature Branch
   - Ask the user: "What is the name of the feature you want to build? (Use kebab-case, e.g., 'user-auth-fix')"
   - Construct the branch name: `feature/<user-input>`
   - Run `git checkout -b <branch-name>`

4. Ready
   - Output: "Switched to new branch '<branch-name>'. You are ready to start coding."
