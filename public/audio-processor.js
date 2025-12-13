class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // Mono
    
    // We need to send Float32 data to the main thread, or downsample here.
    // Vertex AI expects linear16 PCM usually, but sending Float32 is easier 
    // and we can convert to Int16 in the main thread or here.
    // Let's send the raw float data for flexibility in the service.
    
    if (channelData) {
        this.port.postMessage(channelData);
    }

    return true; // Keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
