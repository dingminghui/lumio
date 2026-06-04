import { NextResponse, type NextRequest } from "next/server";

import { createProject } from "@/db/queries";

export async function GET(request: NextRequest) {
  const project = await createProject();

  return NextResponse.redirect(new URL(`/projects/${project.id}`, request.url));
}
