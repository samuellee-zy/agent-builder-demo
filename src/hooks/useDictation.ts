import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseDictationResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
  isSupported: boolean;
}

interface UseDictationOptions {
  onFinalResult?: (text: string) => void;
}

export const useDictation = (options: UseDictationOptions = {}): UseDictationResult => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const resultIndexRef = useRef(0); // Track which results we've already processed

  const callbackRef = useRef(options.onFinalResult);
  useEffect(() => { callbackRef.current = options.onFinalResult; }, [options.onFinalResult]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          resultIndexRef.current = 0; // Reset index on new session? 
          // Actually, 'continuous' reusing the same instance might append. 
          // But usually start() clears previous session unless we manage it.
        };

        // The onresult handler will be re-bound in a separate useEffect to capture fresh callbackRef.current
        // For now, set a placeholder or initial version.
        recognition.onresult = (event: any) => {
          // This will be overwritten by the subsequent useEffect
          let fullText = '';
          let interimChunk = '';
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0].transcript;
            fullText += text;
            if (!res.isFinal) {
              interimChunk += text;
            }
          }
          setTranscript(fullText);
          setInterimTranscript(interimChunk);
        };

        recognition.onerror = (event: any) => {
          // ignore 'no-speech' errors as we want to keep listening
          if (event.error === 'no-speech') {
            return;
          }
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied.');
            shouldListenRef.current = false; // Stop trying
            setIsListening(false);
          } else {
            // For other errors, we might want to just log and keep trying if sticky
            // But network errors should probably stop it.
            if (event.error === 'network') {
              shouldListenRef.current = false;
              setIsListening(false);
              setError('Network error');
            }
          }
        };

        recognition.onend = () => {
          // If we intend to interpret, restart!
          if (shouldListenRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      } else {
        setError('Speech recognition not supported in this browser.');
      }
    }
  }, []); // Run once, but 'options' is a dependency now? 
  // IMPORTANT: If 'options' changes, we don't want to recreate recognition. 
  // We should use a Ref for the callback to allow fresh closures without re-init.

  // Update the onresult implementation above to use callbackRef.current
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        let fullText = '';
        let interimChunk = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          fullText += text; // Simplified concatenation (might miss spaces if engine doesn't provide)

          if (res.isFinal) {
            if (i >= resultIndexRef.current) {
              callbackRef.current?.(text.trim());
              resultIndexRef.current = i + 1;
            }
          } else {
            interimChunk += text;
          }
        }
        setTranscript(fullText);
        setInterimTranscript(interimChunk);
      };
    }
  }, [recognitionRef.current]); // Re-bind if ref changes (init only)


  const start = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      setInterimTranscript('');
      resultIndexRef.current = 0;
      shouldListenRef.current = true;
      try { recognitionRef.current.start(); } catch (e) { console.error("Failed to start recognition:", e); }
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      shouldListenRef.current = false;
      recognitionRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
    reset,
    error,
    isSupported
  };
};
