---
name: finding-auth-client-type-import
description: auth-client.ts imports server type via relative path (../../../server/src/lib/auth); safe as type-only import today
metadata:
  type: project
---

client/src/lib/auth-client.ts:
```ts
import type { auth } from '../../../server/src/lib/auth'
```

The `import type` ensures Vite tree-shakes this to nothing at bundle time. No server code reaches the client bundle.

**Why:** This is safe today because of the `type` keyword. Risk arises if someone removes `type` or if the server module has side effects that TypeScript doesn't strip. Should be watched.

**How to apply:** In future audits, verify this import still uses `import type`. If it ever becomes a value import, it would bundle the entire server auth module including secrets.
