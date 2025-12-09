
# Agent Builder

**Agent Builder** is a production-grade web application for designing, building, and orchestrating Multi-Agent AI Systems. Built on the Google Gemini ecosystem, it empowers users to create sophisticated agent teams using natural language, visual diagrams, and a powerful client-side orchestration engine.

## 🚀 Key Features

### 🧠 Intelligent Design
*   **Conversational Architect:** Describe your goal (e.g., "Create a marketing team that researches trends and generates video ads"), and the AI Architect will design the entire system for you.
*   **Smart Patterns:** Automatically detects workflows and structures them into **Sequential** (step-by-step) or **Concurrent** (parallel) execution groups.
*   **Robust Generation:** Uses a multi-model strategy (Gemini 3 Pro + Flash Fallback) to ensure valid architectures are always generated.

### 🎨 Visual Studio
*   **Recursive Diagram Builder:** Visualize your agent hierarchy.
*   **Full Control:** Add sub-agents, create flow groups, and **delete nodes** directly from the canvas.
*   **Inspector Panel:** Fine-tune every aspect of an agent: Name, Goal, Model, Tools, and Instructions (with AI Enhancement).

### ⚡ Advanced Orchestration
*   **Client-Side Engine:** Runs entirely in your browser using the `@google/genai` SDK.
*   **Coordinator Pattern:** Automatically handles task delegation from Root Agents to Sub-Agents.
*   **Secure Video Playback:** Generated Veo videos are securely fetched and streamed via local Blobs, ensuring smooth playback without auth errors.
*   **Resilience:** Built-in exponential backoff handles API overloads (503) gracefully.

### 💾 Registry & History
*   **Persistent Storage:** All agents are saved locally.
*   **Session Logging:** Every conversation is recorded.
*   **History Replay:** Review past interactions in the Agent Registry with a clean, redacted view for heavy media.

### 🛠 Tools & Models
*   **Integrated Library:** Google Search (Grounding), Calculator, System Time.
*   **Multimodal Support:**
    *   **Text/Logic:** Gemini 2.5 Flash, Gemini 3 Pro.
    *   **Video:** Veo 3.1.
    *   **Image:** Imagen 4, Gemini 3 Pro Image.

## 💻 Tech Stack
*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **AI:** Google GenAI SDK (`@google/genai`)
*   **Icons:** Lucide React

## 📖 Documentation
For a deep dive into the code structure, file responsibilities, and architectural patterns, please refer to **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**.
