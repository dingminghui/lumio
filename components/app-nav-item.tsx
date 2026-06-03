"use client";

import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import Link from "next/link";
import { useRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AppNavItemConfig = {
  label: string;
  href: string;
  aliases: readonly string[];
  activePrefixes?: readonly string[];
  animationData: unknown;
  opensInNewTab?: boolean;
};

type AppNavItemProps = {
  item: AppNavItemConfig;
  isActive: boolean;
};

export function AppNavItem({ item, isActive }: AppNavItemProps) {
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
