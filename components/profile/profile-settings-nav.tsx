"use client";

const navigationItems = [
  { href: "#personal-center", label: "个人中心" },
  { href: "#model-configs", label: "模型配置" },
];

export function ProfileSettingsNav() {
  return (
    <aside className="lg:sticky lg:top-10 lg:self-start">
      <nav
        aria-label="我的设置"
        className="lumio-scrollbar flex gap-1 overflow-x-auto rounded-lg bg-card p-1 lg:flex-col"
      >
        {navigationItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
