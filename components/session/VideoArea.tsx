import React, { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { VideoOff, MicOff, Users, Move } from "lucide-react";

interface Participant {
  id: string;
  role: string;
  user: {
    name: string;
  };
}

interface VideoAreaProps {
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideosRef: React.RefObject<HTMLDivElement | null>;
  participants: Participant[];
  liveParticipantCount: number;
  isVideoOff: boolean;
  isMuted: boolean;
}

export const VideoArea: React.FC<VideoAreaProps> = ({
  localVideoRef,
  remoteVideosRef,
  participants,
  liveParticipantCount,
  isVideoOff,
  isMuted,
}) => {
  const [videoSize, setVideoSize] = useState({ width: 640, height: 360 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = true;
    const rect = videoContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !rect) return;

      const newWidth = Math.max(320, Math.min(1200, e.clientX - rect.left));
      const newHeight = Math.max(180, Math.min(800, e.clientY - rect.top));

      setVideoSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = true;
      startPosRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;

        setPosition({
          x: e.clientX - startPosRef.current.x,
          y: e.clientY - startPosRef.current.y,
        });
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position],
  );

  // Reset position if it goes out of bounds
  useEffect(() => {
    const container = videoContainerRef.current?.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const maxX = Math.max(0, containerRect.width - videoSize.width);
      const maxY = Math.max(0, containerRect.height - videoSize.height);

      setPosition((prev) => ({
        x: Math.max(0, Math.min(maxX, prev.x)),
        y: Math.max(0, Math.min(maxY, prev.y)),
      }));
    }
  }, [videoSize]);

  return (
    <div className="flex-1 p-6">
      <div className="h-full flex flex-col space-y-6">
        {/* Host Video (Main/Local) */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={videoContainerRef}
            className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden relative group shadow-lg"
            style={{
              width: `${videoSize.width}px`,
              height: `${videoSize.height}px`,
              transform: `translate(${position.x}px, ${position.y}px)`,
              cursor: isDraggingRef.current ? "grabbing" : "default",
              position: "absolute",
              zIndex: 10,
            }}
          >
            {/* Drag Handle */}
            <div
              className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20 hover:bg-purple-500/50"
              onMouseDown={handleDragStart}
              title="Drag to move"
            >
              <Move className="w-4 h-4 text-white" />
            </div>

            {/* LiveKit video container for host */}
            <div ref={localVideoRef} className="w-full h-full relative" />

            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                    <VideoOff className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400">Camera is off</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-4">
              <Badge className="bg-black/50 text-white border-gray-600">
                You (Host) {isMuted && <MicOff className="w-3 h-3 ml-1" />}
              </Badge>
            </div>

            {/* Resize Handle */}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 bg-purple-500/30 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-purple-500/50"
              style={{
                clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                borderTop: "2px solid #a855f7",
                borderLeft: "2px solid #a855f7",
              }}
              onMouseDown={handleResizeStart}
              title="Drag to resize"
            />

            {/* Size indicator */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Badge className="bg-black/70 text-white border-gray-600 text-xs">
                {videoSize.width} × {videoSize.height}
              </Badge>
            </div>
          </div>

          {/* Background placeholder */}
          <div className="w-full h-full bg-gray-950/50 rounded-xl border border-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Host video area</p>
              <p className="text-sm opacity-75">Your video feed appears here</p>
            </div>
          </div>
        </div>

        {/* Participants Video Boxes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Participants ({liveParticipantCount})
            {liveParticipantCount > 0 && (
              <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </h3>

          {/* LiveKit Dynamic Participant Videos Container */}
          <div className="space-y-4">
            <div
              ref={remoteVideosRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {/* LiveKit will dynamically add participant video boxes here */}
            </div>

            {/* Database participants as placeholder boxes when not live */}
            {liveParticipantCount === 0 && participants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="aspect-video bg-gray-800/50 rounded-lg border border-gray-700 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto">
                          <span className="text-white font-semibold">
                            {participant.user.name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {participant.user.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">Not connected</p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-gray-600/50 text-white border-gray-600 text-xs">
                        Invited
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-gray-600/50 text-white border-gray-600 text-xs">
                        {participant.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {liveParticipantCount === 0 && participants.length === 0 && (
            <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-800">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No participants yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Share the invite link to get others to join
              </p>
            </div>
          )}

          {/* Info message when live participants are present */}
          {liveParticipantCount > 0 && (
            <div className="text-center py-4">
              <p className="text-green-400 text-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                {liveParticipantCount} participant
                {liveParticipantCount > 1 ? "s" : ""} connected live
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
