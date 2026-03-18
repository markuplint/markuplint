# Error Handling Changes in v5

No breaking changes. Existing import paths and APIs continue to work as-is.

## New: `isFatalError()` Guard Function

A new utility function is available from `@markuplint/shared`. It classifies caught errors as fatal (Tier 1) or recoverable (Tier 2/3), useful in `catch` blocks of custom rules and plugins.

```typescript
import { isFatalError } from '@markuplint/shared';

try {
  // ...
} catch (error) {
  if (isFatalError(error)) {
    throw error; // TypeError, ReferenceError, etc.
  }
  // handle recoverable error
}
```

For details on the error tiers, see [Error Handling Policy](../architectures/ERROR-HANDLING.md).
