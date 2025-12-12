# Architecture Evaluation & Recommendation

## Executive Summary
You asked to evaluate splitting the application into a granular microservices architecture (Frontend, Backend, Tools Service, Evaluation Service, Visual Builder).

**Recommendation:** Proceed with a **Phased Modular Monolith** approach first.
1.  **Phase 1 (Immediate):** Split into `apps/frontend` and `apps/backend`.
2.  **Phase 2 (Next):** Extract "Tools" and "Evaluation" into dedicated modules within `apps/backend` (or separate services if scale demands it).

Moving straight to full microservices (separate repos/containers for everything) is **high risk** right now because the core logic (Orchestrator, Evaluation) is currently tightly coupled to the Client-Side (Browser) runtime.

## Component Analysis

### 1. Visual Builder (`components/AgentBuilder.tsx`)
*   **Current State:** Tightly coupled React Component.
*   **Microservice Potential:** **Low**.
*   **Reasoning:** This is the core UI. Splitting it into a separate "service" would require a Micro-Frontend architecture (e.g., Module Federation), which adds massive complexity (shared state, routing, build tools) for little gain at this scale.
*   **Recommendation:** Keep as part of `apps/frontend`.

### 2. Tools Library (`services/tools.ts`)
*   **Current State:** Mixed. Definitions are client-side; execution is split (some client-side, some proxied to backend).
*   **Microservice Potential:** **High**.
*   **Reasoning:** Tools like "NSW Transport" or "CRM Lookup" are stateless functions. They don't need to run in the browser.
*   **Recommendation:** Create a `services/tools-service` (Node.js) that exposes a unified API (e.g., `POST /api/tools/execute`). The Frontend then becomes a dumb client that just sends "Tool Name + Args" to this service.

### 3. Evaluation Engine (`services/evaluation.ts`)
*   **Current State:** Client-side logic running LLM loops in the browser.
*   **Microservice Potential:** **Very High**.
*   **Reasoning:** Evaluation is a long-running, heavy process. Running it in the browser risks timeouts, memory leaks, and lost progress if the tab closes.
*   **Recommendation:** Move this logic to `apps/backend` (or a dedicated `services/evaluation-worker`). This allows for background processing and persistent results.

### 4. Orchestrator (`services/orchestrator.ts`)
*   **Current State:** Client-side "Brain".
*   **Microservice Potential:** **Medium**.
*   **Reasoning:** Moving this to the server (like LangChain) makes the agent more robust (can run without browser open). However, it requires a significant rewrite of the state management logic.
*   **Recommendation:** Keep client-side for now to avoid breaking the "Interactive" feel, but design the API so it *could* be moved later.

## Proposed Roadmap

### Phase 1: The "Clean Split" (Current Plan)
Establish the physical separation of concerns.
*   `apps/frontend`: All React code.
*   `apps/backend`: The current `server.js` + NSW Transport proxies.

### Phase 2: Domain Services (Refinement)
Refactor the `apps/backend` into a modular structure (Monorepo style).
```text
apps/backend/
├── src/
│   ├── gateway/       # API Routes & Auth
│   ├── tools/         # NSW Transport, Calculator, Search logic
│   └── evaluation/    # Evaluation Runner (ported from client)
```

### Phase 3: True Microservices (Future)
Only when independent scaling is needed, deploy `tools` and `evaluation` as separate Cloud Run services.

## Updated Refactor Plan Recommendation
I recommend we stick to **Phase 1** (Frontend/Backend split) as the immediate next step. This clears the path for extracting the "Tools" and "Evaluation" logic into the Backend in subsequent steps without breaking the application today.
