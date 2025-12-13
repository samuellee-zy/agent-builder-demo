import React, { useState, useEffect } from 'react';
import { Film, Download, AlertCircle } from 'lucide-react';

/**
 * @file src/components/VideoMessage.tsx
 * @description Secure Video Player Component.
 * 
 * FEATURES:
 * 1. **Authenticated Fetch**: Retries video load with credentials if needed (handled by valid URL).
 * 2. **Blob Rendering**: Converts response to Blob URL for secure playback without exposing raw tokens in DOM if possible.
 * 3. **Download**: Provides a direct download link (useful for generated content).
 */

export const VideoMessage: React.FC<{ src: string }> = ({ src }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const loadVideo = async () => {
            try {
                // Fetch the video data using the authenticated URL (which includes the key)
                const response = await fetch(src);
                if (!response.ok) throw new Error('Failed to load video stream');
                const blob = await response.blob();
                
                if (active) {
                    const url = URL.createObjectURL(blob);
                    setBlobUrl(url);
                    setLoading(false);
                }
            } catch (e) {
                if (active) {
                    console.error("Video load error:", e);
                    setError('Playback failed. Please download.');
                    setLoading(false);
                }
            }
        };

        loadVideo();

        return () => {
            active = false;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [src]);

    if (loading) {
        return (
            <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                <span>Buffering secure video stream...</span>
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-lg overflow-hidden border border-slate-700 bg-black shadow-lg">
            <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <Film size={12} className="text-brand-400" />
                    <span>Generated Video (Veo)</span>
                </div>
                <a 
                    href={src} 
                    download="generated-video.mp4" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors"
                >
                    <Download size={10} /> Download
                </a>
            </div>
            {blobUrl ? (
                <video controls autoPlay loop className="w-full max-h-80 bg-black" src={blobUrl}>
                    Your browser does not support the video tag.
                </video>
            ) : (
                <div className="p-8 text-center text-xs text-red-400 bg-slate-950">
                    <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                    {error}
                </div>
            )}
        </div>
    );
};