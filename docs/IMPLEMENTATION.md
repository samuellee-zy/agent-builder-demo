
# Agent Builder - Implementation Reference

## Project Overview
**Agent Builder** is a production-grade, **Client-Server** web application for designing, building, and orchestrating Multi-Agent AI Systems using the Google Gemini ecosystem. 

It implements the **Coordinator Pattern**, where a top-level "Root Agent" decomposes user requests and delegates tasks to specialized "Sub-Agents". The application features a **React Frontend** for the UI and orchestration engine, and a **Node.js Backend** for secure API proxying and Vertex AI integration.

---

## 🏗 Core Architecture

### 1. AI Architect (Meta-Agent)
- **Role**: Designs the multi-agent system based on user requirements.
- **Model**: Configurable via UI. Defaults to `gemini-2.5-flash` (Fast), with option for `gemini-3-pro-preview` (Reasoning).
- **Capabilities**:
  - Conversational interface for gathering requirements.
  - Generates a JSON configuration for the agent system.
  - Validates and refines the design.
- **System Generation:** Uses `gemini-3-pro-preview` to generate a recursive JSON structure defining the agent hierarchy.
- **Reliability Strategy:**
  - **Prompt Engineering:** Explicitly requests "group" nodes (`sequential` or `concurrent`) for structured workflows.
  - **Multi-Model Fallback:** If Gemini 3 Pro returns malformed JSON, automatically falls back to `gemini-2.5-flash`.
  - **Hydration:** Ensures all generated nodes have unique IDs, timestamps, and default models.
  - **JSON Cleaning:** Implements `cleanJson` utility to strip Markdown fences from LLM responses before parsing.
- **Pure Coordinator Pattern:** The Architect is instructed to never assign tools to a Root Agent if it has sub-agents. Tools are pushed down to leaf nodes to ensure clean delegation and avoid API conflicts (Search vs Function Calling).

### 2. The Visual Builder (`src/components/AgentBuilder.tsx`)
A state-machine driven component managing the lifecycle of an agent.
- **State Machine:** Input -> Building -> Review -> Testing.
  - Uses `idb-keyval` to store the **Architect Chat History** locally.
  - **Session Separation (Drafts):**
    - **New Agents**: Assigned a unique UUID (`draftId`) on creation. This ensures a blank slate for every "New Agent" action, preventing history leaks from previous sessions.
    - **Migration**: Upon successful build, the chat history is automatically migrated from `architect_chat_${draftId}` to `architect_chat_${agentId}`.
  - **UX Pattern:** On load, the "Hero Input" is shown to provide a clean entry point, but the history is silently loaded in the background. Interacting with the input or clicking "Consult Architect" restores the full session.
  - **Navigation:** Includes a "Back to Builder" button in the Architect Chat view to easily return to the Visual Diagram after refining the design.
- **Enhance Workflow:**
  - Integrated **"Enhance"** button that sends the current Agent Instructions + User Feedback to `gemini-2.5-flash` (Fixed Model).
  - Returns a rewritten, professional Markdown version of the instructions.
- **Consult Architect (State Sync):**
  - Allows users to jump from the Visual Diagram back to the Chat.
  - **Hidden Sync:** Injects a hidden `[SYSTEM UPDATE]` message containing the current JSON state of the agent tree. This ensures the AI Architect is aware of any manual edits (name changes, tool additions) made in the UI.
  - **Deduping:** Prevents chat clutter by checking for existing confirmation messages before adding new ones.
    - **Fix (12/12/2025):** Updated logic to check the last *visible* message (ignoring hidden system messages) to ensure accurate deduping even after state syncs.
