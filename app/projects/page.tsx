import { AppShell } from "@/components/app-shell";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjects } from "@/db/queries";
import { bootstrapSkillRegistry } from "@/lib/skills/bootstrap";
import Link from "next/link";
import { formatDateTime } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function ProjectsRoute() {
  bootstrapSkillRegistry();
  const projects = await listProjects();
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-normal">项目</h1>
            <p className="text-sm text-muted-foreground">
              在画布上添加节点，用 AI 生成各类内容。
            </p>
          </div>
          <CreateProjectDialog />
        </header>

        {projects.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`打开项目 ${project.name}`}
                className="block rounded-xl transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="truncate">{project.name}</CardTitle>
                    <CardDescription>
                      更新于 {formatDateTime(project.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
            暂无项目
          </div>
        )}
      </div>
    </AppShell>
  );
}
