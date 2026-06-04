import { AppShell } from "@/components/app-shell";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { getProfileSettings } from "@/db/profile-queries";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const settings = await getProfileSettings();

  return (
    <AppShell>
      <ProfileSettings
        profile={settings.profile}
        modelConfigs={settings.modelConfigs.map((config) => ({
          ...config,
          validatedAt: config.validatedAt?.toISOString() ?? null,
        }))}
      />
    </AppShell>
  );
}
