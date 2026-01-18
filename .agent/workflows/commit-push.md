---
description: Commit all changes, validate, and push to remote automatically
---
1. Stage Changes
   - // turbo
   - Run `git add .`

2. Commit
   - // turbo
   - Run `git diff --cached --name-status` to see what changed.
   - Generate a concise commit message based on the changed files (e.g., "Update <summary of changes>").
   - // turbo
   - Run `git commit -m "<generated-message>"`

3. Quality Assurance
   - // turbo
   - Run `npm run lint`
   - // turbo
   - Run `npm run build`
   - If any command fails, STOP. Output: "Validation failed. Fix errors and try pushing again."

4. Push to Remote
   - // turbo
   - Run `git branch --show-current` to get the branch name.
   - // turbo
   - Run `git push origin <branch-name>`
