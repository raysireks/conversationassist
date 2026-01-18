---
description: Commit all changes, validate, and push to remote automatically
---
1. Environment Check
   - Check if WSL is available by running `wsl --status` or `wsl --list`.
   - If successful, prepend `wsl -e` to all subsequent commands (e.g., `wsl -e git add .`, `wsl -e npm run lint`).

2. Stage Changes
   - // turbo
   - Run `git add .`

3. Commit
   - // turbo
   - Run `git diff --cached --name-status` to see what changed.
   - Generate a concise commit message based on the changed files (e.g., "Update <summary of changes>").
   - // turbo
   - Run `git commit -m "<generated-message>"`

4. Quality Assurance
   - // turbo
   - Run `npm run lint`
   - // turbo
   - Run `npm run build`
   - If any command fails, STOP. Output: "Validation failed. Fix errors and try pushing again."

5. Push to Remote
   - // turbo
   - Run `git branch --show-current` to get the branch name.
   - // turbo
   - Run `git push origin <branch-name>`
