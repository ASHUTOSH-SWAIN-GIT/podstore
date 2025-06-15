"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Session {
  id: string;
  title: string;
  hostId: string;
  status: string;
  createdAt: string;
  joinToken: string;
  host: {
    name: string;
    email: string;
  };
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const token = params.token as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Fetch session by token
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/by-token/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Invalid or expired invite link");
          } else {
            setError("Failed to load session");
          }
          return;
        }

        const sessionData = await response.json();
        setSession(sessionData);
      } catch (err) {
        setError("Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSession();
    }
  }, [token]);

  const handleJoin = async () => {
    if (!session) return;

    setJoining(true);
    try {
      // If user is not signed in, redirect to auth first
      if (!user) {
        const authUrl = new URL("/auth", window.location.origin);
        authUrl.searchParams.set("returnTo", `/join/${token}`);
        router.push(authUrl.toString());
        return;
      }

      // Join the session
      const response = await fetch(`/api/sessions/${session.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: "GUEST",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to join session");
      }

      // Redirect to the session
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError("Failed to join session");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-none shadow-2xl border border-gray-200 p-8">
          <div className="text-center space-y-6">
            <div className="text-6xl">❌</div>
            <h1 className="text-2xl font-light text-black">Invalid Invite</h1>
            <p className="text-gray-600">
              {error || "This invite link is invalid or has expired."}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 font-light transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-none shadow-2xl border border-gray-200">
        <div className="p-8">
          <div className="text-center space-y-6">
            <div className="text-6xl">🎙️</div>

            <div>
              <h1 className="text-2xl font-light text-black mb-2">
                You've been invited!
              </h1>
              <p className="text-gray-600 text-sm">
                Join this podcast recording session
              </p>
            </div>

            <div className="bg-gray-50 p-4 border border-gray-200 space-y-3">
              <div>
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Session Title
                </span>
                <span className="text-black font-medium">{session.title}</span>
              </div>

              <div>
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Hosted by
                </span>
                <span className="text-black">{session.host.name}</span>
              </div>

              <div>
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Status
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    session.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            </div>

            {user ? (
              <div className="bg-green-50 p-4 border border-green-200">
                <p className="text-green-800 text-sm">
                  ✓ Signed in as {user.email}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 border border-blue-200">
                <p className="text-blue-800 text-sm">
                  You'll be redirected to sign in before joining
                </p>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 px-4 font-light transition-colors duration-200 uppercase text-sm tracking-wide"
            >
              {joining ? "Joining..." : "Join Session"}
            </button>

            <div className="text-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-500 hover:text-black text-sm transition-colors duration-200"
              >
                Go to Dashboard instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
