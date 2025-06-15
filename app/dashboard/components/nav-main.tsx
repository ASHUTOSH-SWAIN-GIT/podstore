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
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Create Session" asChild>
            <Link href={`/dashboard/create-session`} className="cursor-pointer">
              <Video />
              <span>Create Session</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Recordings" asChild>
            <Link href="/dashboard/recordings">
              <Mic />
              <span>Recordings</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Profile" asChild>
            <Link href="/dashboard/profile">
              <UserCircle />
              <span>Profile</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
