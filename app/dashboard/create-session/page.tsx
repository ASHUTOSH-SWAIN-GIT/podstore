"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { nanoid } from "nanoid";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Mic, ArrowLeft } from "lucide-react";

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
      setError("Session title is required");
      return;
    }

    if (!user) {
      setError("You must be signed in to create a session");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const sessionId = nanoid();
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        setError("");

        // Redirect to the setup page after a brief delay
        setTimeout(() => {
          router.push(`/setup/${data.sessionId || sessionId}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/dashboard"
                  className="text-gray-400 hover:text-white"
                >
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">
                  Create Session
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-8 max-w-md">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Mic className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                Session Created!
              </h2>
              <p className="text-muted-foreground text-lg">Redirecting to your session...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header with Breadcrumb */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4 ">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/dashboard"
                className="text-gray-400 hover:text-white"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white">
                Create Session
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground hover:bg-accent mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Create New Session
            </h1>
            <p className="text-muted-foreground text-lg">
              Start a new recording session for your podcast or meeting.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Session Title */}
              <div className="space-y-3">
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold text-foreground"
                >
                  Session Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter session title"
                  maxLength={100}
                  className="w-full px-4 py-4 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-base"
                  disabled={isLoading}
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">
                    {title.length}/100
                  </span>
                </div>
              </div>

              {/* Session Description */}
              <div className="space-y-3">
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-foreground"
                >
                  Description
                  <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional session description"
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-4 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none text-base"
                  disabled={isLoading}
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">
                    {description.length}/500
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={!title.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground px-8 py-3 text-base font-medium disabled:cursor-not-allowed transition-all min-w-[160px]"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4" />
                      <span>Create Session</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
