"use server";

import { revalidatePath } from "next/cache";

import { updateUserProfileName } from "@/db/profile-queries";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "操作失败";
}

export async function saveUserProfileNameAction(name: string) {
  try {
    const profile = await updateUserProfileName(name);
    revalidatePath("/profile");

    return {
      ok: true as const,
      profile,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: getErrorMessage(error),
    };
  }
}
