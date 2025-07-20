"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
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

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        setTimeout(() => {
          router.push(`/setup/${data.sessionId || sessionId}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // The success screen shown after creating a session
  if (success) {
    return <SuccessScreen />;
  }

  // The main form for creating a session
  return (
    <div className="flex-1 bg-[#111111] text-white">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header section with back button and breadcrumbs */}
        <div className="flex items-center justify-between mb-12">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white hover:bg-gray-800 -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-gray-400 hover:text-white">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-medium">Create Session</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page title and description */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Create New Session
          </h1>
          <p className="text-lg text-gray-400">
            Start a new recording session for your podcast or meeting.
          </p>
        </div>

        {/* Form container */}
        <div className="bg-[#1C1C1C] rounded-2xl border border-gray-800 p-6 sm:p-10 shadow-2xl shadow-black/20">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Session Title Input */}
            <div className="space-y-3">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-300">
                Session Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Podcast Episode #12"
                maxLength={100}
                className="w-full px-4 py-3 bg-[#222222] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A63D2] focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <div className="text-right text-xs text-gray-500">{title.length}/100</div>
            </div>

            {/* Session Description Input */}
            <div className="space-y-3">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-300">
                Description <span className="text-gray-500 ml-1 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief summary of what this session is about."
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 bg-[#222222] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A63D2] focus:border-transparent transition-all resize-none"
                disabled={isLoading}
              />
              <div className="text-right text-xs text-gray-500">{description.length}/500</div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={!title.trim() || isLoading}
                className="bg-[#8A63D2] hover:bg-[#7955b8] disabled:bg-gray-700 text-white px-8 py-6 text-base font-bold disabled:cursor-not-allowed transition-all min-w-[180px] rounded-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Mic className="w-5 h-5" />
                    <span>Create Session</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// A dedicated component for the success screen for better organization
const SuccessScreen = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#111111] p-8 text-center">
      <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">
        <div className="w-24 h-24 bg-[#27272A] border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/10">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Session Created!</h2>
          <p className="text-lg text-gray-400">
            Get ready, you're being redirected to the studio...
          </p>
        </div>
      </div>
    </div>
  );
};
