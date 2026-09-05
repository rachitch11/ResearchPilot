---
name: OpenAPI codegen and Zod 3
description: The workspace's Orval setup emits Zod 4-only helpers for some OpenAPI formats.
---

When adding OpenAPI contracts, represent bounded numeric fields as `type: number` and URLs as plain `type: string` if the generated Zod schemas must compile against the installed Zod 3 package.

**Why:** The current generator emitted `zod.int()` for OpenAPI integer fields and `zod.url()` for URI formats; both fail typechecking with this workspace's Zod 3 dependency.

**How to apply:** Keep integer/range validation in the service layer when using the compatible OpenAPI representation, and regenerate both API client and Zod outputs after contract changes.