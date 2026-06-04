import { AppShell } from "@/components/app-shell";
import { SkillCatalog } from "@/components/settings/skill-catalog";

export const dynamic = "force-dynamic";

export default function SettingsRoute() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">技能配置</h1>
          <p className="text-sm text-muted-foreground">
            查看 Lumio 内置 Skill 模板（仅官方维护）。
          </p>
        </header>

        <SkillCatalog />
      </div>
    </AppShell>
  );
}
