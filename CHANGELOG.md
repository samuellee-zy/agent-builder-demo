# Changelog

All notable changes to the Agent Builder project will be documented in this file.

## History

### 12-10-2025 - Cloud Run Deployment Support
- **Added `Dockerfile`**:
  - Implemented multi-stage build (Node.js -> Nginx) for optimized production images.
- **Added `nginx.conf`**:
  - Configured SPA routing (`try_files`) and Gzip compression.
- **Updated `README.md`**:
  - Added comprehensive deployment guide for Google Cloud Run.

### 12-10-2025 - Watchtower UI Update
- **Updated `components/Watchtower.tsx`**:
  - Renamed the label in the Intent Card from "sessions" to "detections".
  - This accurately reflects that the count represents the frequency of the detected intent, which may exceed the number of unique sessions if multiple intents are found per session or if the analysis spans fewer sessions than the count suggests.
- **Updated `types.ts`**:
  - Updated `IntentGroup` interface comments to clarify the `count` property.

### 12-10-2025 - Watchtower Observability Engine
- **Added `services/watchtower.ts`**:
  - Implemented `WatchtowerService` to perform batch analysis on agent sessions.
  - Utilizes `gemini-3-pro-preview` to cluster unstructured conversations into **Intent Groups**.
  - Calculates aggregate Sentiment Scores and Latency metrics.
  - Generates **Strategic Recommendations** (Tooling gaps, Instruction improvements).
- **Added `components/Watchtower.tsx`**:
  - Created a dashboard UI visualizing "Live Pulse", "Intent Map", and "Recommendations".
  - Integrated into the main sidebar navigation.

