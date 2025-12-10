
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
*   **Evaluation Logs:** Access historical test reports and drill down into failure cases.
*   **Tool Library:** Inspect code and test functions for over 8+ built-in tools.

## 💻 Tech Stack
*   **Frontend:** React 18, TypeScript, Tailwind CSS (via CDN/Config)
*   **Build Tool:** Vite
*   **AI:** Google GenAI SDK (`@google/genai`)

## 📖 Documentation
For a deep dive into the code structure, file responsibilities, undo architecture, and orchestration patterns, please refer to **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**.

---

## 🛠️ Deployment Instructions

### Prerequisites
1.  **Node.js**: Version 18 or higher installed.
2.  **Git**: Installed and configured.
3.  **Google Cloud Project**: Required for deploying to Cloud Run.
4.  **Gemini API Key**: You must have a valid API Key from [Google AI Studio](https://aistudio.google.com/).

### Option 1: Local Deployment

Run the application on your local machine for development or testing.

1.  **Clone the Repository** (if applicable) or navigate to the project root.
    ```bash
    cd agent-builder
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a file named `.env` in the root directory.
    ```env
    API_KEY=your_actual_gemini_api_key_here
    ```
    *Note: The application uses `process.env.API_KEY`. The Vite configuration automatically injects this from your `.env` file.*

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open your browser to `http://localhost:5173`.

### Option 2: Deploy to Google Cloud Run

Deploy the application as a scalable, serverless container.

**Prerequisites:**
*   [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (gcloud CLI) installed.
*   Docker installed (optional, but recommended for testing images).

1.  **Authenticate with Google Cloud**
    ```bash
    gcloud auth login
    gcloud config set project YOUR_PROJECT_ID
    ```

2.  **Enable Required Services**
    ```bash
    gcloud services enable run.googleapis.com cloudbuild.googleapis.com
    ```

3.  **Deploy using Cloud Build**
    This method builds the container in the cloud and deploys it. You do not need Docker installed locally.

    Run the following command. Replace `[YOUR_API_KEY]` with your actual key.
    
    *Security Note: For production, it is recommended to insert the API key at runtime or require the user to input it in the UI, rather than baking it into the build.*

    ```bash
    gcloud run deploy agent-builder \
      --source . \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars API_KEY=[YOUR_API_KEY]
    ```

    *Note on Build Arguments*: If the build fails because it can't find the API Key during the build process, you may need to use `gcloud builds submit` with substitutions, or update the `Dockerfile` to accept the key as an ARG.

    **Alternative: Docker Build & Push (Manual)**
    
    1.  **Build the Image**
        ```bash
        docker build --build-arg API_KEY=your_key_here -t gcr.io/YOUR_PROJECT_ID/agent-builder .
        ```
    
    2.  **Push to Container Registry**
        ```bash
        docker push gcr.io/YOUR_PROJECT_ID/agent-builder
        ```
    
    3.  **Deploy**
        ```bash
        gcloud run deploy agent-builder \
          --image gcr.io/YOUR_PROJECT_ID/agent-builder \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated
        ```

4.  **Access the App**
    Once deployment is complete, the terminal will display a URL (e.g., `https://agent-builder-xyz-uc.a.run.app`). Click it to access your live Agent Builder.
