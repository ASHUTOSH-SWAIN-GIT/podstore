"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavUser({}) {
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-1">
          <SidebarMenuButton size="sm" className="pointer-events-none flex-1">
            <Avatar className="w-6 h-6 border border-border">
              <AvatarImage
                src={
                  user?.user_metadata?.avatar_url ||
                  user?.user_metadata?.picture
                }
                alt={getUserDisplayName()}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {getUserInitials(
                  user?.user_metadata?.full_name || user?.user_metadata?.name,
                  user?.email,
                )}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-xs leading-tight">
              <span className="truncate font-semibold">
                {user?.user_metadata?.name}
              </span>
              <span className="truncate text-xs">
                {user?.user_metadata?.email}
              </span>
            </div>
          </SidebarMenuButton>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
