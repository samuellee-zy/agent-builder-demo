

# Agent Builder - Implementation Reference

## Project Overview
**Agent Builder** is a client-side React application that enables users to design, build, and orchestrate Multi-Agent AI Systems using the Google Gemini ecosystem. 

It implements the **Coordinator Pattern**, where a top-level "Root Agent" decomposes user requests and delegates tasks to specialized "Sub-Agents" or execution groups (Sequential/Concurrent).

---

## 🏗 Core Architecture

### 1. The AI Architect (`services/mockAgentService.ts`)
The entry point for creation. It uses a "Human-in-the-Loop" design process.
- **Conversational Interface:** Uses `gemini-2.5-flash` to interview the user about their goals.
- **System Generation:** Uses `gemini-3-pro-preview` to generate a recursive JSON structure defining the agent hierarchy.
- **Reliability Strategy:**
  - **Prompt Engineering:** Explicitly requests "group" nodes (`sequential` or `concurrent`) for structured workflows.
  - **Multi-Model Fallback:** If Gemini 3 Pro returns malformed JSON (common with complex reasoning), the service automatically falls back to `gemini-2.5-flash` (forced JSON mode) to ensure a valid object is returned.
  - **Hydration:** Ensures all generated nodes have unique IDs, timestamps, and default models to prevent UI crashes.

### 2. The Visual Builder (`components/AgentBuilder.tsx`)
A state-machine driven component managing the lifecycle of an agent.
- **States:** `input` (Chat) -> `building` (Spinner) -> `review` (Diagram) -> `testing` (Chat).
- **Tree Management:**
  - **Recursive Updates:** Uses immutable state patterns to update deeply nested sub-agents.
  - **Node Deletion:** Implements `deleteNodeFromTree` to recursively remove any node (and its children) from the hierarchy, preventing orphaned references.
- **Inspector Panel:** Allows editing of:
  - Agent Metadata (Name, Goal).
  - Model Selection (Veo, Imagen, Gemini).
  - Tools (Toggle from Registry).
  - **AOP (Agent Operating Procedure):** Markdown editor with "AI Enhance" capability.

### 3. The Orchestration Engine (`services/orchestrator.ts`)
The runtime "Brain" running in the browser.
- **Coordinator Pattern:** 
  - Automatically injects a `delegate_to_agent` tool into any agent that has `subAgents`.
  - This allows the LLM to decide *when* to offload work.
- **Leaf-Node Grounding:** 
  - **Constraint:** The Gemini API cannot mix Function Declarations (used for delegation) and Google Search Grounding efficiently in all contexts.
  - **Solution:** The Orchestrator detects this conflict. If an agent has sub-agents (needs functions), Google Search is disabled for that node. Search is prioritized for "Leaf Nodes" (workers) that do not delegate.
- **Media Generation:**
  - **Video (Veo):** Calls `generateVideos`, polls for completion, and returns a markdown link.
  - **Image (Imagen/Gemini):** Calls `generateImages` or `generateContent`, parses Base64 data, and returns markdown images.
- **Resilience:** 
  - Implements a generic `retryOperation` with exponential backoff to handle `503 Service Unavailable` and `429 Too Many Requests` errors.

### 4. Secure Media Handling (`components/AgentBuilder.tsx` -> `VideoMessage`)
- **Problem:** Veo video URIs require an API key to be accessed. Appending the key directly in a `<video src="...">` tag can lead to CORS issues or security warnings.
- **Solution:** The `VideoMessage` component:
  1. Takes the authenticated URI.
  2. Uses `fetch()` to download the video as a `Blob`.
  3. Creates a local `URL.createObjectURL(blob)`.
  4. Renders the `<video>` tag using this local object URL, ensuring reliable playback.

### 5. Agent Registry & Persistence (`services/storage.ts`, `components/AgentRegistry.tsx`)
- **Storage:** Persists the entire `Agent[]` array to LocalStorage.
- **Session Logging:** 
  - Every message sent in the "Test" interface is recorded in real-time to `agent.sessions`.
  - Timestamps are hydrated from JSON strings back to `Date` objects on load.
