
# Agent Builder

**Agent Builder** is a production-grade web application for designing, building, and orchestrating Multi-Agent AI Systems. Built on the Google Gemini ecosystem, it empowers users to create sophisticated agent teams using natural language, visual diagrams, and a powerful client-side orchestration engine.

## 🚀 Key Features

### 🧠 Intelligent Design
*   **Conversational Architect:** Describe your goal, and the AI Architect will design the entire system.
*   **Model Selection:** Choose between **Gemini 2.5 Flash** (Speed) or **Gemini 3.0 Pro** (Reasoning) for your design partner.
*   **Session Isolation:** "New Agent" always starts fresh, while history is preserved for every specific agent draft.
*   **Persistent Memory:** Chat sessions are saved locally (IndexedDB), so you never lose your context even after a refresh.
*   **Instruction Enhancement:** One-click "Enhance" button to professionally rewrite agent instructions using Gemini.
*   **Smart Patterns:** Automatically detects workflows (Sequential vs Concurrent).
*   **Robust Generation:** Multi-model strategy for reliable architecture generation.

### 📱 Mobile & Tablet Optimized
*   **Responsive Design:** Fully functional on mobile devices with touch-friendly interfaces.
*   **Tablet Ready:** Optimized for iPad Mini and Foldable devices (768px+) with smart "drawer-mode" layouts.
*   **Adaptive Layouts:** Smart stacking for Agent Registry and Tools Library on small screens.
*   **Touch Gestures:** Native panning and zooming for the Agent Diagram.
*   **Mobile Inspector:** Full-screen configuration panels for easy editing on the go.

