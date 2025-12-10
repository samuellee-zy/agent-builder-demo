# Changelog

All notable changes to the Agent Builder project will be documented in this file.

## History

### [Current Date] - Evaluation Persistence
- **Updated `App.tsx`**:
  - Connected `handleAgentCreated` to the `AgentRegistry`'s `onUpdateAgent` prop.
  - Ensures that when an evaluation finishes in the Registry, the new report is immediately saved to the main application state and persisted to LocalStorage.

### [Previous Date] - Evaluation Resilience Update
- **Updated `services/evaluation.ts`**:
  - **Fixed Parsing Bug**: Updated `cleanJson` to correctly identify and extract JSON Arrays `[]` instead of defaulting to Objects `{}`, which was causing 0/10 scores.
  - **Added Retry Logic**: Implemented `retryOperation` wrapper for the Evaluation Judge to handle rate limits (429) gracefully.
  - **Fallback Model**: Added automatic fallback to `gemini-2.5-flash` if `gemini-3-pro-preview` fails to judge the transcript.

### [Previous Date] - Pure Coordinator Pattern
- **Updated `mockAgentService.ts`**:
  - Modified Architect prompts to enforce a "Pure Coordinator" rule.
  - If a Root Agent has sub-agents, it is stripped of all tools (including `google_search`) to prevent API conflicts (Error 400).
  - Tools are now explicitly assigned only to leaf-node agents in multi-agent hierarchies.
  - Single-agent systems retain the ability to use `google_search` on the Root.

### [Previous Date] - Google Search Tool Conflict Resolution
- **Fixed `AgentOrchestrator` Crash**: Resolved `400 INVALID_ARGUMENT` error when mixing `googleSearch` with other tools.
  - Implemented conflict detection: If Function Declarations (including `delegate_to_agent`) are present, Native Google Search is strictly disabled for that turn.
  - Prioritized structural integrity (Coordinator delegation) over Search Grounding to ensure system stability.

### [Previous Date] - System Resilience & Type Safety Update
- **Refactored `AgentOrchestrator`**:
  - Restored full `retryOperation` logic with correct exponential backoff for 429/503 errors.
  - Hardened `runAgentLoop` against recursion depth and infinite loops.
  - Improved type safety for `Content` and `Part` interfaces from `@google/genai`.
  - Added robust casting for tool arguments to prevent runtime errors with `delegate_to_agent`.
- **Coordinator Pattern**:
  - Ensured `delegate_to_agent` tool is correctly injected only when sub-agents exist.
  - Added specific system instructions to prevent "Echoing" of delegated results.