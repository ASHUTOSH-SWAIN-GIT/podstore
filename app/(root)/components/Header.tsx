"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Headphones,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/ui/themeSwitcher";

export default function Header() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleRedirect = () => {
    router.push("/auth");
  };

  const handleDashboard = () => {
    router.push("/dashboard");
  };

  const getUserInitials = (
    name: string | null | undefined,
    email: string | null | undefined,
  ) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    return user?.email?.split("@")[0] || "User";
  };

  return (
    <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#9671ff' }}>
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Podstore</span>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="#features"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Features
          </Link>
          <Link
            href="#testimonials"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Testimonials
          </Link>
          <Link
            href="#faq"
            className="text-gray-300 hover:text-white transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <ModeToggle />
          {loading ? (
            <div className="flex items-center space-x-3 animate-pulse">
              <div className="w-20 h-9 bg-gray-700 rounded"></div>
            </div>
          ) : user ? (
            <Button
              className="text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#9671ff' }}
              onClick={handleDashboard}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                onClick={handleRedirect}
              >
                Sign In
              </Button>
              <Button
                className="text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#9671ff' }}
                onClick={handleRedirect}
              >
                Try Free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
