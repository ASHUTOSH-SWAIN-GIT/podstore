"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/app/dashboard/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Play,
  Download,
  Calendar,
  Clock,
  Users,
  FileAudio,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

interface Recording {
  id: string;
  sessionId: string;
  sessionTitle: string;
  hostName: string;
  participantCount: number;
  key: string;
  lastModified: string;
  createdAt: string;
  fileSize: number;
  duration: number;
}

export default function RecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRecordings();
    }
  }, [user]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/recordings");

      if (!response.ok) {
        throw new Error(`Failed to fetch recordings: ${response.status}`);
      }

      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error("Error fetching recordings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch recordings"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "Unknown";
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const downloadRecording = async (sessionId: string, sessionTitle: string) => {
    try {
      setDownloadingId(sessionId);
      
      // Use the streaming download endpoint that handles CORS
      const response = await fetch(`/api/recordings/${sessionId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Get the filename from the response headers or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${sessionTitle || `recording-${sessionId}`}.mp4`;
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="([^"]*)"/);
        if (matches) {
          filename = matches[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const viewRecording = async (sessionId: string) => {
    try {
      setViewingId(sessionId);
      
      // Use the view-url endpoint for viewing (no download headers)
      const urlResponse = await fetch(`/api/recordings/${sessionId}/view-url`);
      
      if (!urlResponse.ok) {
        throw new Error('Failed to generate view URL');
      }
      
      const { viewUrl } = await urlResponse.json();
      
      // Open in a new tab for viewing
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('View failed:', error);
      alert('Failed to open recording. Please try again.');
    } finally {
      setViewingId(null);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Authentication Required</h3>
              <p className="text-muted-foreground">
                Please sign in to view your recordings
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recordings</h1>
            <p className="text-muted-foreground">
              Manage your session recordings and downloads
            </p>
          </div>
          <Button onClick={fetchRecordings} variant="outline" disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading recordings...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Error Loading Recordings</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchRecordings}>Try Again</Button>
            </div>
          </div>
        ) : recordings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileAudio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
              <p className="text-muted-foreground mb-4">
                Start recording sessions to see them here
              </p>
              <a href="/dashboard/create-session">
                <Button>Create Your First Session</Button>
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recordings.map((recording) => (
              <Card
                key={recording.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-2">
                        <span>
                          {recording.sessionTitle ||
                            `Session ${recording.sessionId.slice(-8)}`}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          Ready
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Host: {recording.hostName || "Unknown"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => viewRecording(recording.sessionId)}
                        disabled={viewingId === recording.sessionId}
                      >
                        {viewingId === recording.sessionId ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4 mr-1" />
                        )}
                        {viewingId === recording.sessionId ? 'Loading...' : 'View'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadRecording(recording.sessionId, recording.sessionTitle)}
                        disabled={downloadingId === recording.sessionId}
                      >
                        {downloadingId === recording.sessionId ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        {downloadingId === recording.sessionId ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(recording.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{recording.participantCount + 1} participants</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(recording.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileAudio className="w-4 h-4" />
                      <span>{formatFileSize(recording.fileSize)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}