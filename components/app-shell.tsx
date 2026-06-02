"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { useRef } from "react";

import newProjectAnimation from "@/assets/lottie/1.json";
import homeAnimation from "@/assets/lottie/2.json";
import projectsAnimation from "@/assets/lottie/3.json";
import settingsAnimation from "@/assets/lottie/4.json";
import profileAnimation from "@/assets/lottie/5.json";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItemConfig = {
  label: string;
  href: string;
  aliases: readonly string[];
  animationData: unknown;
  opensInNewTab?: boolean;
};

const navItems: NavItemConfig[] = [
  {
    label: "新建项目",
    href: "/projects/detail",
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

type AppShellProps = {
  title: string;
};

export function AppShell({ title }: AppShellProps) {
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
              const isActive = item.href === pathname || item.aliases.includes(pathname);

              return <NavItem key={item.href} item={item} isActive={isActive} />;
            })}
          </nav>
        </aside>
      </TooltipProvider>
      <section className="flex min-w-0 flex-1 items-center justify-center px-8 py-10">
        <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
      </section>
    </main>
  );
}

type NavItemProps = {
  item: NavItemConfig;
  isActive: boolean;
};

function NavItem({ item, isActive }: NavItemProps) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  function playAnimation() {
    lottieRef.current?.goToAndPlay(0, true);
  }

  function stopAnimation() {
    lottieRef.current?.goToAndStop(0, true);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          target={item.opensInNewTab ? "_blank" : undefined}
          rel={item.opensInNewTab ? "noreferrer" : undefined}
          aria-label={item.label}
          onBlur={stopAnimation}
          onFocus={playAnimation}
          onMouseEnter={playAnimation}
          onMouseLeave={stopAnimation}
          className={cn(
            "flex size-12 items-center justify-center rounded-lg transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Lottie
            lottieRef={lottieRef}
            animationData={item.animationData}
            autoplay={false}
            loop={false}
            className="size-8"
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
