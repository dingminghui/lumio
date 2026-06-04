import { notFound, redirect } from "next/navigation";

import { CanvasHome } from "@/components/canvas/canvas-home";
import { listSavedModelConfigs } from "@/db/profile-queries";
import { getProjectDetail } from "@/db/queries";
import { bootstrapSkillRegistry, getSkillRegistry } from "@/lib/skills/bootstrap";
import { toSerializableSkillManifest } from "@/lib/skills/serializable-manifest";
import { MODEL_PROVIDERS } from "@/lib/model-providers";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  bootstrapSkillRegistry();
  const registry = getSkillRegistry();
  const detail = await getProjectDetail(projectId);

  if (!detail) {
    notFound();
  }

  const skillManifests = registry.list().map(toSerializableSkillManifest);
  const skillOptions = registry.listSkillOptions();

  const savedModelConfigs = await listSavedModelConfigs();
  const modelOptions = savedModelConfigs
    .filter((config) => config.validatedAt)
    .map((config) => ({
      provider: config.provider,
      label: MODEL_PROVIDERS[config.provider].label,
      model: MODEL_PROVIDERS[config.provider].defaultModel,
    }));

  if (!modelOptions.length) {
    redirect("/profile");
  }

  return (
    <CanvasHome
      projectId={detail.project.id}
      boardName={detail.project.name}
      initialItems={detail.items}
      initialEdges={detail.edges}
      skillManifests={skillManifests}
      skillOptions={skillOptions}
      modelOptions={modelOptions}
      initialViewport={detail.project.viewport}
      bgColor={detail.project.bgColor}
      showDots={detail.project.showDots}
    />
  );
}
