---
description: Stop the full stack (backend + frontend) by killing process on ports 3000 and 8000
---

1. Stop Services
   - Kills process on port 3000 (Next.js)
   - Kills process on port 8000 (Python Backend)
   - Cleans up .next cache
```bash
wsl bash -c "pkill -f 'python main.py' || true; pkill -f 'next dev' || true; rm -rf .next"
```
