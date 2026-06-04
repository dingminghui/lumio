"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export function CreateProjectDialog() {
  return (
    <Button size="lg" asChild>
      <Link href="/projects/new" target="_blank" rel="noreferrer">
        <PlusIcon data-icon="inline-start" />
        新建项目
      </Link>
    </Button>
  );
}
