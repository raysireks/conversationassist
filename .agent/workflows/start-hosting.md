---
description: Kill stale processes and restart the full stack (backend + frontend)
---

1. Clean Slate
   - // turbo
   - Run the `/stop-hosting` workflow to ensure ports are free.
   - (Or manually run: `wsl bash -c "pkill -f 'python main.py' || true; pkill -f 'next dev' || true; rm -rf .next"`)

> [!NOTE]
> Services will be started in the background. They will **REMAIN RUNNING** for manual verification.
> When finished, run `/stop-hosting` or manually kill the terminals.

3. Start the Backend Service
   - Note: Run this in the background
   - We updated package.json to use '.' instead of 'source' for compatibility
```bash
wsl npm run backend:gpu
```

4. Start the Frontend Service
   - Note: Run this in the background
```bash
wsl npm run dev
```
