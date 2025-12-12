# Changelog

All notable changes to the Agent Builder project will be documented in this file.

## History

### 12/12/2025 - UX & Performance Fixes
- **Concurrent Workflow Execution**:
  - **Parallel Processing**: Refactored `AgentOrchestrator` to use `Promise.all` for tool execution.
  - **Benefit**: Agents can now delegate to multiple sub-agents simultaneously (e.g., "Research topic X and topic Y"), significantly reducing wait times for complex parallel tasks.
- **Architect Chat Improvements**:
  - **Navigation**: Added a "Back to Builder" button in the Architect Chat header, allowing users to easily return to the visual diagram after refining their agent.
  - **Duplicate Sync Fix**: Resolved a bug where the "Synced your manual changes" confirmation message would appear twice. The logic now correctly checks the last *visible* message, ignoring hidden system state updates.

### 12/12/2025 - Codebase Rearchitecture
- **Folder Structure**:
  - **`src/`**: Moved all React frontend code (`components`, `services`, `App.tsx`) to `src/` for better organization.
  - **`server/`**: Moved `server.js` to `server/index.js` to isolate backend logic.
  - **`docs/`**: Moved all markdown documentation (`IMPLEMENTATION.md`, `CHANGELOG.md`, `TOOLS.md`, `PLAN.md`) to `docs/`.
  - **`scripts/`**: Moved utility scripts (`env.sh`, `test_*.js`) to `scripts/`.
- **Configuration Updates**:
  - Updated `Dockerfile`, `package.json`, `vite.config.ts`, and `index.html` to support the new structure.
  - Updated `server/index.js` to correctly serve static assets from `../dist`.

### 12/12/2025 - Report Formatter & Mock Tester
- **Report Formatter Tool**:
  - **New Tool**: Added `publish_report` utility that allows agents to generate structured, rich-text reports.
  - **Rich Text Rendering**: Integrated `react-markdown` and `remark-gfm` to render tables, lists, and code blocks beautifully within the chat interface.
  - **UI Component**: Implemented a distinct "Report Card" UI for these messages, separating them from standard conversational text.
- **Mock Tester Enhancements**:
  - **Rich Text Preview**: Updated `ToolsLibrary.tsx` to render `publish_report` outputs as fully styled Markdown cards instead of raw JSON.
  - **Markdown Editor**: Replaced the standard input field with a multi-line Textarea for the `content` parameter, making it easier to test complex report generation.
- **Dependencies**:
  - Added `react-markdown`, `remark-gfm`, and `@tailwindcss/typography`.

### 12/12/2025 - Session Separation & Model Selector
- **Session Separation**:
  - **Dynamic Draft IDs**: Implemented a `draftId` system in `App.tsx`. Every "New Agent" action generates a unique UUID, ensuring a completely fresh Architect Chat session.
  - **History Migration**: Automatically migrates chat history from the temporary `draftId` to the permanent `agentId` upon agent creation.
  - **Fix**: Resolved issue where previous "New Agent" sessions would leak into new ones due to a shared static storage key.
- **Architect Model Selector**:
  - **UI**: Added a dropdown in the "Hero Input" area allowing users to choose the AI Architect's model.
  - **Options**:
    - `gemini-2.5-flash` (Default): Fast and efficient.
    - `gemini-3-pro-preview`: Advanced reasoning for complex system designs.
  - **Removed**: Deprecated `gemini-1.5-pro` option.
- **Bug Fixes**:
  - **Model Parameter**: Fixed a bug in `AgentBuilder.tsx` where the selected model was not being passed to the backend service.

### 12/12/2025 - Tools Library Overhaul
- **Tagging System**:
  - **Multi-Tag Support**: Migrated from single-category "pills" to a flexible tagging system. Tools can now have multiple tags (e.g., `['Data Retrieval', 'Transport']`), allowing for better classification and discoverability.
  - **Smart Filtering**: The new `CategoryDropdown` filters tools by checking if they *contain* the selected tag, rather than an exact category match.
