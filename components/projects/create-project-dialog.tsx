"use client";

import { PlusIcon } from "lucide-react";
import { useTransition } from "react";

import { createProjectAction } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";

export function CreateProjectDialog() {
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const project = await createProjectAction();
      window.open(`/projects/${project.id}`, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button size="lg" disabled={isPending} onClick={handleCreate}>
      <PlusIcon data-icon="inline-start" />
      {isPending ? "创建中…" : "新建项目"}
    </Button>
  );
}
