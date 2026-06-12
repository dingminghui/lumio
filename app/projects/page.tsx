import { AppShell } from "@/components/app-shell";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectList } from "@/components/projects/project-list";
import { listProjects } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsRoute() {
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

        <ProjectList projects={projects} />
      </div>
    </AppShell>
  );
}
