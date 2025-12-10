
# Agent Builder - Implementation Reference

## Project Overview
**Agent Builder** is a production-grade, client-side React application for designing, building, and orchestrating Multi-Agent AI Systems using the Google Gemini ecosystem. 

It implements the **Coordinator Pattern**, where a top-level "Root Agent" decomposes user requests and delegates tasks to specialized "Sub-Agents" or execution groups (Sequential/Concurrent). The application runs entirely in the browser, leveraging `@google/genai` for intelligence and `localStorage` for persistence.

---

## 🏗 Core Architecture

### 1. The AI Architect (`services/mockAgentService.ts`)
The entry point for creation. It uses a "Human-in-the-Loop" design process.
- **Conversational Interface:** Uses `gemini-2.5-flash` to interview the user about their goals.
- **System Generation:** Uses `gemini-3-pro-preview` to generate a recursive JSON structure defining the agent hierarchy.
- **Reliability Strategy:**
  - **Prompt Engineering:** Explicitly requests "group" nodes (`sequential` or `concurrent`) for structured workflows.
  - **Multi-Model Fallback:** If Gemini 3 Pro returns malformed JSON, automatically falls back to `gemini-2.5-flash`.
  - **Hydration:** Ensures all generated nodes have unique IDs, timestamps, and default models.
  - **JSON Cleaning:** Implements `cleanJson` utility to strip Markdown fences from LLM responses before parsing.
- **Pure Coordinator Pattern:** The Architect is instructed to never assign tools to a Root Agent if it has sub-agents. Tools are pushed down to leaf nodes to ensure clean delegation and avoid API conflicts (Search vs Function Calling).

### 2. The Visual Builder (`components/AgentBuilder.tsx`)
A state-machine driven component managing the lifecycle of an agent.
- **State Machine:** Input -> Building -> Review -> Testing.
- **Undo/Revert Architecture:** Maintains a `history` stack of the agent tree. Destructive actions (delete, add sub-agent) call `saveCheckpoint()` first. `handleUndo` restores the previous state.
- **Node Management:** Recursive update and deletion logic. `deleteNodeFromTree` handles deep removal of nodes.
- **Sequential Session IDs:** 
  - Instead of random timestamps, new test sessions are assigned strict sequential IDs (1, 2, 3...).
  - **Logic:** Scans existing sessions, filters out legacy timestamp-based IDs (>1 billion), finds the current maximum, and increments by 1.
- **Message Deduplication:** Checks incoming messages from the Orchestrator against the last displayed message to prevent the "Echoing" effect where a parent agent repeats the child's output verbatim.

### 3. The Visual Diagram (`components/AgentDiagram.tsx`)
The recursive visualization engine for the agent tree.
- **Seamless Connectors:** Refactored to use `w-[calc(50%+1px)]` logic to create perfect overlaps between horizontal arms and vertical stems. Lines are now 2px thick (`w-0.5`, `h-0.5`) and colored `slate-700` for high visibility.
- **Dynamic Layering (Z-Index):** Implements a `nodeZIndex` strategy (`z-50` when active, `z-10` default) to ensure that the "Add Sub-Agent" menu is never obscured by subsequent nodes in the DOM hierarchy.
- **Layout Robustness:** Wrappers utilize `flex-shrink-0` to ensure lines don't break when the tree grows wide.
- **Sequential Indicators:** Renders numbered badges (#1, #2) and vertical arrows for agents inside sequential groups.
- **Deletion UX:** Handles deletion logic for nested groups and hides controls in `readOnly` mode (used in Registry).

### 4. The Orchestration Engine (`services/orchestrator.ts`)
The runtime "Brain" running in the browser.
- **Coordinator Pattern:** Dynamically injects `delegate_to_agent` tools for agents with children.
- **Recursive Execution:** Handles nested agent loops and message passing.
- **History Compression:** Automatically strips large Base64 image strings (`data:image/...`) from the conversation history before sending it to the model. This is critical to prevent hitting the 1M token limit (`400 INVALID_ARGUMENT`) during sessions involving image generation.
- **Echo Prevention (Silent Handoff):** 
  - Sub-Agents speak directly to the user UI via `onAgentResponse`.
  - The return value to the Coordinator is wrapped in a system tag: `[SYSTEM: The user has already seen this... DO NOT REPEAT]`.
  - System Instructions explicitly forbid the Coordinator from repeating info already displayed.
  - This ensures a clean chat where specialists show their work (multimedia/text) and the manager only intervenes to route or close the task.
- **Resilience Layer:** Implements `retryOperation` with exponential backoff for:
  - **429 Rate Limits:** Aggressive wait times (min 6s).
  - **503 Overloaded:** Standard backoff.
- **Media Handling:** 
  - **Veo:** Polls for video completion and returns secure URLs.
  - **Imagen:** returns Base64 data (stripped in history, rendered in UI).
  - **Specialized Handlers:** Detects `veo-*` and `imagen-*` models and routes them to `generateVideos` and `generateImages` APIs respectively, bypassing the default `generateContent` loop.
- **Limitations:** Detects conflicts between Function Calling and Google Search Grounding (which cannot be mixed on some models) and prioritizes functions for delegation.

### 5. Automated Evaluation (`services/evaluation.ts`)
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

### 6. Agent Registry & Persistence (`components/AgentRegistry.tsx`, `services/storage.ts`)
- **Data Model:** `Agent` objects containing:
  - `subAgents`: Recursive hierarchy.
  - `sessions`: Historical chat logs with rich media.
  - `evaluations`: Array of `EvaluationReport` objects.
- **Registry Features:**
  - **Rich History Replay:** Reconstructs chat interfaces with images and secure video playback.
  - **Evaluation Dashboard:** Visualizes test reports with aggregate scores and drill-down views into individual scenario transcripts.
  - **Deletion:** Permanent removal of agents via `App.tsx` state management.
  - **Video Playback:** Uses `VideoMessage` component to fetch secure blobs for Veo content.

### 7. The Watchtower (Observability Engine) (`services/watchtower.ts`)
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

- **`types.ts`**: Source of Truth. Defines `Agent`, `Tool`, `ChatMessage`, `EvaluationReport`, `WatchtowerAnalysis`, etc.
- **`App.tsx`**: Application Root. Manages routing, global agent state, and LocalStorage persistence.
- **`components/AgentBuilder.tsx`**: Main workspace for creation and testing. Handles the "Build" and "Test" phases.
- **`components/AgentDiagram.tsx`**: Recursive tree visualization.
- **`components/AgentRegistry.tsx`**: Dashboard for auditing history and running evaluations.
- **`components/Watchtower.tsx`**: Observability dashboard for high-level insights and intent mapping.
- **`components/ToolsLibrary.tsx`**: Library view with code inspection and mock testing.
- **`components/VideoMessage.tsx`**: Secure video player component using Blob URL fetching.
- **`services/orchestrator.ts`**: Client-side AI runtime and tool execution.
- **`services/evaluation.ts`**: Evaluation logic (Scenario Gen, Sim, Scoring).
- **`services/watchtower.ts`**: Batch analysis service for intent clustering and insights.
- **`services/mockAgentService.ts`**: Architect backend (Chat & JSON Gen).
- **`services/tools.ts`**: Registry of executable tools.
- **`services/storage.ts`**: LocalStorage wrapper with Date hydration logic.

---

## 🛠 Tools Registry (`services/tools.ts`)

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