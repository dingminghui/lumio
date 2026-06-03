import { AppShell } from "@/components/app-shell";
import { SkillCatalog } from "@/components/settings/skill-catalog";

export default function SettingsRoute() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-normal">技能配置</h1>
            <p className="text-sm text-muted-foreground">
              管理技能的状态结构、阶段推导规则与可执行操作。
            </p>
          </div>
        </header>

        <SkillCatalog />
      </div>
    </AppShell>
  );
}
