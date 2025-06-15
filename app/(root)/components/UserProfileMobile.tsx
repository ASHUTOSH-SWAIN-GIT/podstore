"use client";

import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserProfileMobile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
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

  if (!user) return null;

  return (
    <div className="sm:hidden flex items-center space-x-2 p-2 bg-gray-800/50 rounded-lg">
      <Avatar className="w-6 h-6">
        <AvatarImage
          src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
          alt={getUserDisplayName()}
        />
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
          {getUserInitials(
            user.user_metadata?.full_name || user.user_metadata?.name,
            user.email,
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white truncate">
          {getUserDisplayName()}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
        onClick={handleSignOut}
      >
        <LogOut className="h-3 w-3" />
      </Button>
    </div>
  );
}
