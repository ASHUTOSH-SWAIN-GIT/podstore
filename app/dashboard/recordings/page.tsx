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
  Search,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    if (user) {
      fetchRecordings();
    }
  }, [user]);

  useEffect(() => {
    // Filter recordings based on search term
    const filtered = recordings.filter((recording) =>
      recording.sessionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recording.hostName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecordings(filtered);
  }, [recordings, searchTerm]);

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
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 mb-6 rounded-lg">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Recordings</h1>
            <p className="text-muted-foreground">Manage your session recordings and downloads</p>
          </div>
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <Button 
              onClick={fetchRecordings} 
              variant="outline" 
              disabled={loading}
              className="flex items-center space-x-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {loading ? (
          <div className="bg-card rounded-xl p-8 border border-border shadow-lg">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-card-foreground">Loading recordings...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl p-8 border border-border shadow-lg text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Error Loading Recordings</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchRecordings} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : recordings.length === 0 ? (
          <div className="bg-card rounded-xl p-8 border border-border shadow-lg text-center">
            <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileAudio className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">No recordings yet</h3>
            <p className="text-muted-foreground mb-6">
              Start recording sessions to see them here
            </p>
            <a href="/dashboard/create-session">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3">
                <Play className="w-5 h-5 mr-2" />
                Create Your First Session
              </Button>
            </a>
          </div>
        ) : filteredRecordings.length === 0 && searchTerm ? (
          <div className="bg-card rounded-xl p-8 border border-border shadow-lg text-center">
            <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">No recordings found</h3>
            <p className="text-muted-foreground mb-6">
              No recordings match your search for "{searchTerm}". Try adjusting your search terms.
            </p>
            <Button 
              onClick={() => setSearchTerm("")} 
              variant="outline"
              className="bg-primary/10 hover:bg-primary/20 text-primary"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div>
            {/* Search Results Summary */}
            {searchTerm && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {filteredRecordings.length} recording{filteredRecordings.length !== 1 ? 's' : ''} 
                  {searchTerm && ` for "${searchTerm}"`}
                </p>
                <Button 
                  onClick={() => setSearchTerm("")} 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear search
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center space-x-1">
                  </div>
                </div>
                
                <h4 className="font-semibold text-card-foreground mb-2 text-lg">
                  {recording.sessionTitle || `Session ${recording.sessionId.slice(-8)}`}
                </h4>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {formatDuration(recording.duration)} • {recording.participantCount + 1} participant{recording.participantCount + 1 !== 1 ? 's' : ''}
                </p>
                
                <div className="text-xs text-muted-foreground mb-4">
                  <div className="flex items-center justify-between">
                    <span>Host: {recording.hostName || "Unknown"}</span>
                    <span>{formatDate(recording.createdAt)}</span>
                  </div>
                  <div className="mt-1">
                    Size: {formatFileSize(recording.fileSize)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2"
                    variant="ghost"
                    onClick={() => viewRecording(recording.sessionId)}
                    disabled={viewingId === recording.sessionId}
                  >
                    {viewingId === recording.sessionId ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        View Recording
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => downloadRecording(recording.sessionId, recording.sessionTitle)}
                    disabled={downloadingId === recording.sessionId}
                  >
                    {downloadingId === recording.sessionId ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}