import { notFound } from "next/navigation";

import { CanvasHome } from "@/components/canvas/canvas-home";
import { getProjectDetail } from "@/db/queries";
import { getSkillRegistry } from "@/lib/skills/register-builtins";
import { toSerializableSkillManifest } from "@/lib/skills/serializable-manifest";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const registry = getSkillRegistry();
  const detail = await getProjectDetail(projectId);

  if (!detail) {
    notFound();
  }

  const skillManifests = registry.list().map(toSerializableSkillManifest);
  const skillOptions = registry.listSkillOptions();

  return (
    <CanvasHome
      projectId={detail.project.id}
      boardName={detail.project.name}
      initialItems={detail.items}
      initialEdges={detail.edges}
      skillManifests={skillManifests}
      skillOptions={skillOptions}
      initialViewport={detail.project.viewport}
      bgColor={detail.project.bgColor}
      showDots={detail.project.showDots}
    />
  );
}
