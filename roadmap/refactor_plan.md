# Modular Architecture Refactor Plan

## Objective
Refactor the current monolithic application into a modular architecture with distinct services for **Frontend** and **Backend**. This enables independent development, testing, and deployment (e.g., separate Cloud Run services).

## Target Structure

```text
/
├── apps/
│   ├── frontend/           # React Application (Vite + Nginx)
│   │   ├── src/
│   │   │   ├── components/ # Moved from /components
│   │   │   ├── services/   # Moved from /services (Client-side logic)
│   │   │   ├── App.tsx     # Moved from /App.tsx
│   │   │   ├── index.tsx   # Moved from /index.tsx
│   │   │   ├── index.css   # Moved from /index.css (if exists, or created)
│   │   │   └── types.ts    # Moved from /types.ts
│   │   ├── public/         # Moved from /public
│   │   ├── Dockerfile      # NEW: Nginx-based production build
│   │   ├── nginx.conf      # Moved from /nginx.conf
│   │   ├── package.json    # NEW: Frontend-specific dependencies
│   │   ├── vite.config.ts  # Moved from /vite.config.ts
│   │   ├── tsconfig.json   # Moved from /tsconfig.json
│   │   ├── tailwind.config.js # Moved/Created
│   │   ├── postcss.config.js  # Moved/Created
│   │   └── README.md       # NEW: Frontend documentation
│   │
│   └── backend/            # Node.js API Gateway
│       ├── src/
│       │   └── server.js   # Moved from /server.js
│       ├── tests/          # Moved from /test_*.js
│       ├── scripts/        # Moved from /debug-*.js
│       ├── Dockerfile      # NEW: Node.js production build
│       ├── package.json    # NEW: Backend-specific dependencies
│       └── README.md       # NEW: Backend documentation
│
├── README.md               # UPDATED: Root documentation pointing to services
└── .gitignore              # UPDATED: Ignore rules for new structure
```

## Execution Steps

### Phase 1: Preparation
1.  **Create Directories**:
    - `mkdir -p apps/frontend/src`
    - `mkdir -p apps/backend/src`
    - `mkdir -p apps/backend/tests`
    - `mkdir -p apps/backend/scripts`

### Phase 2: Backend Migration (`apps/backend`)
1.  **Move Files**:
    - `mv server.js apps/backend/src/`
    - `mv test_*.js apps/backend/tests/`
    - `mv debug-*.js apps/backend/scripts/`
2.  **Create `package.json`**:
    - Initialize with `name: "agent-builder-backend"`.
    - Dependencies: `express`, `dotenv`, `@google-cloud/vertexai`, `gtfs-realtime-bindings`, `google-auth-library`.
    - Scripts: `start: "node src/server.js"`.
3.  **Create `Dockerfile`**:
    - Node.js 18 runtime.
    - Copy `package.json`, install production deps.
    - Copy `src/`.
    - Expose 8080.
4.  **Create `README.md`**:
    - Document API endpoints, Environment Variables (`PROJECT_ID`, `TFNSW_API_KEY`), and Run instructions.

### Phase 3: Frontend Migration (`apps/frontend`)
1.  **Move Files**:
    - `mv components apps/frontend/src/`
    - `mv services apps/frontend/src/`
    - `mv public apps/frontend/`
    - `mv App.tsx index.tsx index.html vite.config.ts tsconfig.json types.ts nginx.conf env.sh apps/frontend/`
    - *Note: Check for `index.css`, `tailwind.config.js`, `postcss.config.js` and move if present.*
2.  **Create `package.json`**:
    - Initialize with `name: "agent-builder-frontend"`.
    - Dependencies: `react`, `react-dom`, `lucide-react`, `idb-keyval`, `@google/genai`.
    - DevDeps: `vite`, `typescript`, `@types/*`, `tailwindcss`, `postcss`, `autoprefixer`.
    - Scripts: `dev: "vite"`, `build: "vite build"`.
3.  **Create `Dockerfile`**:
    - Multi-stage: Build (Node) -> Serve (Nginx).
    - Copy `nginx.conf` to `/etc/nginx/conf.d/default.conf`.
4.  **Create `README.md`**:
    - Document UI features, Build steps, and Docker run command.

### Phase 4: Cleanup & Root Configuration
1.  **Root `README.md`**:
    - Update to describe the new modular structure.
    - Link to `apps/frontend/README.md` and `apps/backend/README.md`.
2.  **Root `package.json`** (Optional):
    - Can be removed or kept as a workspace root if using npm workspaces (recommended for shared dev flow).
    - *Decision: For now, we will treat them as isolated projects to ensure "no file duplication" and clean separation.*
3.  **Verify**:
    - Test Backend: `cd apps/backend && npm install && npm start`
    - Test Frontend: `cd apps/frontend && npm install && npm run dev`

## Verification Plan
1.  **Backend**: Verify `/api/health` (or root) and NSW Transport proxy.
2.  **Frontend**: Verify UI loads, Architect Chat works (IndexedDB), and API calls to backend succeed.
3.  **Docker**: Build both images and run them.