- **Undo/Revert Architecture:** Maintains a `history` stack of the agent tree. Destructive actions (delete, add sub-agent) call `saveCheckpoint()` first. `handleUndo` restores the previous state.
- **Mobile Optimization:**
  - **Touch-Friendly:** Chat input buttons ("Send", "Attach") have enlarged touch targets (>44px) for easier interaction on mobile devices.
  - **Mobile Inspector:** The "Agent Config" panel slides in as a full-screen overlay on mobile, toggleable via a "Config" button, ensuring it doesn't cramp the diagram view.
  - **Touch Gestures:** The diagram canvas supports native touch scrolling and panning.
- **Tablet & Foldable Strategy (Mobile-Plus):**
  - **Breakpoint Shift:** The application treats devices between **768px and 1023px** (e.g., iPad Mini, Unfolded Foldables) as "Mobile-Plus".
  - **Hidden Sidebar:** The navigation sidebar remains in "drawer mode" (hidden by default) on these devices to maximize the main content area.
  - **Overlay Inspector:** The Agent Inspector remains an overlay (slide-over) rather than a side-panel, ensuring the diagram has enough width to be usable.
- **Node Management:** Recursive update and deletion logic. `deleteNodeFromTree` handles deep removal of nodes.
- **Sequential Session IDs:** 
  - Instead of random timestamps, new test sessions are assigned strict sequential IDs (1, 2, 3...).
  - **Logic:** Scans existing sessions, filters out legacy timestamp-based IDs (>1 billion), finds the current maximum, and increments by 1.
- **Message Deduplication:** Checks incoming messages from the Orchestrator against the last displayed message to prevent the "Echoing" effect where a parent agent repeats the child's output verbatim.

