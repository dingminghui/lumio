import { AppShell } from "@/components/app-shell";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { getUserProfileSettings } from "@/db/profile-queries";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const profile = await getUserProfileSettings();

  return (
    <AppShell>
      <ProfileSettings profile={profile} />
    </AppShell>
  );
}
