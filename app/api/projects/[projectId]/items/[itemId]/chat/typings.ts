import type { LumioUIMessage } from "@/utils/session-message";

export type ChatRouteParams = {
  projectId: string;
  itemId: string;
};

export type RouteContext = {
  params: Promise<ChatRouteParams>;
};

export type ChatRequestBody = {
  messages?: LumioUIMessage[];
};