### 3. The Visual Diagram (`src/components/AgentDiagram.tsx`)
The recursive visualization engine for the agent tree.
- **Seamless Connectors:** Refactored to use `w-[calc(50%+1px)]` logic to create perfect overlaps between horizontal arms and vertical stems. Lines are now 2px thick (`w-0.5`, `h-0.5`) and colored `slate-700` for high visibility.
- **Dynamic Layering (Z-Index):** Implements a `nodeZIndex` strategy (`z-50` when active, `z-10` default) to ensure that the "Add Sub-Agent" menu is never obscured by subsequent nodes in the DOM hierarchy.
- **Layout Robustness:** Wrappers utilize `flex-shrink-0` to ensure lines don't break when the tree grows wide.
- **Sequential Indicators:** Renders numbered badges (#1, #2) and vertical arrows for agents inside sequential groups.
- **Deletion UX:** Handles deletion logic for nested groups and hides controls in `readOnly` mode (used in Registry).

### 4. The Tools Library (`src/components/ToolsLibrary.tsx`)
The central repository for discovering and assigning capabilities to agents.
- **Tagging Architecture:**
  - Tools are no longer bound to a single "Category". They now possess a `tags: string[]` array (e.g., `['Transport', 'Data Retrieval']`).
  - **Filtering:** The `CategoryDropdown` component aggregates all unique tags from the registry. Selecting a tag filters the view to show any tool containing that tag.
- **Responsive Grid:**
  - Adapts from 1 column (Mobile) to 4 columns (Ultra-Wide).
  - **Pagination:** Renders 16 items per page to maximize density on large displays.
- **Inspector UI:**
  - **Mobile-First:** Renders as a full-screen modal on small devices (<1024px) to prevent layout breakage.
  - **Desktop:** slides in as a sidebar on the right.
  - **Hierarchy:** Displays Title -> Tool ID (High Visibility) -> Tags.
- **Search:** Real-time client-side filtering by name and description.

### 5. The Orchestration Engine (`src/services/orchestrator.ts`)
The runtime "Brain" running in the browser.
- **Coordinator Pattern:** Dynamically injects `delegate_to_agent` tools for agents with children.
- **Concurrent Execution:** Refactored to use `Promise.all` for processing tool calls. This allows the Coordinator to delegate tasks to multiple sub-agents simultaneously (e.g., "Ask Agent A and Agent B"), significantly reducing total latency for parallelizable workflows.
- **Recursive Execution:** Handles nested agent loops and message passing.
- **History Compression:** Automatically strips large Base64 image strings (`data:image/...`) from the conversation history before sending it to the model to prevent Token Limit errors. **Crucially**, for `veo-*` models (Image-to-Video), it now intelligently scans the *uncompressed* history to extract and pass the most recent generated image as a direct API parameter, ensuring context is preserved despite compression.
- **Echo Prevention (Silent Handoff):** 
  - Sub-Agents speak directly to the user UI via `onAgentResponse`.
  - The return value to the Coordinator is wrapped in a system tag: `[SYSTEM: The user has already seen this... DO NOT REPEAT]`.
  - System Instructions explicitly forbid the Coordinator from repeating info already displayed.
  - This ensures a clean chat where specialists show their work (multimedia/text) and the manager only intervenes to route or close the task.
- **Resilience Layer:** Implements `retryOperation` with exponential backoff for:
  - **429 Rate Limits:** Aggressive wait times (min 6s).
  - **503 Overloaded:** Standard backoff.
- **Media Handling:** 
  - **Veo 3.1 (Video):** Implements **Long-Running Operation (LRO)** polling via `predictLongRunning` and `fetchPredictOperation`.
    - **Recursive Response Parsing:** Uses a robust recursive search to locate video data (Base64) anywhere within the complex, nested JSON response from Vertex AI.
    - **Image-to-Video:** Supports generating videos from reference images by passing the image context explicitly to the backend.
    - **Exponential Backoff:** Polling starts at 5s and increases by 1.5x (capped at 60s) to optimize for both fast generation and long-running jobs.
  - **Imagen (Image):** returns Base64 data (stripped in history, rendered in UI).
  - **Specialized Handlers:** Detects `veo-*` and `imagen-*` models and routes them to `generateVideos` and `generateImages` APIs respectively, bypassing the default `generateContent` loop.
- **Limitations:** Detects conflicts between Function Calling and Google Search Grounding (which cannot be mixed on some models) and prioritizes functions for delegation.

### 5. Automated Evaluation (`src/services/evaluation.ts`)
An **LLM-as-a-Judge** system to stress-test agents.
- **Architecture:** 
  1. **Generator:** Uses `gemini-3-pro-preview` to invent realistic, challenging user scenarios based on the agent's goal.
  2. **Simulator:** Spawns a "User Simulator" (configurable model) that roleplays the scenario against the System Under Test.
  3. **Judge:** Uses `gemini-3-pro-preview` to analyze the transcript and score performance.
- **Judge Compression:** Since evaluation transcripts may contain massive Base64 images (from Imagen tests), the `evaluateTranscript` method runs a regex to strip this data (`compressForJudge`) before feeding it to the Judge LLM, preventing Token Limit errors.
- **Rich Media Capture:** The `runSimulation` loop explicitly listens to `onAgentResponse` callbacks to capture images and video links that are emitted "out-of-band" by specialized media agents. This ensures the evaluation report contains the visual artifacts generated during the test.
- **Metrics Tracked:**
  - **Quantitative:** API Latency (ms) per turn, Error Rate (%).
  - **Qualitative (1-10):** Accuracy, User Satisfaction, System Stability.
- **Concurrency Strategy:** 
  - Runs tests in **Parallel** if scenario count <= 3 (Fast).
  - Runs tests in **Sequential** batches if scenario count > 3 (Safe, prevents Rate Limits).
- **Latency Tracking:** `ChatMessage` now includes a `latency` field, visualized in the UI.

### 6. Agent Registry & Persistence (`src/components/AgentRegistry.tsx`, `src/services/storage.ts`)
- **Data Model:** `Agent` objects containing:
  - `subAgents`: Recursive hierarchy.
  - `sessions`: Historical chat logs with rich media.
  - `evaluations`: Array of `EvaluationReport` objects.
- **Registry Features:**
  - **Rich History Replay:** Reconstructs chat interfaces with images and secure video playback.
  - **Evaluation Dashboard:** Visualizes test reports with aggregate scores and drill-down views into individual scenario transcripts.
  - **Deletion:** Permanent removal of agents via `App.tsx` state management.
  - **Video Playback:** Uses `VideoMessage` component to fetch secure blobs for Veo content.
  - **Mobile Responsiveness:**
    - **Master-Detail Stack:** On mobile, the layout switches from a side-by-side view to a stacked approach. The "Sidebar" (Agent Info & Tabs) serves as the main view, with content (Architecture/History) accessible via tabs.
    - **Navigation:** Implemented robust back-navigation logic to prevent "blank screen" states when returning to the registry list.

### 7. The Watchtower (Observability Engine) (`src/services/watchtower.ts`)
A centralized observability dashboard for analyzing agent performance in the wild.
- **Batch Analysis:** Uses `gemini-3-pro-preview` to analyze batches of recent session transcripts (up to 20).
- **Transcript Compression:** Strips heavy media tokens before analysis to ensure the context window is used for reasoning, not raw pixels.
- **Intent Clustering:** Automatically groups unstructured chat sessions into named **Intent Groups** (e.g., "Refund Requests", "Technical Issues").
- **Sentiment & Latency:** Calculates aggregate sentiment scores (0-100) and latency averages per intent group.
- **Strategic Recommendations:** Generates actionable advice:
  - **Tooling:** Suggests new tools if users ask for unsupported capabilities.
  - **Behavior:** Suggests instruction tweaks if the agent is rude or verbose.



---

## 📂 File Structure & Responsibilities

### Deployment Architecture
The application uses a **Multi-Stage Docker Build** to optimize image size and security:
1.  **Build Stage (`node:18-alpine`)**: Installs dependencies and compiles the React application (`npm run build`).
2.  **Production Stage (`node:18-alpine`)**: Runs the Node.js backend (`server/index.js`) which serves the static assets and handles API requests.
    - **Port**: Exposes port `8080` to comply with Cloud Run requirements.
    - **Authentication**: Uses **Application Default Credentials (ADC)** via the Cloud Run Service Account. No API keys are needed.

### 1. Frontend (`src/`)
- **`src/types.ts`**: Source of Truth. Defines `Agent`, `Tool`, `ChatMessage`, `EvaluationReport`, `WatchtowerAnalysis`, etc.
- **`src/App.tsx`**: Application Root. Manages routing, global agent state, and LocalStorage persistence.
- **`src/components/AgentBuilder.tsx`**: Main workspace for creation and testing. Handles the "Build" and "Test" phases.
- **`src/components/AgentDiagram.tsx`**: Recursive tree visualization.
- **`src/components/AgentRegistry.tsx`**: Dashboard for auditing history and running evaluations.
- **`src/components/Watchtower.tsx`**: Observability dashboard for high-level insights and intent mapping.
- **`src/components/ToolsLibrary.tsx`**: Library view with code inspection and mock testing.
- **`src/components/LocationFinder.tsx`**: Wrapper for the Trip Planner location search UI.
- **`src/components/LocationAutocomplete.tsx`**: Reusable autocomplete component with portal-based rendering and scroll locking.
- **`src/components/TransportModeSelector.tsx`**: Wrapper for the transport mode selection UI.
- **`src/components/ModeDropdown.tsx`**: Reusable dropdown component for selecting transport modes.
- **`src/components/VideoMessage.tsx`**: Secure video player component using Blob URL fetching.
- **`src/services/orchestrator.ts`**: Client-side AI runtime and tool execution.
- **`src/services/evaluation.ts`**: Evaluation logic (Scenario Gen, Sim, Scoring).
- **`src/services/watchtower.ts`**: Batch analysis service for intent clustering and insights.
- **`src/services/mockAgentService.ts`**: Architect backend (Chat & JSON Gen).
- **`src/services/tools.ts`**: Registry of executable tools. See **[TOOLS.md](./TOOLS.md)** for detailed documentation.
- **`src/services/storage.ts`**: LocalStorage wrapper with Date hydration logic.

### 2. Backend (`server/`)
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Purpose**: Proxies requests to Vertex AI, handles authentication (ADC), and serves static assets in production.
- **Key Files**:
  - `server/index.js`: Main entry point (renamed from `server.js`). Configured with **50MB Payload Limit** to handle rich media history.
  - `Dockerfile`: Multi-stage build (Node.js build -> Node.js runtime).

### 3. Documentation (`docs/`)
- `IMPLEMENTATION.md`, `CHANGELOG.md`, `TOOLS.md`, `PLAN.md`.

### 4. Scripts (`scripts/`)
- `env.sh`, `test_*.js`, `debug-*.js`.

### 3. Frontend (React + Vite)
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **AI Integration**: Calls backend API (`/api/generate`) which wraps Vertex AI SDK.

## Authentication & Security
- **Production (Cloud Run)**: Uses **Application Default Credentials (ADC)** via the Cloud Run Service Account. No API keys are exposed to the client.
- **Local Development**: Uses `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account key file, or `gcloud auth application-default login`.

## Vertex AI Integration
- **Global Endpoints**: Used for `gemini-2.0-flash-exp`, `gemini-1.5-pro`, etc.
- **Regional Endpoints**: Used for `veo-2.0` and `imagen-3.0` (e.g., `us-central1`).
- **Routing**: `server/index.js` handles routing based on the requested model.

---

## 🛠 Tools Registry

**Source File**: [`src/services/tools.ts`](../src/services/tools.ts)

For a comprehensive list of all available tools, including their parameters and usage, please refer to **[TOOLS.md](./TOOLS.md)**.

| ID | Name | Category | Description |
|----|------|----------|-------------|
| `google_search` | Google Search | Grounding | Native Gemini Grounding. |
| `calculator` | Calculator | Utility | Math expression evaluation. |
| `get_current_time` | System Time | Utility | Returns ISO timestamp. |
| `web_search_mock` | Web Search (Mock) | Data Retrieval | Simulated search results. |
| `crm_customer_lookup` | CRM Lookup | Customer Service | Mock VIP/Customer data lookup. |
| `check_order_status` | Order Status | Customer Service | Mock logistics tracking. |
| `kb_search` | KB Search | Customer Service | Mock RAG/Policy search. |
| `create_support_ticket` | Create Ticket | Customer Service | Mock ticketing system. |
| `nsw_trains_realtime` | NSW Trains | Transport | Real-time train positions & delays (GTFS). |
| `nsw_metro_realtime` | NSW Metro | Transport | Real-time metro positions (GTFS). |
| `nsw_trip_planner` | Trip Planner | Transport | Multimodal route planning (Train, Metro, Ferry, etc). |
| `publish_report` | Publish Report | Utility | Generates a rich-text Markdown report card. |

---

## 🤖 Supported Models Configuration

| Model ID | Type | Use Case |
|----------|------|----------|
| `gemini-2.5-flash` | Text | Coordinator, JSON Fallback, Fast Tasks |
| `gemini-flash-lite-latest` | Text | High Throughput, Simple Tasks, Cost Efficient |
| `gemini-3-pro-preview` | Text | Reasoning, Evaluation Judge, Complex Arch |
| `gemini-2.5-flash-image` | Image | General Image Generation/Editing |
| `gemini-3-pro-image-preview` | Image | High-Quality Image Gen |
| `veo-3.1-fast-generate-preview` | Video | Video Agents |
| `imagen-4.0-generate-001` | Image | Photorealistic Image Agents |
| `imagen-4.0-fast-generate-001` | Image | Fast Photorealistic Image Agents |

## Changelog

Please refer to [CHANGELOG.md](./CHANGELOG.md) for the detailed history of changes.