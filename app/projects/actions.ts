"use server";

import { revalidatePath } from "next/cache";

import { createProjectSession, updateProjectFlow } from "@/db/queries";
import { type FlowSnapshot, isFlowSnapshot } from "@/utils/flow-snapshot";

export async function updateProjectFlowAction(
  projectId: string,
  flowSnapshot: FlowSnapshot,
) {
  if (!isFlowSnapshot(flowSnapshot)) {
    throw new Error("Invalid flow snapshot");
  }

  await updateProjectFlow(projectId, flowSnapshot);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createProjectSessionAction(projectId: string) {
  const session = await createProjectSession(projectId);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);

  return session;
}
