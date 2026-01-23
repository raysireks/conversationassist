---
description: Kill stale processes and restart the full stack (backend + frontend)
---

1. Kill existing Node.js/Next.js and Python processes (Clean Slate)
// turbo
2. Execute kill commands via bash (ignoring missing processes)
```bash
wsl bash -c "lsof -ti:3000 | xargs -r kill -9; lsof -ti:8000 | xargs -r kill -9; rm -rf .next"
```

3. Start the Backend Service
   - Note: Run this in the background
   - We updated package.json to use '.' instead of 'source' for compatibility
```bash
wsl npm run backend:dev
```

4. Start the Frontend Service
   - Note: Run this in the background
```bash
wsl npm run dev
```
