# Live API Implementation Guide

**Status**: Alpha (Voice & Grounding Verified, Video Experimental)
**Date**: 14/12/2025

## 1. Architecture Overview

The Live API integration enables real-time, low-latency multimodal interaction (Voice + Video) with Gemini. Unlike the standard `generateContent` REST API, the Live API uses a stateful WebSocket connection.

### Components
1.  **Client (`LiveClient.ts`)**: Manages Audio I/O (`AudioContext`), Video Capture (Canvas/Video), and WebSocket communication.
2.  **Server Proxy (`liveServer.js`)**: A lightweight WebSocket Proxy that authenticates with Vertex AI using Application Default Credentials (ADC) and forwards bidirectional binary/text frames.
3.  **Vertex AI**: The upstream `generativelanguage.googleapis.com` endpoint.

---

## 2. Audio Implementation (Critical)

Achieving stable bidirectional audio requires strict adherence to Vertex AI's audio standards.

### Input (Microphone)
*   **Sample Rate**: MUST be **16,000Hz (16kHz)**.
    *   *Why?* Vertex AI models are optimized for 16kHz PCM. Sending 44.1kHz or 48kHz (browser defaults) causes "Robot Voice", static, or `400 Bad Request` errors.
*   **Format**: **Linear PCM 16-bit Little-Endian**.
*   **Device Locking**: The `LiveClient` explicitly requests `{ audio: { channelCount: 1, sampleRate: 16000 } }`.
    *   *Troubleshooting*: If `NotFoundError` occurs, it often means another process (like `SpeechRecognition`) has exclusive access to the mic. We solved this by adding a **1.5s delay** to the user-side Dictation service to allow `LiveClient` to grab the mic first.

### Output (Speaker)
*   **Format**: Raw PCM 16-bit (Int16Array) at 24kHz (typically).
*   **Playback**: We use a `AudioWorklet` or `ScriptProcessor` to buffer and play the raw chunks.
*   **Byte Alignment**: The client includes a safety check to truncate "odd-byte" buffers, which can cause `RangeError` during Int16Array conversion.

---

## 3. Real-Time Grounding (Google Search)

Grounding enables the Voice Agent to access real-time information.

### Configuration
To enable Grounding, the `tools` payload in the `setup` message must be formatted specifically:

```json
{
  "client_content": {
    "turns": [],
    "turn_complete": true
  },
  "setup": {
    "model": "models/gemini-2.0-flash-exp",
    "tools": [
      {
        "google_search": {} 
      }
    ]
  }
}
```

*   **Implementation**: In `AgentBuilder.tsx`, we detect if the active agent has the `google_search` tool. If yes, we inject `{ google_search: {} }` into the config passed to `LiveClient.connect()`.
*   **Verification**: Ask timely questions (e.g., "Stock price of X"). The model should return precise, cited data.

---

## 4. Dictation & Transcription

Since the Live API audio is purely for the model, we run a parallel **Web Speech API** instance to generate "User Bubbles" in the chat UI.

*   **Sync**: Dictation starts with the Live Session but with a **1.5s delay**.
*   **Feedback**: Provides visual confirmation that the user was heard, addressing the "Black Box" feeling of voice-only interfaces.

---

## 5. Video (Experimental)

Camera inputs are sent as Base64 JPEG frames.

*   **Protocol**: `realtime_input` message with `mime_type: image/jpeg` and `data: <base64>`.
*   **Rate**: 1 FPS (to conserve bandwidth and latency).
*   **Status**: Currently functional but the **Video Preview (Self-View)** is disabled/black in some states due to conflicts between the `video` element's `srcObject` and the `LiveClient`'s exclusive stream access.
    *   *Workaround*: We prioritize Audio stability. The model *can* see you, even if the preview is sometimes hidden.

---

## 6. Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **NotFoundError (Mic)** | Browser/OS Lock | Restart Browser. Ensure no other tabs use Mic. |
| **Robot Voice/Static** | 48kHz sending to 16kHz model | Enforce `sampleRate: 16000` in `getUserMedia`. |
| **WebSocket 403** | Auth Failure | Check `GOOGLE_APPLICATION_CREDENTIALS` on server. |
| **"I can't access that info"** | Missing Grounding | Ensure `{ google_search: {} }` is in `setup` payload. |
