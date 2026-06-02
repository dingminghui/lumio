import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center rounded-sm bg-muted px-1.5 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