### 🎨 Visual Studio
*   **Recursive Diagram Builder:** Visualize hierarchy with Sequential/Concurrent layouts.
*   **Sequential Order Indicators:** Badges sequential agents (e.g., #1, #2).
*   **Full Control:** Add, edit, and **delete** nodes directly.
*   **Undo / Revert Changes:** History stack to recover from accidental changes.

### ⚡ Advanced Orchestration
*   **Client-Side Engine:** Runs entirely in browser.
*   **Coordinator Pattern:** Handles task delegation automatically.
*   **Sequential Sessions:** Auto-incrementing Session IDs (#1, #2) for clear tracking.
*   **Image-to-Video:** Generate videos from reference images using Veo 3.1.
*   **Secure Video Playback:** Veo videos play securely via Blob URLs.
*   **Resilience:** Built-in exponential backoff for API reliability.
*   **Silent Handoff:** Intelligent context management prevents Coordinator agents from repeating sub-agent outputs.
*   **Rich Text Reporting:** Agents can publish beautifully formatted Markdown reports (tables, lists) via the `publish_report` tool.

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

### 🔌 Integrated Tools
*   **Google Search**: Native grounding for up-to-date information.
*   **NSW Transport**: Real-time data for Trains, Metro, and Trip Planning (GTFS-R).
*   **Veo & Imagen**: State-of-the-art Generative Media tools.
*   **Mock Enterprise Tools**: CRM, Order Status, and Ticketing systems for business demos.

### 💾 Registry & History
*   **Persistent Storage:** Save agents to LocalStorage.
*   **Rich History Replay:** Review past sessions with full media rendering (Veo/Imagen).
*   **Evaluation Logs:** Access historical test reports and drill down into individual scenario transcripts.
*   **Tool Library:** Inspect code and test functions for over 10+ built-in tools.

## 💻 Tech Stack
*   **Frontend:** React 18, TypeScript, Tailwind CSS (via CDN/Config)
*   **Build Tool:** Vite
*   **AI:** Google GenAI SDK (`@google/genai`)

## 📂 File Structure
- **`docs/`**: Documentation (Implementation, Changelog, Tools).
- **`src/`**: Frontend React application.
- **`server/`**: Node.js backend.
- **`scripts/`**: Utility scripts.

## 📖 Documentation
For a deep dive into the code structure, file responsibilities, undo architecture, and orchestration patterns, please refer to **[docs/IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)**.
See **[docs/CHANGELOG.md](./docs/CHANGELOG.md)** for version history and **[docs/TOOLS.md](./docs/TOOLS.md)** for tool documentation.

---

## 🛠️ Local Deployment Instructions

Follow these steps to run the Agent Builder on your local machine.

### Prerequisites
1.  **Node.js** (Version 18+): [Download Node.js](https://nodejs.org/).
2.  **Google Cloud Project**: A project with **Vertex AI API** enabled.
3.  **Google Cloud SDK**: [Install gcloud CLI](https://cloud.google.com/sdk/docs/install) (for authentication).

### Authentication (ADC)
The backend uses **Application Default Credentials (ADC)** to authenticate with Vertex AI.
1.  Login with gcloud:
    ```bash
    gcloud auth application-default login
    ```
    *This creates a local credential file that the Node.js server will automatically detect.*

### Running the App

#### Option A: Production Mode (Recommended)
Build the frontend and serve everything via the Node.js backend (identical to Cloud Run).
```bash
# 1. Install dependencies
npm install

# 2. Build the React frontend
npm run build

# 3. Start the Server
# Ensure you set your PROJECT_ID
export PROJECT_ID=your-google-cloud-project-id
npm start
```
Access at `http://localhost:8080`.

#### Option B: Development Mode (Hot Reload)
Run backend and frontend separately for real-time UI updates.

**Terminal 1 (Backend):**
```bash
export PROJECT_ID=your-google-cloud-project-id
npm start
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```
Access at `http://localhost:5173` (API requests are proxied to port 8080).

---

## ☁️ Deployment to Google Cloud Run

This application is now a **Client-Server** app (React + Node.js), making it perfect for Cloud Run.

### Prerequisites
1.  **Google Cloud Project** with **Vertex AI API** enabled.
2.  **gcloud CLI** installed and authenticated.

### Deployment Steps

1.  **Set Default Project**
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```

2.  **Grant Permissions**
    Ensure the Cloud Run Service Account has permission to call Vertex AI.
    ```bash
    # Get the default Compute Service Account (or use your custom one)
    PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
    SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

    # Grant Vertex AI User role
    gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/aiplatform.user"
    ```

3.  **Deploy**
    Deploy the container. The build process automatically handles the Node.js server setup.
    ```bash
    gcloud run deploy agent-builder \
      --source . \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars PROJECT_ID=YOUR_PROJECT_ID,TFNSW_API_KEY=your_transport_api_key
    ```
    *Note: We no longer pass `API_KEY`. Authentication is handled securely via the Service Account.*

4.  **Access the App**
    Open the URL provided by Cloud Run (e.g., `https://agent-builder-xyz-uc.a.run.app`).

### Local Docker Testing
```bash
docker build -t agent-builder .
docker run -p 8080:8080 \
  -e PROJECT_ID=your-project-id \
  -v ~/.config/gcloud/application_default_credentials.json:/root/.config/gcloud/application_default_credentials.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/root/.config/gcloud/application_default_credentials.json \
  agent-builder
```
*Note: The volume mount is required to pass your local gcloud credentials to the container.*

---

---

## 🔧 Troubleshooting

### Common Issues

#### 🔴 500 Error on NSW Transport Tools
**Symptoms:**
- "Failed to load resource: the server responded with a status of 500" in browser console.
- Transport tools (Trip Planner, Realtime) fail to return results.

**Cause:**
The `TFNSW_API_KEY` environment variable is missing on the server. The backend requires this key to authenticate with the Transport for NSW Open Data API.

**Resolution:**
1.  **Obtain a Key:** Register at [Transport for NSW Open Data](https://opendata.transport.nsw.gov.au/) and create an application to get an API Key.
2.  **Update Cloud Run:**
    ```bash
    gcloud run services update agent-builder \
      --update-env-vars TFNSW_API_KEY=your_actual_api_key_here
    ```
    *Or set it via the Google Cloud Console > Cloud Run > Edit & Deploy > Variables.*

## ❓ FAQ

### Why not use Vertex AI?
This application is designed as a **Client-Side Only** demo to be easily deployable without a backend. Vertex AI requires a secure backend (e.g., Node.js/Python) to handle Service Account credentials (IAM), as these cannot be safely used directly in a browser.

If you require Enterprise-grade security or Vertex AI features, we recommend adding a lightweight backend proxy (e.g., Express.js) to handle API requests and keep credentials server-side.
