"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, XIcon, Loader2, AlertCircle, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecordingVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  thumbnailSrc?: string;
  cdnEnabled?: boolean;
  onDownload?: () => void;
  className?: string;
}

export default function RecordingVideoDialog({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  thumbnailSrc,
  cdnEnabled = false,
  onDownload,
  className,
}: RecordingVideoDialogProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoLoadTime, setVideoLoadTime] = useState<number | null>(null);

  // Fetch video URL when dialog opens
  useEffect(() => {
    if (isOpen && !videoUrl) {
      fetchVideoUrl();
    }
  }, [isOpen, sessionId]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchVideoUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      
      const response = await fetch(`/api/recordings/${sessionId}/view-url`);
      
      if (!response.ok) {
        throw new Error('Failed to load recording');
      }
      
      const data = await response.json();
      setVideoUrl(data.viewUrl);
      setVideoLoadTime(Date.now() - startTime);
    } catch (err) {
      console.error('Failed to fetch video URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recording');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when closing
    setTimeout(() => {
      setVideoUrl(null);
      setError(null);
      setLoading(false);
      setVideoLoadTime(null);
    }, 300); // Wait for exit animation
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative mx-4 w-full max-w-5xl md:mx-0",
              className
            )}
          >
            {/* Header */}
            <div className="absolute -top-20 left-0 right-0 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">
                  {sessionTitle || `Recording ${sessionId.slice(-8)}`}
                </h3>
                {cdnEnabled && (
                  <div className="flex items-center space-x-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                    <Zap className="w-3 h-3" />
                    <span>CDN</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {onDownload && (
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                <button
                  onClick={handleClose}
                  className="rounded-full bg-neutral-900/50 p-2 text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-neutral-900/70 transition-colors"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-white/20 bg-neutral-900">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p className="text-sm">Loading recording...</p>
                    {cdnEnabled && (
                      <p className="text-xs text-green-400 mt-1">
                        <Zap className="w-3 h-3 inline mr-1" />
                        First view primes CDN cache • Subsequent views will be instant
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                  <div className="text-center text-white">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                    <p className="text-sm mb-3">{error}</p>
                    <Button
                      onClick={fetchVideoUrl}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {videoUrl && !loading && !error && (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  preload="metadata"
                  className="w-full h-full rounded-2xl bg-black focus:outline-none"
                  controlsList="nodownload"
                  onError={() => setError('Failed to load video')}
                  onLoadStart={() => setLoading(true)}
                  onCanPlay={() => setLoading(false)}
                  style={{ objectFit: 'contain' }}
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {/* Thumbnail fallback */}
              {!videoUrl && !loading && !error && thumbnailSrc && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={thumbnailSrc}
                    alt="Recording thumbnail"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex size-20 items-center justify-center rounded-full bg-primary/20 backdrop-blur-md">
                      <Play className="size-8 fill-white text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="absolute -bottom-16 left-0 right-0 text-center">
              <p className="text-white/70 text-sm">
                Press ESC or click outside to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}