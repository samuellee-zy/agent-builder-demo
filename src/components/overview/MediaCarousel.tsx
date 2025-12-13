import React from 'react';
import { Agent } from '../../types';
import { Film, Image as ImageIcon, Download, Maximize2, Play } from 'lucide-react';
import { VideoMessage } from '../VideoMessage';

interface MediaCarouselProps {
  agents: Agent[];
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({ agents }) => {
  // Extract media from all sessions
  type MediaItem = {
    id: string;
    type: 'video' | 'image';
    src: string;
    agentName: string;
    timestamp: Date;
    caption?: string;
  };

  const mediaItems: MediaItem[] = [];

  agents.forEach(agent => {
    agent.sessions?.forEach(session => {
      session.messages.forEach((msg, idx) => {
        if (msg.role !== 'assistant') return;

        // Check for Video
        // [Download Video](url)
        const videoMatch = msg.content.match(/\[Download Video\]\((.*?)\)/);
        if (videoMatch) {
          mediaItems.push({
            id: `vid-${session.id}-${idx}`,
            type: 'video',
            src: videoMatch[1],
            agentName: agent.name,
            timestamp: new Date(session.timestamp),
            caption: "Generated Video (Veo)"
          });
        }

        // Check for Image
        // ![Alt](url)
        const imageMatches = [...msg.content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
        imageMatches.forEach((match, imgIdx) => {
          mediaItems.push({
            id: `img-${session.id}-${idx}-${imgIdx}`,
            type: 'image',
            src: match[2],
            agentName: agent.name,
            timestamp: new Date(session.timestamp),
            caption: match[1] || "Generated Image"
          });
        });
      });
    });
  });

  // Sort by newest
  const sortedMedia = mediaItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (sortedMedia.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 h-[200px]">
        <Film size={32} className="mb-2 opacity-20" />
        <p className="text-sm">No generated media yet.</p>
        <p className="text-xs opacity-50">Try running an agent with Veo or Imagen.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Film size={14} className="text-brand-400" />
        Media Gallery
      </h3>

      {/* Horizontal Scroll Snap Container */}
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory custom-scrollbar">
        {sortedMedia.map((item) => (
          <div
            key={item.id}
            className="snap-center shrink-0 w-[280px] sm:w-[320px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group relative"
          >
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {item.type === 'video' ? (
                <VideoMessage src={item.src} />
                // Note: VideoMessage has its own container styling, might need to adjust or strip it here?
                // Actually VideoMessage renders a full block card. Let's replicate a simpler preview here or use it directly.
                // Using it directly but perhaps we want a cleaner preview?
                // Let's just use a <video> tag for preview to keep it clean in carousel.
              ) : (
                <img src={item.src} alt={item.caption} className="w-full h-full object-cover" />
              )}

              {item.type === 'video' && (
                // Overlay only if we used a thumbnail, but VideoMessage uses controls.
                // If we assume VideoMessage is robust enough, let's trust it.
                // But VideoMessage has padding/margins. Let's override or use raw video tag.
                // Let's use raw video tag for the "Carousel" look.
                <div className="w-full h-full relative">
                  <video
                    src={item.src}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                  {/* Play Overlay removed as native controls are now enabled */}
                </div>
              )}

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={item.src} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-900/80 hover:bg-brand-600 text-white rounded-lg transition-colors block">
                  <Download size={14} />
                </a>
              </div>
            </div>

            <div className="p-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm absolute top-0 w-full transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white mb-0.5 line-clamp-1">{item.caption}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">Generated by {item.agentName}</div>
                </div>
                {item.type === 'image' ? <ImageIcon size={14} className="text-purple-400" /> : <Film size={14} className="text-brand-400" />}
              </div>
            </div>

            {/* Static Footer for Mobile (since hover doesn't work well) */}
            <div className="lg:hidden p-3 border-t border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white truncate w-40">{item.caption}</p>
                  <p className="text-[10px] text-slate-400 truncate">by {item.agentName}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