- **UI/UX Refinements**:
  - **Premium Dropdown**: Replaced the "pill" selector with a scalable, responsive dropdown menu for tag filtering.
  - **Search & Layout**: Implemented a real-time search bar (600px width) and a responsive grid layout (up to 4 columns on ultra-wide screens).
  - **Pagination**: Increased density to 16 tools per page for better use of screen real estate.
  - **Inspector Polish**:
    - **Layout**: Reordered inspector details (Title -> Tool ID (Yellow) -> Tags) for a cleaner hierarchy.
    - **Positioning**: Fixed inspector alignment on large screens (`lg:left-auto`) to ensure it stays on the right.
    - **Visuals**: Added unique icons for every tool (Globe, Train, MapPin, etc.) and enhanced the "Selected" state with a distinct glow.

### 12/12/2025 - Architect Persistence & Enhancement Workflow
- **Architect Chat Persistence**:
  - Implemented **IndexedDB Storage** (via `idb-keyval`) to persist AI Architect chat sessions across page reloads.
  - **Smart Session Management**: Chat history is saved per-agent (or draft). Returning to the builder restores the context while still presenting the clean "Hero Input" for a fresh feel.
- **Enhance Instructions**:
  - Added **"Enhance" Button** to the Agent Config panel.
  - Uses `gemini-2.5-flash` (via `/api/generate`) to rewrite and professionalize Agent Operating Procedures (AOP) based on user feedback.
- **Consult Architect**:
  - Added **"Consult Architect"** workflow in the Visual Builder.
  - Allows users to **sync manual changes** (JSON state) back to the chat context via hidden system messages.
  - Automatically switches view to the Chat interface for seamless iteration.
- **UX Improvements**:
  - **Chat Deduping**: Implemented logic to prevent duplicate "Synced" confirmation messages in the chat history.
  - **Blank Screen Fix**: Restored critical helper functions (`handleDeleteNode`, `handleUndo`) that caused runtime errors during the refactor.
  - **Hero Input**: Refined the landing experience to always show the large input box first, ensuring a welcoming entry point even for existing sessions.
- **Mock Tester Enhancements**:
  - **Location Finder**: Added a dedicated UI component for `nsw_trip_planner` that allows users to search for stops/stations with autocomplete (mocked) and injects the ID directly into the chat.
  - **Transport Mode Selector**: Added a visual selector for transport modes (Train, Metro, Ferry, Bus, Light Rail) to simplify testing the Trip Planner tool.
  - **Smart Tool Detection**: The UI automatically detects when the active agent has transport tools and reveals these helper controls.
- **UI/UX Polish**:
  - **Global Overscroll Fix**: Updated `index.html` with `overscroll-behavior: none` to prevent the "rubber-banding" effect on Mac trackpads, fixing the "huge gap" issue.
  - **Dropdown Stability**: Implemented portal-based rendering and scroll-locking in `LocationAutocomplete` and `ModeDropdown` to prevent menus from detaching or closing unexpectedly during scroll.
  - **Tools Library**: Enhanced the "Run Function" button styling for better visibility and clickability.
- **Server Hardening & Configuration**:
  - **Payload Limit Increased**: Increased Express `json` body limit to **50MB** (from default 100kb) to prevent `413 Payload Too Large` errors when processing large chat histories or image data.
  - **Strict Model Mapping**:
    - **Gemini 3 Pro**: Server-side mapping now strictly redirects `gemini-3-pro` to `gemini-3-pro-preview` to resolve 404 errors.
    - **Gemini 2.5 Flash**: Mapped directly to `gemini-2.5-flash` (1:1) per user preference, removing the experimental 2.0 fallback.
    - **No Gemini 2.0**: Explicitly removed `gemini-2.0-flash-exp` from active configuration to ensure stability.

### 11/12/2025 - Veo 3.1 & Image-to-Video Support
- **Veo 3.1 Implementation**:
  - Upgraded video generation to use **Veo 3.1** via Vertex AI's `predictLongRunning` LRO pattern.
  - Implemented robust **polling logic** (`fetchPredictOperation`) with exponential backoff (5s start, 1.5x multiplier, 60s cap).
  - Added **Recursive Response Parsing** to reliably extract video data from deeply nested or variable JSON responses.
  - Fixed output format to use Markdown `[Download Video](data:...)` for seamless frontend rendering.
