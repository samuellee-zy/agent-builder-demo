import React, { useRef, useState, useEffect } from 'react';

interface PanZoomContainerProps {
    children: React.ReactNode;
    initialScale?: number;
    minScale?: number;
    maxScale?: number;
    className?: string;
}

/**
 * A wrapper component that provides Infinite Canvas behavior.
 * Supports:
 * - Panning via Drag or Touchpad Scroll.
 * - Zooming via Ctrl+Scroll or Buttons.
 * - Centering content on mount.
 */
export const PanZoomContainer: React.FC<PanZoomContainerProps> = ({
    children,
    initialScale = 1,
    minScale = 0.5,
    maxScale = 3,
    className = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(initialScale);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [isReady, setIsReady] = useState(false);

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent default scrolling only if we are zooming (optional, but good for maps)
        // e.preventDefault(); // React synthetic events might not support this directly in all cases

        if (e.ctrlKey || e.metaKey) {
            // Zooming
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(scale * delta, minScale), maxScale);
            setScale(newScale);
        } else {
            // Panning via touchpad scroll
            setPosition(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    // Touch State
    const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
    const lastDistRef = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            // Single touch - Pan
            setIsDragging(true);
            lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            // Dual touch - Pinch Zoom
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            lastDistRef.current = dist;
            lastTouchRef.current = null; // Disable pan during zoom to avoid jumping
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
            // Pan
            const dx = e.touches[0].clientX - lastTouchRef.current.x;
            const dy = e.touches[0].clientY - lastTouchRef.current.y;
            setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2 && lastDistRef.current) {
            // Pinch Zoom
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

            // Calculate scale delta
            const delta = dist / lastDistRef.current;
            const newScale = Math.min(Math.max(scale * delta, minScale), maxScale);

            setScale(newScale);
            lastDistRef.current = dist;
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastTouchRef.current = null;
        lastDistRef.current = null;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag with left mouse button and if not clicking a button/interactive element
        if (e.button === 0) {
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;

        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // Center initial content and set ready state
    useEffect(() => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            // Center the content's origin (0,0) to the container's center
            setPosition({ x: clientWidth / 2, y: clientHeight / 2 });
            // Enable transitions after initial placement
            requestAnimationFrame(() => setIsReady(true));
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`overflow-hidden relative cursor-grab active:cursor-grabbing ${className}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) translate(-50%, -50%)`,
                    transformOrigin: '0 0',
                    transition: isDragging || !isReady ? 'none' : 'transform 0.1s ease-out',
                    opacity: isReady ? 1 : 0
                }}
                className="absolute top-0 left-0 w-full h-full pointer-events-none" // pointer-events-none to let clicks pass through wrapper? No, we need clicks on children.
            >
                {/* 
                We need pointer-events-auto on children so they can be clicked (like nodes). 
                But the wrapper itself handles the drag.
            */}
                <div className="pointer-events-auto origin-center flex items-center justify-center min-w-fit min-h-fit p-20">
                    {children}
                </div>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-slate-900/80 backdrop-blur rounded-lg p-2 border border-slate-700 shadow-xl z-50">
                <button
                    onClick={() => setScale(s => Math.min(s + 0.2, maxScale))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded"
                >
                    +
                </button>
                <button
                    onClick={() => setScale(1)}
                    className="p-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 rounded font-mono"
                >
                    {Math.round(scale * 100)}%
                </button>
                <button
                    onClick={() => setScale(s => Math.max(s - 0.2, minScale))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded"
                >
                    -
                </button>
            </div>
        </div>
    );
};
