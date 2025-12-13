# Troubleshooting Guide

## Vertex AI Connectivity

### Issue: 504 Gateway Timeout / Hanging Requests
**Symptom**: 
- Calls to `/api/generate` hang indefinitely (local) or return `504 Gateway Timeout` (Cloud Run).
- Logs show `[Proxy] Generating with model...` but no response or error is ever logged until the timeout.

**Root Cause**:
The `@google-cloud/vertexai` Node.js SDK utilizes gRPC (Google Remote Procedure Call) over HTTP/2. This protocol can encounter compatibility issues in certain environments:
- **Cloud Run**: Upstream timeouts if HTTP/2 is not correctly negotiated or if the container environment (Node 18+) handles gRPC keepalives aggressively.
- **Local**: Corporate firewalls, VPNs, or specific Node.js versions (v18/v20) may block or drop gRPC packets silently.

**Solution (Architecture Decision)**:
We have bypassed the Node.js SDK for specific models (`gemini-2.5-flash`, `gemini-3.0-pro-preview`) and implemented a **Direct REST API Client**.

- **Files Affected**: `server/index.js`
- **Mechanism**: properly authenticated `fetch()` calls to `https://aiplatform.googleapis.com/v1/...`
- **Why it works**: Direct REST uses standard HTTP/1.1, which is universally supported and does not suffer from the specific gRPC hanging issues observed.

### How to Verify Fix
Run the standalone test script which uses the same REST-based logic (via `node-fetch`):
```bash
node scripts/test_gemini_models.js
```
If this script works, the backend will work.

---
