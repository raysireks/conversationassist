# Git Workflow Rules

- **Never perform work on the `main` or `master` branches.** All development must happen on feature, bugfix, or release branches.
- **Ensure 100% certainty of context.** Before starting any task, verify the specific feature, bug, or release you are working on.
- **Check for Git Worktrees.** Always check if there is an open git worktree sibling for the current feature/branch. 
- **Use the correct Working Directory.** If a worktree exists for the feature, you must use that directory as your `$CWD`. 
- **Confirmation.** At the start of a session or when switching contexts, explicitly state the current directory you are using and ask the user to confirm it is correct. Once confirmed for the session, you do not need to ask again unless the directory changes.
