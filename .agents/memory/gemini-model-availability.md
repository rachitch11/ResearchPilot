---
name: Gemini model availability
description: Provider model availability can vary for new user-owned Gemini API keys.
---

Keep the Gemini model configurable through the runtime environment and verify it with a real provider call before building dependent features.

**Why:** A newly added user-owned key rejected the previously chosen `gemini-2.5-flash` model with a provider 404 and explicitly recommended a newer model. The adapter was correct; the model availability was account/provider dependent.

**How to apply:** Treat a provider 404 as a model/API availability signal, inspect the sanitized provider message, and update the configured model rather than exposing provider details or credentials.