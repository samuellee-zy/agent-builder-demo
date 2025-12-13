/**
 * LiveClient
 * Manages WebSocket connection to Backend Proxy and Audio I/O.
 */
export class LiveClient {
    private ws: WebSocket | null = null;
    private audioContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private mediaStream: MediaStream | null = null;
    private isConnected: boolean = false;

    public onAudioData: ((data: Int16Array) => void) | null = null; // For visualization
    public onTextData: ((text: string, role: 'user' | 'model') => void) | null = null;
    public onError: ((err: string) => void) | null = null;
    public onConnect: (() => void) | null = null;
    public onToolUse: ((functionCalls: any[]) => void) | null = null; // For Sub-Agent Delegation

    /**
     * Sends a Tool Response back to the model.
     */
    sendToolResponse(toolResponse: any) {
        // Vertex Live API Protocol for Tool Response
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const msg = {
                client_content: {
                    turns: [{
                        role: "user",
                        parts: [{
                            function_response: {
                                name: toolResponse.name,
                                response: {
                                    name: toolResponse.name,
                                    content: { result: toolResponse.result } // Vertex structure
                                }
                            }
                        }]
                    }],
                    turn_complete: true
                }
            };
            this.ws.send(JSON.stringify(msg));
            console.log('[LiveClient] Sent Tool Response:', toolResponse.name);
        }
    }

    // Output Queue
    private nextStartTime: number = 0;

    constructor(private endpoint?: string) {
        if (!this.endpoint) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            this.endpoint = `${protocol}//${host}/api/live`;
        }
        console.log('[LiveClient] Initialized (Version: Handshake_Fix_V3)');
    }

    private videoInterval: any = null;

    async connect(config: { voice?: string, systemInstruction?: string, tools?: any[] } = {}) {
        if (this.isConnected) {
            console.log('[LiveClient] Already connected');
            return;
        }

        try {
            console.log('[LiveClient] Connecting to:', this.endpoint);
            this.ws = new WebSocket(this.endpoint);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                console.log('[LiveClient] WS Open. Sending Config Handshake...');
                console.log('[LiveClient] Config:', JSON.stringify(config, null, 2));

                this.ws?.send(JSON.stringify({
                    type: 'config',
                    config: {
                        voice: config.voice || 'Puck',
                        systemInstruction: config.systemInstruction || 'You are a helpful AI assistant.',
                        tools: config.tools || [],
                        response_modalities: ["AUDIO"] // Ensure Audio is requested
                    }
                }));
                console.log('[LiveClient] Config Sent. Waiting for setup_complete...');
                // Note: We wait for 'setup_complete' before marking as connected/starting audio
            };

            this.ws.onmessage = async (event) => {
                const data = event.data;
                if (data instanceof ArrayBuffer) {
                    // Binary Audio (PCM 16-bit, 24kHz)
                    this.playAudioBuffer(data);
                } else {
                    // Text (JSON)
                    try {
                        const msg = JSON.parse(data as string);

                        // Handshake Complete
                        if (msg.type === 'setup_complete') {
                            console.log('[LiveClient] ✅ Received setup_complete. Connection Ready.');
                            this.isConnected = true;
                            this.onConnect?.();
                            console.log('[LiveClient] Starting Audio Input stream...');
                            this.startAudioInput();
                            return;
                        } else if (msg.type === 'error') {
                            console.error('[LiveClient] Server Error:', msg.error);
                            this.onError?.(msg.error);
                            return;
                        }

                        this.handleServerMessage(msg);
                    } catch (e) {
                        console.error('[LiveClient] JSON Parse Error:', e);
                    }
                }
            };

            this.ws.onerror = (e) => {
                console.error('[LiveClient] Socket Error:', e);
                this.onError?.('Connection failed');
            };

            this.ws.onclose = () => {
                console.log('[LiveClient] Disconnected');
                this.disconnect();
            };
        } catch (e) {
            console.error('[LiveClient] Connect Error:', e);
            throw e;
        }
    }

    /**
     * Starts capturing video frames at 1 FPS, resizes to 768x768, and sends as JPEG.
     */
    startVideo(videoElement: HTMLVideoElement) {
        if (this.videoInterval) clearInterval(this.videoInterval);

        const canvas = document.createElement('canvas');
        canvas.width = 768; // Best practice resolution
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        this.videoInterval = setInterval(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
            if (!videoElement || videoElement.paused || videoElement.ended) return;

            if (ctx) {
                // Draw and Resize
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                // Compress to JPEG
                const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

                this.sendRealtimeInput([{
                    mime_type: 'image/jpeg',
                    data: base64Data
                }]);
            }
        }, 1000); // 1 FPS

        console.log('[LiveClient] Video Capture Started (1 FPS)');
    }

    stopVideo() {
        if (this.videoInterval) {
            clearInterval(this.videoInterval);
            this.videoInterval = null;
            console.log('[LiveClient] Video Capture Stopped');
        }
    }

    /**
     * Sends a video frame (base64 encoded jpeg) to the model.
     */
    sendRealtimeInput(chunks: { mime_type: string, data: string }[]) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                realtime_input: {
                    media_chunks: chunks
                }
            }));
        }
    }

    private async startAudioInput() {
        try {
            // AUDIO INPUT SETUP
            // Constraint: Vertex AI Live API requires strict PCM 16kHz Little-Endian audio.
            // Using 44.1kHz or 48kHz (standard browser defaults) will cause "Robot Voice" or static.
            // We explicitly request 16000Hz here to force the OS to resample if necessary.
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            await this.audioContext.audioWorklet.addModule('/audio-processor.js');

            // Debug: List available devices to diagnose NotFoundError
            const devices = await navigator.mediaDevices.enumerateDevices();
            console.log("[LiveClient] Available Devices:", devices.map(d => `${d.kind}: ${d.label}`));

            // Constraint: Requesting channelCount: 1 (Mono) and sampleRate: 16000
            // helps prevent the browser from locking the device in an incompatible mode.
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

            // Handle Microphone Data (Float32 -> Int16 conversion happens in sendAudioChunk)
            this.workletNode.port.onmessage = (event) => {
                const float32Data = event.data as Float32Array;
                this.sendAudioChunk(float32Data);
            };

            source.connect(this.workletNode);
            // this.workletNode.connect(this.audioContext.destination); // No loopback
        } catch (e) {
            console.error('[LiveClient] Audio Input Error:', e);
            this.onError?.('Microphone access failed');
        }
    }

    private sendAudioChunk(float32Data: Float32Array) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Convert Float32 (-1.0 to 1.0) to Int16 for Vertex AI
        const int16Data = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Data[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send raw bytes (Backend wraps them)
        this.ws.send(int16Data.buffer);

        // Visualize
        this.onAudioData?.(int16Data);
    }

    private handleServerMessage(msg: any) {
        // Handle Gemini Live Response
        // Structure: { serverContent: { modelTurn: { parts: [...] } } }
        const parts = msg?.serverContent?.modelTurn?.parts;
        if (parts && Array.isArray(parts)) {
            const functionCalls: any[] = [];

            for (const part of parts) {
                // Audio
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                    // base64 -> ArrayBuffer -> Play
                    // We typically get raw audio buffer separately, but if it comes here:
                    this.playAudio(part.inlineData.data);
                }

                // Text
                if (part.text) {
                    this.onTextData?.(part.text, 'model');
                }

                // Tool Use (Function Call)
                if (part.functionCall) {
                    console.log('[LiveClient] received functionCall:', part.functionCall);
                    functionCalls.push(part.functionCall);
                }
            }

            // Trigger Tool Use Callback if any found
            if (functionCalls.length > 0) {
                this.onToolUse?.(functionCalls);
            }
        }
    }

    /**
     * Helper to play Raw PCM Audio (ArrayBuffer)
     */
    private playAudioBuffer(buffer: ArrayBuffer) {
        if (!this.audioContext) return;

        // Vertex AI Raw Output is typically Int16 (Linear PCM) at 24kHz
        let finalBuffer = buffer;
        if (finalBuffer.byteLength % 2 !== 0) {
            console.warn(`[LiveClient] Received odd byte length (${finalBuffer.byteLength}). Truncating last byte.`);
            finalBuffer = finalBuffer.slice(0, finalBuffer.byteLength - 1);
        }

        const int16 = new Int16Array(finalBuffer);
        const float32 = new Float32Array(int16.length);

        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }

        const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000); // 24kHz
        audioBuffer.copyToChannel(float32, 0);

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        const currentTime = this.audioContext.currentTime;
        const start = Math.max(currentTime, this.nextStartTime);
        source.start(start);
        this.nextStartTime = start + audioBuffer.duration;
    }

    private playAudio(base64: string) {
        if (!this.audioContext) return;

        // Decode: Base64 -> ArrayBuffer -> AudioBuffer
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // We assume response is PCM 24kHz (Gemini default)
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }

        // Vertex Live API (Native Audio) typically 24kHz
        const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        const currentTime = this.audioContext.currentTime;
        const start = Math.max(currentTime, this.nextStartTime);
        source.start(start);
        this.nextStartTime = start + audioBuffer.duration;
    }

    disconnect() {
        this.stopVideo(); // Ensure video stops
        this.isConnected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
    }
}
