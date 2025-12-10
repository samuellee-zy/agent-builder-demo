
# Agent Builder

**Agent Builder** is a production-grade web application for designing, building, and orchestrating Multi-Agent AI Systems. Built on the Google Gemini ecosystem, it empowers users to create sophisticated agent teams using natural language, visual diagrams, and a powerful client-side orchestration engine.

## 🚀 Key Features

### 🧠 Intelligent Design
*   **Conversational Architect:** Describe your goal, and the AI Architect will design the entire system.
*   **Smart Patterns:** Automatically detects workflows (Sequential vs Concurrent).
*   **Robust Generation:** Multi-model strategy for reliable architecture generation.

### 🎨 Visual Studio
*   **Recursive Diagram Builder:** Visualize hierarchy with Sequential/Concurrent layouts.
*   **Sequential Order Indicators:** Badges sequential agents (e.g., #1, #2).
*   **Full Control:** Add, edit, and **delete** nodes directly.
*   **Undo / Revert Changes:** History stack to recover from accidental changes.

### ⚡ Advanced Orchestration
*   **Client-Side Engine:** Runs entirely in browser.
*   **Coordinator Pattern:** Handles task delegation automatically.
*   **Sequential Sessions:** Auto-incrementing Session IDs (#1, #2) for clear tracking.
*   **Secure Video Playback:** Veo videos play securely via Blob URLs.
*   **Resilience:** Built-in exponential backoff for API reliability.
*   **Silent Handoff:** Intelligent context management prevents Coordinator agents from repeating sub-agent outputs.

### 📊 Automated Evaluation (LLM-as-a-Judge)
*   **Scenario Generation:** AI automatically invents realistic test scenarios based on agent goals.
*   **User Simulation:** Runs fully automated conversations between a "User Simulator" and your Agent.
*   **Performance Metrics:** 
    *   **Response Time:** Visualized latency (ms) per chat bubble.
    *   **Accuracy:** Factual correctness of responses.
    *   **User Satisfaction:** Sentiment analysis of the interaction.
    *   **Stability:** Error rates and API reliability.
*   **Visual Reports:** Detailed dashboards with scorecards and transcript analysis.

### 🔭 Watchtower (Observability)
*   **Intent Clustering:** Automatically groups user sessions into distinct Intents (e.g., "Refunds", "Support").
*   **Sentiment & Latency Analysis:** High-level metrics for global agent health.
*   **Strategic Recommendations:** AI-generated advice on missing tools or instruction improvements based on actual session data.

### 💾 Registry & History
*   **Persistent Storage:** Save agents to LocalStorage.
*   **Rich History Replay:** Review past sessions with full media rendering (Veo/Imagen).
*   **Evaluation Logs:** Access historical test reports and drill down into individual scenario transcripts.
*   **Tool Library:** Inspect code and test functions for over 8+ built-in tools.

## 💻 Tech Stack
*   **Frontend:** React 18, TypeScript, Tailwind CSS (via CDN/Config)
*   **Build Tool:** Vite
*   **AI:** Google GenAI SDK (`@google/genai`)

## 📖 Documentation
For a deep dive into the code structure, file responsibilities, undo architecture, and orchestration patterns, please refer to **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**.

---

## 🛠️ Local Deployment Instructions

Follow these steps to run the Agent Builder on your local machine.

### Prerequisites
Before you begin, ensure you have the following installed on your computer:
1.  **Node.js** (Version 18 or higher): [Download Node.js](https://nodejs.org/).
2.  **Git**: [Download Git](https://git-scm.com/).
3.  **Gemini API Key**: You must have a valid API Key from [Google AI Studio](https://aistudio.google.com/).

### Step-by-Step Guide

1.  **Clone the Repository**
    Open your terminal or command prompt and run the following commands to download the code:
    ```bash
    git clone <repository-url>
    cd agent-builder
    ```
    *(If you downloaded the code as a ZIP file, extract it and open your terminal in the extracted folder)*

2.  **Install Dependencies**
    Install the required software packages by running:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    1.  Create a new file in the root directory of the project named `.env`.
    2.  Open the file in a text editor and add your API Key in the following format:
    ```env
    API_KEY=your_actual_api_key_starts_with_AIza...
    ```
    *Note: Do not wrap the key in quotes.*

4.  **Start the Application**
    Run the development server:
    ```bash
    npm run dev
    ```

5.  **Access the App**
    Once the server starts, open your web browser and navigate to the URL shown in the terminal, usually:
    `http://localhost:5173`
