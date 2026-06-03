import { NextResponse, type NextRequest } from "next/server";

import { createProjectWithDefaultSession } from "@/db/queries";

export async function GET(request: NextRequest) {
  const project = await createProjectWithDefaultSession();

  return NextResponse.redirect(new URL(`/projects/${project.id}`, request.url));
}
