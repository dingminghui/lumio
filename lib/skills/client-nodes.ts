"use client";

import type { ComponentType } from "react";
import type { NodeProps } from "@xyflow/react";

import { ImageNode } from "@/components/canvas/nodes/image-node";
import { LongImageNode } from "@/components/canvas/nodes/long-image-node";
import { TextNode } from "@/components/canvas/nodes/text-node";
import { skillRegistry } from "@/lib/skills/core/registry";
import { getSkillRegistry } from "@/lib/skills/register-builtins";

let nodesRegistered = false;

function registerSkillNodes() {
  if (nodesRegistered) {
    return;
  }

  getSkillRegistry();
  skillRegistry.registerNodeComponent("image", ImageNode);
  skillRegistry.registerNodeComponent("long-image", LongImageNode);
  skillRegistry.registerNodeComponent("text", TextNode);
  nodesRegistered = true;
}

export function getSkillNodeTypes(): Record<string, ComponentType<NodeProps>> {
  registerSkillNodes();
  return skillRegistry.getNodeTypes();
}
