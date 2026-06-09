"use client";

import { useState } from "react";

import { saveUserProfileNameAction } from "@/app/profile/actions";
import { PersonalCenterSection } from "@/components/profile/personal-center-section";
import type { SaveStatus } from "@/components/profile/profile-settings-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const profileTabs = [{ value: "personal-center", label: "个人中心" }] as const;

type ProfileSettingsProps = {
  profile: {
    name: string;
  };
};

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [name, setName] = useState(profile.name);
  const [savedName, setSavedName] = useState(profile.name);
  const [nameStatus, setNameStatus] = useState<SaveStatus>("idle");
  const [nameMessage, setNameMessage] = useState("");

  async function handleNameBlur() {
    if (name.trim() === savedName) {
      return;
    }

    setNameStatus("saving");
    setNameMessage("");

    const result = await saveUserProfileNameAction(name);

    if (result.ok) {
      setSavedName(result.profile.name);
      setName(result.profile.name);
      setNameStatus("saved");
      return;
    }

    setNameStatus("error");
    setNameMessage(result.message);
  }

  function handleNameChange(nextName: string) {
    setName(nextName);
    setNameStatus("idle");
  }

  return (
    <div className="mx-auto flex w-full max-w-[calc(100vw-8rem)] min-w-0 flex-col gap-6 sm:max-w-6xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">我的</h1>
        <p className="text-sm text-muted-foreground">管理个人信息。</p>
      </header>

      <Tabs
        defaultValue={profileTabs[0].value}
        orientation="vertical"
        className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:gap-6"
      >
        <TabsList variant="line">
          {profileTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="shrink-0 justify-center px-3 py-1 lg:w-full lg:justify-start"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="personal-center" className="mt-0">
            <PersonalCenterSection
              name={name}
              status={nameStatus}
              message={nameMessage}
              onNameBlur={handleNameBlur}
              onNameChange={handleNameChange}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
