---
description: Start a new feature development cycle using git worktree
---
## Git Worktree Workflow Rules
- **NEVER** work on the `main` or `master` branches.
- **ALWAYS** use `git worktree` for new features.
- **ALWAYS** confirm the `$CWD` with the user before starting work in a new worktree.
- **ALWAYS** use WSL for git operations.

1. Environment Check
   - Verify WSL is available. All commands below should be run via `wsl`.

2. Verify Clean State
   - Run `wsl git status --porcelain` in the main repository.
   - If there are uncommitted changes, STOP and ask the user to commit or stash them.

3. Update Main
   - // turbo
   - Run `wsl git checkout main`
   - // turbo
   - Run `wsl git pull origin main`

4. Get Task Details
   - Ask the user: "Is there a Focalboard card for this task?"
   - **IF YES (Focalboard):**
     - Use `mcp_focalboardmcp_search_boards` or list boards to find the relevant board.
     - Search for the card using `mcp_focalboardmcp_get_cards` query or ask user for keywords to search.
     - Once the card is identified:
       - `NAME` = Card Title
       - `NUM` = Look for an "ID" property. If not found, ASK the user "What is the Card #?".
   - **IF NO (Manual):**
     - Ask the user: "What is the Card #?" (NUM)
     - Ask the user: "What is the Card Name?" (NAME)
   - Ask the user: "Is this a feature or bug?" (TYPE)

5. Create Feature Worktree
   - Define:
     - `SNAKE_NAME`: Convert `NAME` to snake_case.
     - `BRANCH_NAME`: `$TYPE/$NUM-$SNAKE_NAME`
     - `WORKTREE_PATH`: `../$NUM-$SNAKE_NAME` (relative to current repo root)
   - // turbo
   - Run `wsl git worktree add $WORKTREE_PATH -b $BRANCH_NAME`

6. Update Workspace Worktree Rule
   - Create or update `.agent/worktrees.md` with:
     ```markdown
     # Active Worktrees
     - Card: $NUM - $NAME
     - Branch: $BRANCH_NAME
     - Path: <absolute-path-to-worktree>

     ## Instruction
     The agent SHOULD use the above Path as the base for all work on this feature.
     At the start of the session, the agent MUST ask the user:
     "I will be working in <Path>. Is this the correct directory for this task?"
     Once confirmed, no further confirmation is needed for that session.
     ```

7. Finalize
   - Output: "Worktree created at '<Path>'. Please switch your context to that directory or confirm I should operate from there."
   - Ask for confirmation of the CWD before proceeding with any code changes.
