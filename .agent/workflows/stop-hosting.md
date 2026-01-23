---
description: Stop the full stack (backend + frontend) by killing process on ports 3000 and 8000
---

1. Stop Services
   - Kills process on port 3000 (Next.js)
   - Kills process on port 8000 (Python Backend)
   - Cleans up .next cache
```bash
wsl bash -c "lsof -ti:3000 | xargs -r kill -9; lsof -ti:8000 | xargs -r kill -9; rm -rf .next"
```
