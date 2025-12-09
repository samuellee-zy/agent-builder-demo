
# Agent Builder - Project Status & Documentation

## Overview
**Agent Builder** is a web-based interface for designing, building, and testing Multi-Agent AI Systems using the Google Gemini ecosystem. It employs a **Coordinator Pattern** where a Root Agent orchestrates tasks by delegating to specialized Sub-Agents or execution groups.

---

## Core Features

### 1. Architect Interface
- **Hero Input:** A natural language starting point for defining agent goals.
- **Skip to Builder:** Users can bypass the chat interface and immediately access the Visual Diagram Builder with a default Root Agent template.
- **Conversational Refinement:** An "AI Architect" (powered by Gemini 2.5 Flash) interviews the user to define the system structure, recommending models and tools.
- **Visual Diagram Builder:** A recursive tree visualization allowing users to:
  - Add Sub-Agents.
  - Create **Sequential** or **Concurrent** execution groups.
  - Visualize the hierarchy.

### 2. Agent Configuration (Inspector Panel)
- **Metadata:** Edit Name, Goal, and Description.
- **Model Selection:** Assign specific models per agent (e.g., Veo for video, Gemini 3 Pro for reasoning).
- **Tools Assignment:** Toggle tools from the library.
- **Agent Operating Procedure (AOP):** Markdown editor with **AI Enhance** capability (Gemini 3 Pro) to professionalize instructions.

### 3. Orchestration Engine (`services/orchestrator.ts`)
- **Client-Side Execution:** The engine runs entirely in the browser using the `@google/genai` SDK.
- **Coordinator Pattern:** Automatically injects a `delegate_to_agent` tool into parent agents, enabling recursive task delegation.
- **Tool Execution:** Handles local JS tools (Calculator, Time) and native API tools (Google Search).
- **Media Generation:**
  - **Video:** Supports `veo-3.1-fast-generate-preview` with polling logic and MP4 rendering.
  - **Image:** Supports `imagen-4.0-generate-001` and `gemini-3-pro-image-preview` with Base64 rendering.
- **Streaming:** Emits `onAgentResponse` events to stream Sub-Agent thoughts and outputs to the UI in real-time.
- **Resilience:** Implements exponential backoff retry logic for API calls.

### 4. Tools Library
- **Native:** Google Search (Grounding with citations).
- **Utility:** Calculator, System Time.
- **Mock:** Simulated Web Search (for demos).
- **Extensible:** Architecture supports adding new executable JS functions easily.

### 5. Persistence
- **LocalStorage:** Agents are automatically saved to the browser's local storage via `services/storage.ts`, persisting them across sessions.

---

## Technical Reference (File-by-File)

### `types.ts`
**Role:** Domain Model Definitions.
- **Key Interfaces:**
  - `Agent`: Recursive structure (`subAgents: Agent[]`), supports `type` ('agent' | 'group') and `groupMode`.
  - `Tool`: Defines both the Gemini `FunctionDeclaration` schema and the client-side `executable` JS function.
  - `ChatMessage`: Includes `sender` to distinguish between Root and Sub-Agents.
- **Constants:** `AVAILABLE_MODELS` (definitions of capabilities) and `AVAILABLE_TOOLS` (raw data).
- **Type Augmentation:** Extends `Window` to support `aistudio` billing methods.

### `services/orchestrator.ts`
**Role:** The "Brain" / Execution Engine.
- **`AgentOrchestrator` Class:**
  - **`sendMessage()`**: Entry point.
  - **`runAgentLoop()`**: The core recursive loop.
    - **Logic:**
      1. Detects Model Type (Veo vs Imagen vs Standard).
      2. If Standard: Inject `delegate_to_agent` tool dynamically based on `subAgents`.
      3. Call Gemini API.
      4. If Tool Call -> Execute locally -> Loop back to API with result.
      5. If Text -> Return.
    - **Events:** Emits `onToolStart`, `onToolEnd`, `onAgentResponse` to update UI.
  - **`retrySendMessage()`**: Implements exponential backoff for 429/503 errors.
  - **`isPaidModelInUse()`**: Static utility to traverse the agent tree and detect if billing is required.

### `services/mockAgentService.ts`
**Role:** The "Architect" / System Design.
- **`sendArchitectMessage()`**: Manages the chat personality that interviews the user.
- **`generateArchitectureFromChat()`**: Takes the chat history and prompts Gemini 3 Pro to output a **recursive JSON structure** representing the final agent tree.
  - *Critical:* Enforces strict JSON formatting and validates the Root Agent structure.

### `services/storage.ts`
**Role:** Persistence Layer.
- **`saveAgentsToStorage()`**: Serializes the `Agent[]` to JSON strings in LocalStorage.
- **`loadAgentsFromStorage()`**: Deserializes JSON and hydrates date strings back into `Date` objects.

### `components/AgentBuilder.tsx`
**Role:** Main Application Logic & View Controller.
- **State Machine (`step`):**
  - `input`: Hero / Chat View.
  - `building`: Loading spinner during JSON generation.
  - `review`: Split-pane view (Diagram + Inspector).
  - `testing`: The final chat interface.
- **`AgentNode` Component:** Recursive React component for rendering the tree diagram. Handles "Add Sub-Agent" and Group visualization.
- **`handleSkipToVisualBuilder()`**: Initializes a default Root Agent and transitions immediately to the `review` step, bypassing the architect chat.
- **`handleTestSendMessage()`**: Instantiates the `AgentOrchestrator` and binds UI callbacks to stream responses.
- **Billing Integration:** Checks `window.aistudio.hasSelectedApiKey()` before starting tests with paid models.

### `services/tools.ts`
**Role:** Tool Registry.
- Exports `AVAILABLE_TOOLS_REGISTRY` mapping IDs to implementations.
- **Native Handling:** `google_search` is marked specifically for the Orchestrator to inject `googleSearch: {}` into the API config instead of a function declaration.

---

## Supported Models Configuration
| Model ID | Usage | Features |
|----------|-------|----------|
| `gemini-2.5-flash` | Default / Coordinator | Fast, Function Calling, Grounding |
| `gemini-3-pro-preview` | Reasoning / Coding | Complex Logic, Function Calling, Grounding |
| `veo-3.1-fast-generate-preview` | Video Agent | Video Generation (Requires Paid Key) |
| `imagen-4.0-generate-001` | Image Agent | Image Generation (Requires Paid Key) |
| `gemini-3-pro-image-preview` | Multimodal | High-Quality Image Gen & Understanding |

## UX Details
- **Billing Awareness:** Automatically detects paid models (Veo/Imagen) and prompts the user to select a Google Cloud Project API Key via `window.aistudio`.
- **Chat Interface:**
  - Sender identification (Root vs. Sub-Agent).
  - Tool execution logs ("Thinking...", "Delegating...").
  - Auto-focus and specialized rendering for Markdown, Video, and Images.
  - Error handling with manual retry.
