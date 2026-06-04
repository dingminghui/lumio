import type { ComponentType } from "react";
import type { NodeProps } from "@xyflow/react";

import type { SkillCategoryFilter, SkillManifest } from "@/types/skill";

type SkillListFilter = {
  source?: SkillManifest["source"];
  category?: SkillCategoryFilter;
};

export class SkillRegistry {
  private manifests = new Map<string, SkillManifest>();
  private nodeComponents = new Map<string, ComponentType<NodeProps>>();

  register(manifest: SkillManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  registerNodeComponent(nodeType: string, component: ComponentType<NodeProps>): void {
    this.nodeComponents.set(nodeType, component);
  }

  get(id: string): SkillManifest | undefined {
    return this.manifests.get(id);
  }

  require(id: string): SkillManifest {
    const manifest = this.get(id);

    if (!manifest) {
      throw new Error(`Skill not found: ${id}`);
    }

    return manifest;
  }

  list(filter?: SkillListFilter): SkillManifest[] {
    const manifests = [...this.manifests.values()];

    if (!filter) {
      return manifests;
    }

    return manifests.filter((manifest) => {
      if (filter.source && manifest.source !== filter.source) {
        return false;
      }

      if (
        filter.category &&
        filter.category !== "all" &&
        manifest.category !== filter.category
      ) {
        return false;
      }

      return true;
    });
  }

  getBuiltinFallback(): SkillManifest {
    const builtin = this.list({ source: "builtin" })[0];

    if (!builtin) {
      throw new Error("No builtin skills registered");
    }

    return builtin;
  }

  getNodeTypes(): Record<string, ComponentType<NodeProps>> {
    const nodeTypes: Record<string, ComponentType<NodeProps>> = {};

    for (const [nodeType, component] of this.nodeComponents.entries()) {
      nodeTypes[nodeType] = component;
    }

    for (const manifest of this.manifests.values()) {
      const { nodeType } = manifest.canvas;

      if (!nodeTypes[nodeType] && this.nodeComponents.has("text")) {
        nodeTypes[nodeType] = this.nodeComponents.get("text")!;
      }
    }

    return nodeTypes;
  }

  listSkillOptions(): { id: string; name: string }[] {
    return this.list({ source: "builtin" }).map((manifest) => ({
      id: manifest.id,
      name: manifest.name,
    }));
  }

  isRegistered(id: string): boolean {
    return this.manifests.has(id);
  }
}

export const skillRegistry = new SkillRegistry();
