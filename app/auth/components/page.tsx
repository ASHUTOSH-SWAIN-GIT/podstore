"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthFormSection from "./AuthFormSection";
import AuthSidebarSection from "./AuthSidebarSection";

function SignUpContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-md z-50">
          {error}
        </div>
      )}
      <AuthFormSection />
      <AuthSidebarSection />
    </>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
      <Suspense fallback={
        <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
          <AuthFormSection />
          <AuthSidebarSection />
        </div>
      }>
        <SignUpContent />
      </Suspense>
    </div>
  );
}
