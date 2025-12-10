

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
- **Message Deduplication:** Checks incoming messages from the Orchestrator against the last displayed message to prevent the "Echoing" effect where a parent agent repeats the child's output verbatim.

### 3. The Visual Diagram (`components/AgentDiagram.tsx`)
The recursive visualization engine for the agent tree.
- **Sequential Indicators:** Renders numbered badges (#1, #2) for agents inside sequential groups.
- **Deletion UX:** Handles deletion logic for nested groups and hides controls in `readOnly` mode (used in Registry).

### 4. The Orchestration Engine (`services/orchestrator.ts`)
The runtime "Brain" running in the browser.
- **Coordinator Pattern:** Dynamically injects `delegate_to_agent` tools for agents with children.
- **Recursive Execution:** Handles nested agent loops and message passing.
- **Echo Prevention:** System instructions explicitly warn Coordinators not to repeat sub-agent outputs verbatim.
- **Resilience Layer:** Implements `retryOperation` with exponential backoff for:
  - **429 Rate Limits:** Aggressive wait times (min 6s).
  - **503 Overloaded:** Standard backoff.
- **Media Handling:** 
  - **Veo:** Polls for video completion and returns secure URLs.
  - **Imagen:** returns Base64 data.
- **Limitations:** Detects conflicts between Function Calling and Google Search Grounding (which cannot be mixed on some models) and prioritizes functions for delegation.

### 5. Automated Evaluation (`services/evaluation.ts`)
An **LLM-as-a-Judge** system to stress-test agents.
- **Architecture:** 
  1. **Generator:** Uses `gemini-3-pro-preview` to invent realistic, challenging user scenarios based on the agent's goal.
  2. **Simulator:** Spawns a "User Simulator" (configurable model) that roleplays the scenario against the System Under Test.
  3. **Judge:** Uses `gemini-3-pro-preview` to analyze the transcript and score performance.
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

---

## 📂 File Structure & Responsibilities

- **`types.ts`**: Source of Truth. Defines `Agent`, `Tool`, `ChatMessage`, `EvaluationReport`, `EvaluationSession`, etc.
- **`App.tsx`**: Application Root. Manages routing, global agent state, and LocalStorage persistence.
- **`components/AgentBuilder.tsx`**: Main workspace for creation and testing. Handles the "Build" and "Test" phases.
- **`components/AgentDiagram.tsx`**: Recursive tree visualization.
- **`components/AgentRegistry.tsx`**: Dashboard for auditing history and running evaluations.
- **`components/ToolsLibrary.tsx`**: Library view with code inspection and mock testing.
- **`components/VideoMessage.tsx`**: Secure video player component using Blob URL fetching.
- **`services/orchestrator.ts`**: Client-side AI runtime and tool execution.
- **`services/evaluation.ts`**: Evaluation logic (Scenario Gen, Sim, Scoring).
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
| `gemini-3-pro-preview` | Text | Reasoning, Evaluation Judge, Complex Arch |
| `gemini-2.5-flash-image` | Image | General Image Generation/Editing |
| `gemini-3-pro-image-preview` | Image | High-Quality Image Gen |
| `veo-3.1-fast-generate-preview` | Video | Video Agents |
| `veo-3.0-fast-generate` | Video | Fast Video Agents |
| `imagen-4.0-generate-001` | Image | Photorealistic Image Agents |

## Changelog

### [Current Date] - Evaluation Resilience Update
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
