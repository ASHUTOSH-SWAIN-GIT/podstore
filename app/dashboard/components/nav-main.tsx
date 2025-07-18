"use client";

import Link from "next/link";
import { Video, Mic, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain() {
  const router = useRouter();

  const handleRedirect = () => {
    router.push(`/dashboard/create-session`);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs">Navigation</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Create Session" asChild className="h-auto py-4 ">
            <Link href={`/dashboard/create-session`} className="cursor-pointer flex flex-col items-center gap-2">
              <Video className="w-10 h-10" />
              <span className="text-xs text-center leading-tight">Create Session</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Recordings" asChild className="h-auto py-4">
            <Link href="/dashboard/recordings" className="flex flex-col items-center gap-2">
              <Mic className="w-10 h-10" />
              <span className="text-xs text-center leading-tight">Recordings</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Profile" asChild className="h-auto py-4">
            <Link href="/dashboard/profile" className="flex flex-col items-center gap-2">
              <UserCircle className="w-10 h-10" />
              <span className="text-xs text-center leading-tight">Profile</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
