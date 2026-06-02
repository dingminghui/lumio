import { Panel } from "@xyflow/react";
import Image from "next/image";

type CanvasHeaderProps = {
  boardName: string;
};

export function CanvasHeader({ boardName }: CanvasHeaderProps) {
  return (
    <Panel
      position="top-left"
      className="flex items-center gap-2 rounded-md px-1 py-0.5 backdrop-blur"
    >
      <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
        <Image
          src="/android-chrome-192x192.png"
          alt="Lumio"
          width={32}
          height={32}
          className="size-full object-cover"
          priority
        />
      </div>
      <span className="max-w-[12rem] truncate text-sm font-medium text-foreground">
        {boardName}
      </span>
    </Panel>
  );
}