- **Image-to-Video Context**:
  - Implemented **Image-to-Video** support! Agents can now generate a video based on a previously generated image.
  - **Orchestrator Update**: Modified `runAgentLoop` to intelligently scan the *uncompressed* chat history and extract the most recent image to pass as context to Veo.
  - **API Update**: Updated `server.js` and `api.ts` to accept and handle the `image` parameter in generation requests.
- **Bug Fixes**:
  - **Duplicate Generation**: Fixed a critical bug in `orchestrator.ts` where `generateContent` was being called twice per turn, causing double execution and loops.
  - **Syntax Errors**: Resolved syntax errors in `server.js` related to logging and markdown formatting.
  - **Logging**: Added timestamped logging (`log`, `logError`) to the backend for better debugging.

### 11/12/2025 - NSW Trains Realtime Tool
- **New Tool**: Added `nsw_trains_realtime` to fetch live trip updates from Transport for NSW.
- **Backend Proxy**: Implemented secure proxy in `server.js` to handle API authentication and Protobuf decoding (`gtfs-realtime-bindings`).
- **Security**: API Key is stored server-side and never exposed to the client.

### 11/12/2025 - NSW Metro Realtime Tool
- **New Tool**: Added `nsw_metro_realtime` to fetch live trip updates for the Sydney Metro network.
- **Dynamic Proxy**: Refactored the backend endpoint to `/api/transport/:dataset` to support both Trains and Metro via a single secure proxy.
- **NSW Trip Planner Tool**: Added `nsw_trip_planner` tool to plan trips between locations using specific transport modes (Train, Metro, Ferry, etc.). Implemented `/api/transport/planner/:endpoint` proxy.

### 10/12/2025 - Cloud Run Deployment Support
- **Added `Dockerfile`**:
  - Implemented multi-stage build (Node.js -> Nginx) for optimized production images.
- **Added `nginx.conf`**:
  - Configured SPA routing (`try_files`) and Gzip compression.
- **Updated `README.md`**:
  - Added comprehensive deployment guide for Google Cloud Run.
- **Added Runtime Injection**:
  - Created `env.sh` and `services/config.ts` to support dynamic environment variables in Docker containers.
  - Solved "Missing API Key" error in Cloud Run by injecting the key into `window.ENV` at startup.

### 10/12/2025 - Watchtower UI Update
- **Updated `components/Watchtower.tsx`**:
  - Renamed the label in the Intent Card from "sessions" to "detections".
  - This accurately reflects that the count represents the frequency of the detected intent, which may exceed the number of unique sessions if multiple intents are found per session or if the analysis spans fewer sessions than the count suggests.
- **Updated `types.ts`**:
  - Updated `IntentGroup` interface comments to clarify the `count` property.

### 10/12/2025 - Watchtower Observability Engine
- **Added `services/watchtower.ts`**:
  - Implemented `WatchtowerService` to perform batch analysis on agent sessions.
  - Utilizes `gemini-3-pro-preview` to cluster unstructured conversations into **Intent Groups**.
  - Calculates aggregate Sentiment Scores and Latency metrics.
  - Generates **Strategic Recommendations** (Tooling gaps, Instruction improvements).
- **Added `components/Watchtower.tsx`**:
  - Created a dashboard UI visualizing "Live Pulse", "Intent Map", and "Recommendations".
  - Integrated into the main sidebar navigation.

