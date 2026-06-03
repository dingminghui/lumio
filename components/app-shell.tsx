"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import newProjectAnimation from "@/assets/lottie/1.json";
import homeAnimation from "@/assets/lottie/2.json";
import projectsAnimation from "@/assets/lottie/3.json";
import settingsAnimation from "@/assets/lottie/4.json";
import profileAnimation from "@/assets/lottie/5.json";
import { AppNavItem, type AppNavItemConfig } from "@/components/app-nav-item";
import { TooltipProvider } from "@/components/ui/tooltip";

const navItems: AppNavItemConfig[] = [
  {
    label: "新建项目",
    href: "/projects/new",
    aliases: [],
    animationData: newProjectAnimation,
    opensInNewTab: true,
  },
  {
    label: "首页",
    href: "/home",
    aliases: ["/"],
    animationData: homeAnimation,
  },
  {
    label: "项目",
    href: "/projects",
    aliases: [],
    activePrefixes: ["/projects/"],
    animationData: projectsAnimation,
  },
  {
    label: "配置",
    href: "/settings",
    aliases: [],
    animationData: settingsAnimation,
  },
  {
    label: "我的",
    href: "/profile",
    aliases: [],
    animationData: profileAnimation,
  },
];

function isNavItemActive(item: AppNavItemConfig, pathname: string) {
  return (
    item.href === pathname ||
    item.aliases.includes(pathname) ||
    (item.activePrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false)
  );
}

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <TooltipProvider>
        <aside className="flex w-20 shrink-0 flex-col items-center border-r bg-sidebar px-3 py-4 text-sidebar-foreground">
          <div
            role="img"
            aria-label="Lumio"
            className="mb-5 flex size-12 items-center justify-center rounded-lg bg-sidebar-primary text-lg font-semibold text-sidebar-primary-foreground"
          >
            L
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              return (
                <AppNavItem
                  key={item.href}
                  item={item}
                  isActive={isNavItemActive(item, pathname)}
                />
              );
            })}
          </nav>
        </aside>
      </TooltipProvider>
      <section className="flex min-w-0 flex-1 px-8 py-10">{children}</section>
    </main>
  );
}
