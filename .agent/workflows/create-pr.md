---
description: Finalize feature, validate, and create a Pull Request automatically
---
## Non-Interactive Safety Rules
- **NEVER** run commands that require a password (like `sudo`). If root access is needed, output command and ask USER to run it.
- **ALWAYS** use `-y` or equivalent keys to bypass yes/no prompts.
- **ALWAYS** use `wsl -e` if WSL is detected.

1. Environment Check
   - Check if WSL is available by running `wsl --status` or `wsl --list`.
   - If successful, prepend `wsl -e` to all subsequent commands.
   - Run `wsl -e gh auth status`. If not logged in, STOP and ask user to run `wsl -e gh auth login`.

2. Quality Assurance
   - Run `npm run lint`
   - Run `npm run build`
   - If any command fails, STOP and fix the errors.

3. Visual Sanity Check
   - // turbo
   - **Safeguard**: Start the dev server with a 5-minute auto-kill timer to prevent zombie processes.
   - Run `wsl -e bash -c "npm run dev & PID=\\$!; (sleep 300 && kill \\$PID 2>/dev/null) &"`
   - Wait 10000ms (10 seconds) for the server to boot.
   - Use the `browser_subagent` to fail-safe check the app:
     - Task: "Navigate to http://localhost:3000. Verify the page loads without crashing. Return a success message if the title or key elements are visible."
   - Attempt to terminate the `npm run dev` command using the `send_command_input` tool with `Terminate: true`. The auto-kill timer acts as a fallback.

4. Commit Changes
   - Run `git add .`
   - // turbo
   - Run `git diff --cached --name-status` to see what changed.
   - Generate a concise commit message based on the changed files (e.g., "Fix <issue> and improve <feature>").
   - // turbo
   - Run `git commit -m "<generated-message>"`

5. Push and PR
   - Run `git branch --show-current` to get the branch name.
   - // turbo
   - Run `git push origin <branch-name>`
   - Attempt to create PR with GitHub CLI:
     - // turbo
     - Run `gh pr create --fill`
     - If `gh` is not installed or fails, output: "Please visit the repository URL to create the Pull Request manually."

6. Return to Base
   - // turbo
   - Run `git checkout main`
   - // turbo
   - Run `git pull origin main`
