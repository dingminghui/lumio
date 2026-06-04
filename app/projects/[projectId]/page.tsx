import { notFound, redirect } from "next/navigation";

import { CanvasHome } from "@/components/canvas/canvas-home";
import { listSavedModelConfigs } from "@/db/profile-queries";
import { getProjectDetail } from "@/db/queries";
import { MODEL_PROVIDERS } from "@/lib/model-providers";
import { SKILL_REGISTRY } from "@/lib/skills";

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

  const skillOptions = SKILL_REGISTRY.map((skill) => ({
    id: skill.id,
    name: skill.name,
  }));

  return (
    <CanvasHome
      projectId={detail.project.id}
      boardName={detail.project.name}
      initialSnapshot={detail.project.flowSnapshot}
      sessions={detail.sessions}
      modelOptions={modelOptions}
      skillOptions={skillOptions}
    />
  );
}
