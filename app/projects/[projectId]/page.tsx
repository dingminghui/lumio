import { notFound } from "next/navigation";

import { CanvasHome } from "@/components/canvas/canvas-home";
import { getProjectDetail } from "@/db/queries";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const detail = await getProjectDetail(projectId);

  if (!detail) {
    notFound();
  }

  return (
    <CanvasHome
      projectId={detail.project.id}
      boardName={detail.project.name}
      initialSnapshot={detail.project.flowSnapshot}
      sessions={detail.sessions}
    />
  );
}
