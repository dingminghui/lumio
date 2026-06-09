"use server";

import { revalidatePath } from "next/cache";

import { updateUserProfileName, type UserProfileSettings } from "@/db/profile-queries";
import { getErrorMessage } from "@/utils/error-message";

export type SaveUserProfileNameResult =
  | { ok: true; profile: UserProfileSettings }
  | { ok: false; message: string };

export async function saveUserProfileNameAction(
  name: string,
): Promise<SaveUserProfileNameResult> {
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
