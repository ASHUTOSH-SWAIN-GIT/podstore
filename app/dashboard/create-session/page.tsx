"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/app/dashboard/components/dashboard-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Mic, ArrowLeft, CheckCircle } from "lucide-react";

// Main component for the Create Session page
export default function CreateSessionPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Session title is required.");
      return;
    }

    if (!user) {
      setError("You must be signed in to create a session.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const sessionId = nanoid();
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          hostId: user.id,
          hostEmail: user.email,
          hostName:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Unknown",
          id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/session/${sessionId}`);
      }, 1500);
    } catch (err) {
      setError("Failed to create session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="flex items-center justify-center min-h-full">
        <div className="w-full max-w-2xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbPage>Create Session</BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>

          {!success ? (
            <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Create New Recording Session
                </h1>
                <p className="text-muted-foreground">
                  Set up a new recording session for your podcast or meeting.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                    Session Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter session title..."
                    className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the session..."
                    rows={4}
                    className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  <Button
                    type="submit"
                    disabled={isLoading || !title.trim()}
                    className="bg-primary hover:bg-primary/90 px-8"
                  >
                    {isLoading ? (
                      "Creating..."
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Create Session
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="px-8"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center shadow-lg">
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Session Created Successfully!
              </h2>
              <p className="text-muted-foreground">
                Redirecting to your recording session...
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
    </AuthGuard>
  );
}