- **Registry UI:**
  - **Grid View:** Summarizes agents, showing stats for models and tools.
  - **Deletion:** Supports permanent deletion of individual agents via the grid view, triggering an update to LocalStorage.
  - **Read-Only Inspector:** Reuses the `AgentDiagram` but locks interactions. Allows users to click nodes to view their config without risk of editing.
  - **History Replay:** A chat viewer that reconstructs past conversations. Heavy media (Videos) are replaced with placeholders (`[Video Generated]`) to keep the history view lightweight.

---

## 📂 File Reference

### `types.ts`
- **Agent:** Recursive interface (`subAgents: Agent[]`), supports `type: 'group'` and `groupMode`.
- **AgentSession:** Stores interaction history (`messages`, `timestamp`).
- **Tool:** Defines `executable` (JS function) and `functionDeclaration` (API Schema).
- **Global:** Extends `Window` for `aistudio` billing types.

### `services/tools.ts`
- **Registry:** `AVAILABLE_TOOLS_REGISTRY` maps IDs to implementations.
- **List:** `AVAILABLE_TOOLS_LIST` provides a flat array for UI iteration.
- **Tools:** Includes standard utilities (`calculator`, `google_search`) and specialized Customer Service tools (`crm_customer_lookup`, `check_order_status`, etc.).

### `components/ToolsLibrary.tsx`
- **Dynamic Source:** Imports directly from `services/tools.ts` to ensure consistency with the Orchestrator.
- **Categorization:** Groups tools visually by their `category` field for better browsing.

### `components/AgentDiagram.tsx`
- **Recursive Component:** Renders the tree structure.
- **Visuals:** Distinguishes between "Sequential" (Vertical stack) and "Concurrent" (Horizontal row) groups.
- **Interactions:** Supports "Add Sub-Agent", "Add Group", and "Delete Node" (via trash icon).
- **Sequential Numbering:** If a group is `sequential`, children render with a badge (e.g., `#1`, `#2`) to indicate execution order.

### `components/Sidebar.tsx`
- **Navigation:** Tabs for Overview, Watchtower, AOP, Registry, Tools.
- **Recent Agents:** Lists last 5 agents with `DD/MM/YYYY` date formatting.

### `App.tsx`
- **Routing:** Manages active tab state.
- **Persistence:** Triggers `saveAgentsToStorage` whenever the agent list updates.
- **State Actions:** Handles `handleDeleteAgent` to remove agents globally.

---

## 🤖 Supported Models

| Model ID | Capability | Usage Context |
|----------|------------|---------------|
| `gemini-2.5-flash` | Text, Tools, Speed | Default coordinator, JSON fallback |
| `gemini-3-pro-preview` | Reasoning, Coding | Complex instructions, Architect Brain |
| `gemini-2.5-flash-image` | General Image | Fast image editing/generation |
| `gemini-3-pro-image-preview` | High-Quality Image | Multimodal understanding |
| `veo-3.1-fast-generate-preview` | Video Generation | Video Agents (Paid Key Required) |
| `veo-3.0-fast-generate` | Fast Video Generation | Legacy Video Agents (Paid Key Required) |
| `imagen-4.0-generate-001` | Photorealistic Image | Art/Design Agents (Paid Key Required) |

---

## ⚠️ Known Limitations & Constraints
1.  **Browser Memory:** LocalStorage has a limit (usually 5MB). Extensive history logging with many agents may eventually hit this cap.
2.  **API Keys:** Veo and Imagen models require a billing-enabled Google Cloud Project API key. The app prompts the user for this via `window.aistudio.openSelectKey()`.
3.  **Function/Search Conflict:** As noted, nodes cannot currently use custom tools/delegation AND Google Search simultaneously due to API limitations. The Orchestrator auto-resolves this by prioritizing delegation.