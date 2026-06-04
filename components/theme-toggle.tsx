"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { applyTheme, useThemeMode } from "@/components/theme-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const theme = useThemeMode();
  const isDark = theme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
          onClick={() => applyTheme(isDark ? "light" : "dark")}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {isDark ? "浅色主题" : "深色主题"}
      </TooltipContent>
    </Tooltip>
  );
}
