---
description: Finalize feature, validate, and create a Pull Request
---
1. Environment Check
   - Check if WSL is available by running `wsl --status` or `wsl --list`.
   - If successful, prepend `wsl -e` to all subsequent commands (e.g., `wsl -e npm run build`, `wsl -e gh pr create`).

2. Quality Assurance
   - Run `npm run lint`
   - Run `npm run build`
   - If any command fails, STOP and fix the errors.

3. Visual Sanity Check
   - // turbo
   - Run `npm run dev` (This will start the server in the background. Note the Command ID.)
   - Wait 10000ms (10 seconds) for the server to boot.
   - Use the `browser_subagent` to fail-safe check the app:
     - Task: "Navigate to http://localhost:3000. Verify the page loads without crashing. Return a success message if the title or key elements are visible."
   - Terminate the `npm run dev` command using the `send_command_input` tool with `Terminate: true` on the Command ID from step 3a.

4. Commit Changes
   - Run `git status` to see changes.
   - Run `git add .`
   - Ask the user for a commit message.
   - Run `git commit -m "<user-message>"`

5. Push and PR
   - Run `git branch --show-current` to get the branch name.
   - Run `git push origin <branch-name>`
   - Attempt to create PR with GitHub CLI:
     - Run `gh pr create --fill`
     - If `gh` is not installed or fails, output: "Please visit the repository URL to create the Pull Request manually."

6. Return to Base
   - // turbo
   - Run `git checkout main`
   - // turbo
   - Run `git pull origin main`