### 10/12/2025 - Sequential Session IDs
- **Updated `components/AgentBuilder.tsx`**:
  - Replaced random timestamp-based Session IDs with strict **Sequential IDs** (e.g., #1, #2, #3).
  - Implemented intelligent parsing to ignore legacy IDs and increment from the highest existing sequential number.
- **Updated `components/AgentRegistry.tsx`**:
  - Improved session list display to show clean sequential numbers (e.g., "Session #1") versus legacy timestamps.

### 10/12/2025 - Fix Duplicate Text Responses (Coordinator Echo)
- **Updated `services/orchestrator.ts`**:
  - Implemented a "Silent Handoff" strategy for text responses in multi-agent systems.
  - When a Coordinator delegates to a Sub-Agent, the Sub-Agent speaks directly to the user (preserving the "step-by-step" view).
  - The return value passed back to the Coordinator is now wrapped in a system tag: `[SYSTEM: The user has already seen this... DO NOT REPEAT IT]`.
  - Updated Coordinator System Instructions to explicitly forbid repeating information that has already been displayed.
  - This solves the issue where the Root Agent would unnecessarily summarize or echo the Sub-Agent's output.

### 10/12/2025 - Fix Evaluation Report Rich Media & Token Limits
- **Updated `services/evaluation.ts`**:
  - `runSimulation` now captures "rich" content (images/videos) emitted by `AgentOrchestrator` via `onAgentResponse`, instead of relying on the text-only return value of `sendMessage`.
  - Implemented `compressForJudge` utility to strip large Base64 image data from the transcript before sending it to the AI Judge. This prevents `400 INVALID_ARGUMENT` (Token Limit) errors during evaluation of Imagen agents.
- **Updated `components/AgentRegistry.tsx`**:
  - `renderEvaluationReport` now parses and renders markdown images and `VideoMessage` components in the transcript log, allowing users to see the generated media that was previously missing.

### 10/12/2025 - Fix Video Generation 404 Error
- **Updated `services/orchestrator.ts`**:
  - Implemented auto-migration logic in `generateVideo` to catch usages of the deprecated `veo-3.0-fast-generate` model.
  - Automatically redirects these calls to `veo-3.1-fast-generate-preview`, preventing `404 NOT_FOUND` errors for existing agents.
- **Updated `types.ts` & `mockAgentService.ts`**:
  - Removed `veo-3.0-fast-generate` from the list of available models to prevent new agents from being created with the deprecated ID.

### 10/12/2025 - Added Imagen 4 Fast
- **Updated `types.ts` & `mockAgentService.ts`**:
  - Added `imagen-4.0-fast-generate-001` to the supported models list.
  - Updated Architect prompts to be aware of this new model for fast photorealistic image generation tasks.

### 10/12/2025 - Fix Duplicate Video/Image Outputs
- **Updated `services/orchestrator.ts`**:
  - Modified `generateVideo` and `generateImage` to return a simple system acknowledgement (e.g., "[System: Video generated and displayed to user]") instead of the rich media content.
  - The rich media (Video Link or Image Base64) is now **only** emitted via the `onAgentResponse` callback to the UI.
  - This prevents the "Echo" effect where the Coordinator agent (parent) would receive the media link as a tool result and repeat it to the user, causing duplicates.
  - **Performance**: This change also drastically reduces token usage for the Coordinator agent by preventing massive Base64 image strings from entering its context window.

### 10/12/2025 - Agent Diagram Z-Index & Connectivity Fix
- **Updated `components/AgentDiagram.tsx`**:
  - Implemented dynamic Z-Index layering (`z-50` when active) for Agent Nodes.
  - Fixes an issue where the "Add Sub-Agent" menu was obscured or blocked by subsequent nodes in the tree hierarchy.
  - Reinforced connector line logic using `calc(50% + 1px)` to ensure seamless visual joints between tree arms and vertical stems.
  - Updated Add Menus to use `bg-slate-950` for better contrast and readability against the diagram background.

### 10/12/2025 - Token Limit & UI Diagram Fixes
- **Updated `services/orchestrator.ts`**:
  - Implemented `compressContent` logic to strip large Base64 image data from the conversation history sent to the API.
  - Resolves `400 INVALID_ARGUMENT (Token Limit)` errors caused by excessive context usage from generated images/videos.
  - Replaces `data:image/...` strings with `[Image data hidden]` placeholders in the model context, preserving token budget for logic and reasoning.
- **Updated `components/AgentDiagram.tsx`**:
  - Refactored connector rendering to use thicker (`2px`) lines for better visibility.
  - Fixed disconnect issues by using `calc(50% + 1px)` for horizontal arms to ensure perfect overlap with vertical stems.
  - Added `flex-shrink-0` to all structural wrappers to prevent layout compression from breaking the visual tree.
  - Standardized connector colors to `bg-slate-700`.

### 10/12/2025 - Orchestrator Token Limit Fix
- **Updated `services/orchestrator.ts`**:
  - Implemented `compressContent` utility to strip large Base64 image strings from conversation history before sending to Gemini.
  - Prevents `400 INVALID_ARGUMENT (Token Limit)` errors during long conversations involving image generation tools.
  - Replaces raw Base64 data with `[Image data hidden]` placeholders in the model context, while maintaining full display capabilities in the UI history.

### 10/12/2025 - Video & Image Generation Fix
- **Updated `services/orchestrator.ts`**:
  - Implemented specialized handlers for `veo-*` (Video) and `imagen-*` (Image) models.
  - The orchestrator now detects these models and routes them to `ai.models.generateVideos` and `ai.models.generateImages` respectively, bypassing the default `generateContent` loop which causes 404 errors.
  - Added secure URI construction for Veo videos (appending API key) to allow playback in the UI.

### 10/12/2025 - UI Font Adjustment
- **Updated `index.html`**:
  - Adjusted root font size from **21px** down to **18px** to provide a more balanced visual hierarchy while still offering improved readability over the default.

### 10/12/2025 - UI Accessibility Update
- **Updated `index.html`**:
  - Increased global root font size to **21px** (approximately 30% larger than the 16px default).
  - Added CSS overrides for `text-[10px]` and `text-[9px]` to convert them to scalable `rem` units, ensuring metadata and badges resize proportionally with the rest of the interface.

### 10/12/2025 - Added Gemini 2.5 Flash Lite
- **Updated `types.ts` & `mockAgentService.ts`**:
  - Added `gemini-flash-lite-latest` (Gemini 2.5 Flash Lite) to the supported models list.
  - Enabled this model for both Agent creation and the Evaluation Service simulator.
  - Retained strict filtering to ensure Video/Image models do not appear in the Evaluation Service dropdown.

### 10/12/2025 - Evaluation Persistence
- **Updated `App.tsx`**:
  - Connected `handleAgentCreated` to the `AgentRegistry`'s `onUpdateAgent` prop.
  - Ensures that when an evaluation finishes in the Registry, the new report is immediately saved to the main application state and persisted to LocalStorage.

### 10/12/2025 - Evaluation Resilience Update
- **Updated `services/evaluation.ts`**:
  - **Fixed Parsing Bug**: Updated `cleanJson` to correctly identify and extract JSON Arrays `[]` instead of defaulting to Objects `{}`, which was causing 0/10 scores.
  - **Added Retry Logic**: Implemented `retryOperation` wrapper for the Evaluation Judge to handle rate limits (429) gracefully.
  - **Fallback Model**: Added automatic fallback to `gemini-2.5-flash` if `gemini-3-pro-preview` fails to judge the transcript.

### 10/12/2025 - Pure Coordinator Pattern
- **Updated `mockAgentService.ts`**:
  - Modified Architect prompts to enforce a "Pure Coordinator" rule.
  - If a Root Agent has sub-agents, it is stripped of all tools (including `google_search`) to prevent API conflicts (Error 400).
  - Tools are now explicitly assigned only to leaf-node agents in multi-agent hierarchies.
  - Single-agent systems retain the ability to use `google_search` on the Root.

### 10/12/2025 - Google Search Tool Conflict Resolution
- **Fixed `AgentOrchestrator` Crash**: Resolved `400 INVALID_ARGUMENT` error when mixing `googleSearch` with other tools.
  - Implemented conflict detection: If Function Declarations (including `delegate_to_agent`) are present, Native Google Search is strictly disabled for that turn.
  - Prioritized structural integrity (Coordinator delegation) over Search Grounding to ensure system stability.

### 10/12/2025 - System Resilience & Type Safety Update
- **Refactored `AgentOrchestrator`**:
  - Restored full `retryOperation` logic with correct exponential backoff for 429/503 errors.
  - Hardened `runAgentLoop` against recursion depth and infinite loops.
  - Improved type safety for `Content` and `Part` interfaces from `@google/genai`.
  - Added robust casting for tool arguments to prevent runtime errors with `delegate_to_agent`.
- **Coordinator Pattern**:
  - Ensured `delegate_to_agent` tool is correctly injected only when sub-agents exist.
  - Added specific system instructions to prevent "Echoing" of delegated results.