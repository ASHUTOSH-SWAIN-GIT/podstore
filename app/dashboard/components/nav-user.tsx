"use client"

import { BadgeCheck, Bell, ChevronsUpDown, CreditCard, LogOut, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

export function NavUser({

}) {
    const { isMobile } = useSidebar()

    const router = useRouter()
    const { user, signOut, loading } = useAuth()

    const handleRedirect = () => {
        router.push('/auth')
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    const getUserInitials = (name: string | null | undefined, email: string | null | undefined) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        if (email) {
            return email.charAt(0).toUpperCase()
        }
        return 'U'
    }

    const getUserDisplayName = () => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name
        }
        if (user?.user_metadata?.name) {
            return user.user_metadata.name
        }
        return user?.email?.split('@')[0] || 'User'
    }


    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="w-9 h-9 border border-gray-600">
                                <AvatarImage
                                    src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                                    alt={getUserDisplayName()}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-medium">
                                    {getUserInitials(user?.user_metadata?.full_name || user?.user_metadata?.name, user?.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{user?.user_metadata?.name}</span>
                                <span className="truncate text-xs">{user?.user_metadata?.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                                        alt={user?.user_metadata?.name} />
                                    <AvatarFallback className="rounded-lg">
                                        {user?.user_metadata?.name
                                            .split(" ")
                                            .map((n:any) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{user?.user_metadata?.name}</span>
                                    <span className="truncate text-xs">{user?.user_metadata?.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Sparkles />
                                Upgrade to Pro
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
