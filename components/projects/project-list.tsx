"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteProjectAction } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectListItem } from "@/db/queries";
import { formatDateTime } from "@/utils/date";

type ProjectListProps = {
  projects: ProjectListItem[];
};

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(project: ProjectListItem) {
    const confirmed = window.confirm(`确定删除项目「${project.name}」？此操作不可恢复。`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await deleteProjectAction(project.id);
      router.refresh();
    });
  }

  if (!projects.length) {
    return (
      <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
        暂无项目
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="transition-colors hover:bg-muted/50"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <Link
              href={`/projects/${project.id}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`打开项目 ${project.name}`}
              className="min-w-0 flex-1 rounded-md transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <CardTitle className="truncate">{project.name}</CardTitle>
              <CardDescription className="mt-1.5">
                创建于 {formatDateTime(project.createdAt)}
              </CardDescription>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`删除项目 ${project.name}`}
              disabled={isPending}
              onClick={() => handleDelete(project)}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