### 12-10-2025 - Sequential Session IDs
- **Updated `components/AgentBuilder.tsx`**:
  - Replaced random timestamp-based Session IDs with strict **Sequential IDs** (e.g., #1, #2, #3).
  - Implemented intelligent parsing to ignore legacy IDs and increment from the highest existing sequential number.
- **Updated `components/AgentRegistry.tsx`**:
  - Improved session list display to show clean sequential numbers (e.g., "Session #1") versus legacy timestamps.

### 12-10-2025 - Fix Duplicate Text Responses (Coordinator Echo)
- **Updated `services/orchestrator.ts`**:
  - Implemented a "Silent Handoff" strategy for text responses in multi-agent systems.
  - When a Coordinator delegates to a Sub-Agent, the Sub-Agent speaks directly to the user (preserving the "step-by-step" view).
  - The return value passed back to the Coordinator is now wrapped in a system tag: `[SYSTEM: The user has already seen this... DO NOT REPEAT IT]`.
  - Updated Coordinator System Instructions to explicitly forbid repeating information that has already been displayed.
  - This solves the issue where the Root Agent would unnecessarily summarize or echo the Sub-Agent's output.

### 12-10-2025 - Fix Evaluation Report Rich Media & Token Limits
- **Updated `services/evaluation.ts`**:
  - `runSimulation` now captures "rich" content (images/videos) emitted by `AgentOrchestrator` via `onAgentResponse`, instead of relying on the text-only return value of `sendMessage`.
  - Implemented `compressForJudge` utility to strip large Base64 image data from the transcript before sending it to the AI Judge. This prevents `400 INVALID_ARGUMENT` (Token Limit) errors during evaluation of Imagen agents.
- **Updated `components/AgentRegistry.tsx`**:
  - `renderEvaluationReport` now parses and renders markdown images and `VideoMessage` components in the transcript log, allowing users to see the generated media that was previously missing.

### 12-10-2025 - Fix Video Generation 404 Error
- **Updated `services/orchestrator.ts`**:
  - Implemented auto-migration logic in `generateVideo` to catch usages of the deprecated `veo-3.0-fast-generate` model.
  - Automatically redirects these calls to `veo-3.1-fast-generate-preview`, preventing `404 NOT_FOUND` errors for existing agents.
- **Updated `types.ts` & `mockAgentService.ts`**:
  - Removed `veo-3.0-fast-generate` from the list of available models to prevent new agents from being created with the deprecated ID.

### 12-10-2025 - Added Imagen 4 Fast
- **Updated `types.ts` & `mockAgentService.ts`**:
  - Added `imagen-4.0-fast-generate-001` to the supported models list.
  - Updated Architect prompts to be aware of this new model for fast photorealistic image generation tasks.

### 12-10-2025 - Fix Duplicate Video/Image Outputs
- **Updated `services/orchestrator.ts`**:
  - Modified `generateVideo` and `generateImage` to return a simple system acknowledgement (e.g., "[System: Video generated and displayed to user]") instead of the rich media content.
  - The rich media (Video Link or Image Base64) is now **only** emitted via the `onAgentResponse` callback to the UI.
  - This prevents the "Echo" effect where the Coordinator agent (parent) would receive the media link as a tool result and repeat it to the user, causing duplicates.
  - **Performance**: This change also drastically reduces token usage for the Coordinator agent by preventing massive Base64 image strings from entering its context window.

### 12-10-2025 - Agent Diagram Z-Index & Connectivity Fix
- **Updated `components/AgentDiagram.tsx`**:
  - Implemented dynamic Z-Index layering (`z-50` when active) for Agent Nodes.
  - Fixes an issue where the "Add Sub-Agent" menu was obscured or blocked by subsequent nodes in the tree hierarchy.
  - Reinforced connector line logic using `calc(50% + 1px)` to ensure seamless visual joints between tree arms and vertical stems.
  - Updated Add Menus to use `bg-slate-950` for better contrast and readability against the diagram background.

### 12-10-2025 - Token Limit & UI Diagram Fixes
- **Updated `services/orchestrator.ts`**:
  - Implemented `compressContent` logic to strip large Base64 image data from the conversation history sent to the API.
  - Resolves `400 INVALID_ARGUMENT (Token Limit)` errors caused by excessive context usage from generated images/videos.
  - Replaces `data:image/...` strings with `[Image data hidden]` placeholders in the model context, preserving token budget for logic and reasoning.
- **Updated `components/AgentDiagram.tsx`**:
  - Refactored connector rendering to use thicker (`2px`) lines for better visibility.
  - Fixed disconnect issues by using `calc(50% + 1px)` for horizontal arms to ensure perfect overlap with vertical stems.
  - Added `flex-shrink-0` to all structural wrappers to prevent layout compression from breaking the visual tree.
  - Standardized connector colors to `bg-slate-700`.

### 12-10-2025 - Orchestrator Token Limit Fix
- **Updated `services/orchestrator.ts`**:
  - Implemented `compressContent` utility to strip large Base64 image strings from conversation history before sending to Gemini.
  - Prevents `400 INVALID_ARGUMENT (Token Limit)` errors during long conversations involving image generation tools.
  - Replaces raw Base64 data with `[Image data hidden]` placeholders in the model context, while maintaining full display capabilities in the UI history.

### 12-10-2025 - Video & Image Generation Fix
- **Updated `services/orchestrator.ts`**:
  - Implemented specialized handlers for `veo-*` (Video) and `imagen-*` (Image) models.
  - The orchestrator now detects these models and routes them to `ai.models.generateVideos` and `ai.models.generateImages` respectively, bypassing the default `generateContent` loop which causes 404 errors.
  - Added secure URI construction for Veo videos (appending API key) to allow playback in the UI.

### 12-10-2025 - UI Font Adjustment
- **Updated `index.html`**:
  - Adjusted root font size from **21px** down to **18px** to provide a more balanced visual hierarchy while still offering improved readability over the default.

### 12-10-2025 - UI Accessibility Update
- **Updated `index.html`**:
  - Increased global root font size to **21px** (approximately 30% larger than the 16px default).
  - Added CSS overrides for `text-[10px]` and `text-[9px]` to convert them to scalable `rem` units, ensuring metadata and badges resize proportionally with the rest of the interface.

### 12-10-2025 - Added Gemini 2.5 Flash Lite
- **Updated `types.ts` & `mockAgentService.ts`**:
  - Added `gemini-flash-lite-latest` (Gemini 2.5 Flash Lite) to the supported models list.
  - Enabled this model for both Agent creation and the Evaluation Service simulator.
  - Retained strict filtering to ensure Video/Image models do not appear in the Evaluation Service dropdown.

### 12-10-2025 - Evaluation Persistence
- **Updated `App.tsx`**:
  - Connected `handleAgentCreated` to the `AgentRegistry`'s `onUpdateAgent` prop.
  - Ensures that when an evaluation finishes in the Registry, the new report is immediately saved to the main application state and persisted to LocalStorage.

### 12-10-2025 - Evaluation Resilience Update
- **Updated `services/evaluation.ts`**:
  - **Fixed Parsing Bug**: Updated `cleanJson` to correctly identify and extract JSON Arrays `[]` instead of defaulting to Objects `{}`, which was causing 0/10 scores.
  - **Added Retry Logic**: Implemented `retryOperation` wrapper for the Evaluation Judge to handle rate limits (429) gracefully.
  - **Fallback Model**: Added automatic fallback to `gemini-2.5-flash` if `gemini-3-pro-preview` fails to judge the transcript.

### 12-10-2025 - Pure Coordinator Pattern
- **Updated `mockAgentService.ts`**:
  - Modified Architect prompts to enforce a "Pure Coordinator" rule.
  - If a Root Agent has sub-agents, it is stripped of all tools (including `google_search`) to prevent API conflicts (Error 400).
  - Tools are now explicitly assigned only to leaf-node agents in multi-agent hierarchies.
  - Single-agent systems retain the ability to use `google_search` on the Root.

### 12-10-2025 - Google Search Tool Conflict Resolution
- **Fixed `AgentOrchestrator` Crash**: Resolved `400 INVALID_ARGUMENT` error when mixing `googleSearch` with other tools.
  - Implemented conflict detection: If Function Declarations (including `delegate_to_agent`) are present, Native Google Search is strictly disabled for that turn.
  - Prioritized structural integrity (Coordinator delegation) over Search Grounding to ensure system stability.

### 12-10-2025 - System Resilience & Type Safety Update
- **Refactored `AgentOrchestrator`**:
  - Restored full `retryOperation` logic with correct exponential backoff for 429/503 errors.
  - Hardened `runAgentLoop` against recursion depth and infinite loops.
  - Improved type safety for `Content` and `Part` interfaces from `@google/genai`.
  - Added robust casting for tool arguments to prevent runtime errors with `delegate_to_agent`.
- **Coordinator Pattern**:
  - Ensured `delegate_to_agent` tool is correctly injected only when sub-agents exist.
  - Added specific system instructions to prevent "Echoing" of delegated results.