import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { userProfile } from "@/db/schema";

const DEFAULT_PROFILE_ID = "default";

export type UserProfileSettings = {
  id: string;
  name: string;
};

export async function getUserProfileSettings(): Promise<UserProfileSettings> {
  const [profile] = await db
    .select({
      id: userProfile.id,
      name: userProfile.name,
    })
    .from(userProfile)
    .where(eq(userProfile.id, DEFAULT_PROFILE_ID))
    .limit(1);

  return profile ?? { id: DEFAULT_PROFILE_ID, name: "" };
}

export async function updateUserProfileName(
  name: string,
): Promise<UserProfileSettings> {
  const trimmedName = name.trim();

  const [profile] = await db
    .insert(userProfile)
    .values({
      id: DEFAULT_PROFILE_ID,
      name: trimmedName,
    })
    .onConflictDoUpdate({
      target: userProfile.id,
      set: {
        name: trimmedName,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      id: userProfile.id,
      name: userProfile.name,
    });

  if (!profile) {
    throw new Error("Failed to update profile");
  }

  return profile;
}
