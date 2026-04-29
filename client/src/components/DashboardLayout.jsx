import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Phone, Settings, Trophy, BarChart3, Sun, Moon, Users, User, School, Drama, Settings2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import SchoolSwitcher from "./SchoolSwitcher";

// `requires` controls visibility:
//   undefined         → visible to all authenticated users
//   "schoolAdmin"     → visible to school admins (and global admins)
//   "globalAdmin"     → visible only to global admins
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Phone, label: "Call History", path: "/calls" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: Users, label: "Members", path: "/members", requires: "schoolAdmin" },
  { icon: Settings, label: "School Settings", path: "/settings", requires: "schoolAdmin" },
  { icon: School, label: "All Schools", path: "/admin/schools", requires: "globalAdmin" },
  { icon: Drama, label: "Scenarios", path: "/admin/scenarios", requires: "globalAdmin" },
  { icon: BarChart3, label: "Usage & Billing", path: "/usage", requires: "globalAdmin" },
  { icon: Settings2, label: "Platform Settings", path: "/admin/platform-settings", requires: "globalAdmin" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, isGlobalAdmin, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  // Authenticated but not attached to a school (and not a global admin)
  // This happens if someone signs up via OAuth without an invite.
  if (!user.schoolId && !isGlobalAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Waiting for your invite
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your account ({user.email}) isn't attached to a school yet. Dojo Roleplay is invite-only — ask your school admin for an invite link, then open that link in this browser to join.
          </p>
          <Button
            onClick={logout}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
          "--sidebar-width": `${sidebarWidth}px`,
        }}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function ThemeToggleItem() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable) return null;
  return (
    <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
      {theme === "dark" ? (
        <Sun className="mr-2 h-4 w-4" />
      ) : (
        <Moon className="mr-2 h-4 w-4" />
      )}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </DropdownMenuItem>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}) {
  const { user, school, isSchoolAdmin, isGlobalAdmin, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  const visibleMenuItems = menuItems.filter(item => {
    if (!item.requires) return true;
    if (item.requires === "globalAdmin") return isGlobalAdmin;
    if (item.requires === "schoolAdmin") return isSchoolAdmin;
    return false;
  });

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                isGlobalAdmin ? (
                  <SchoolSwitcher />
                ) : (
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Dojo Roleplay
                    </span>
                    <span className="text-sm font-semibold tracking-tight truncate">
                      {school?.name || "Navigation"}
                    </span>
                  </div>
                )
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {visibleMenuItems.map((item, idx) => {
                const isActive = location === item.path;
                const prevItem = visibleMenuItems[idx - 1];
                const isFirstGlobalAdmin =
                  item.requires === "globalAdmin" &&
                  prevItem &&
                  prevItem.requires !== "globalAdmin";
                return (
                  <div key={item.path}>
                    {isFirstGlobalAdmin && !isCollapsed && (
                      <div className="mt-3 mb-1 px-3">
                        <div className="border-t border-border mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Global
                        </span>
                      </div>
                    )}
                    {isFirstGlobalAdmin && isCollapsed && (
                      <div className="my-2 mx-2 border-t border-border" />
                    )}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-10 transition-all font-normal`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8, #1e3a5f)" }}>
                      {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/profile")}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>My profile</span>
                </DropdownMenuItem>
                <ThemeToggleItem />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
