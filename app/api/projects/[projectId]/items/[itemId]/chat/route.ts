import { handleItemChatPost } from "./handle-post";
import type { RouteContext } from "./typings";

export { maxDuration } from "@/app/api/config";

export async function POST(request: Request, context: RouteContext) {
  return handleItemChatPost(request, context);
}
