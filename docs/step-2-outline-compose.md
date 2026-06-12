# 里程碑 2：outline + compose Skill

## 目标

新增两个内置 Skill，让画布可以搭建最小可跑通的内容流水线：

```
[document 节点] ──┐
[outline 节点]  ──┼──→ [compose 节点] → 完整 Markdown 交付物
[document 节点] ──┘
```

**V1 验收标准：**

1. 新增节点菜单出现「大纲生成」和「内容合成」两个选项
2. `outline` 节点：给定话题，生成包含章节标题与要点的结构化大纲
3. `compose` 节点：连接至少一个上游节点后，触发对话，AI 自动读取上游内容，输出完整 Markdown 文档
4. 三节点流水线（document → outline → compose 或任意组合）可端到端跑通

---

## 现有基础

里程碑 1 已实现：

- `getUpstreamItems(itemId, projectId)` — 从 `canvas_edges` 查询上游节点
- `buildUpstreamContext(items)` — 将上游 state 序列化为 prompt 字符串
- `handle-post.ts` 已将 `upstreamContext` 传入 `documentGraph`
- `SkillManifest.canvas.isComposer?: boolean` 字段在 `types/skill.ts` 已预留

里程碑 2 **无需修改**：

- `handle-post.ts`
- `document-graph.ts`
- 数据库 schema
- React Flow 画布

所有改动限于新增两个 Skill manifest + 优化一处上下文序列化逻辑。

---

## 改造步骤

### Step 2.1 — 优化 `buildUpstreamContext`，按 skillId 提取关键字段

**文件：** `lib/skills/upstream-context.ts`

当前实现把整个 `state` JSON 序列化，对 `document` skill 会把 `content` 的完整 Markdown 原样传入。这是正确的，但未来 `outline` skill 的 state 是结构化对象，整个 JSON 序列化对 AI 可读性较差。

改为按 skillId 提取最相关的文本内容：

```typescript
import type { CanvasItemRow } from "@/types/skill";

function extractStateText(skillId: string, state: Record<string, unknown>): string | null {
  if (!state || Object.keys(state).length === 0) return null;

  switch (skillId) {
    case "document":
    case "compose":
      return typeof state.content === "string" && state.content ? state.content : null;
    case "outline": {
      const sections = state.sections;
      if (!Array.isArray(sections) || sections.length === 0) return null;
      return sections
        .map((s: { title?: string; bullets?: string[] }) => {
          const bullets = s.bullets?.map((b) => `  - ${b}`).join("\n") ?? "";
          return `## ${s.title ?? "无标题"}\n${bullets}`;
        })
        .join("\n\n");
    }
    default:
      return JSON.stringify(state, null, 2);
  }
}

export function buildUpstreamContext(items: CanvasItemRow[]): string | undefined {
  const parts = items
    .map((item) => {
      const text = extractStateText(item.skillId, item.state);
      if (!text) return null;
      return `[上游节点：${item.skillId} / ${item.id.slice(0, 8)}]\n${text}`;
    })
    .filter(Boolean) as string[];

  return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
}
```

---

### Step 2.2 — 新增 `outline` Skill

**新建目录：** `lib/skills/outline/`

#### `lib/skills/outline/system-prompt.md`

```markdown
你是大纲生成助手。根据用户提供的主题或素材，生成结构化的内容大纲。

输出 JSON（除此之外不输出任何内容）：
{ "message": "给用户的简短说明（中文）", "state": { "sections": [ { "title": "章节标题", "bullets": ["要点 1", "要点 2"] } ] } }

规则：
- sections 数组包含 3–6 个章节，每章节 2–5 个 bullets。
- 有上游节点内容时，在其基础上归纳提炼大纲，不要发明与上游无关的内容。
- 没有上游内容时，按用户描述的主题自由创作大纲。
- 不输出思考过程、解释或操作说明。
```

#### `lib/skills/outline/index.ts`

```typescript
import { List } from "lucide-react";

import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";

export const outlineManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: "outline",
  name: "大纲生成",
  description: "生成结构化内容大纲，支持章节标题与要点列表。",
  category: "document",
  icon: List,
  stateSchema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        description: "大纲章节列表",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "章节标题" },
            bullets: {
              type: "array",
              items: { type: "string" },
              description: "要点列表",
            },
          },
        },
      },
    },
  },
  initialState: { sections: [] },
  stages: [
    {
      id: "empty",
      label: "待生成",
      description: "尚未生成大纲",
      priority: 10,
      condition: { op: "array_empty", paths: ["sections"] },
    },
    {
      id: "ready",
      label: "已生成",
      description: "大纲已生成，可继续修改",
      priority: 20,
      condition: { op: "array_nonempty", paths: ["sections"] },
    },
  ],
  actions: [
    { id: "generate", label: "生成大纲", description: "根据主题生成结构化大纲" },
    { id: "revise", label: "修订大纲", description: "按要求调整章节或要点" },
  ],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "text",
    defaultSize: { w: 360, h: 280 },
  },
};
```

---

### Step 2.3 — 新增 `compose` Skill

**新建目录：** `lib/skills/compose/`

#### `lib/skills/compose/system-prompt.md`

```markdown
你是内容合成助手。消费所有上游节点提供的素材和大纲，合并输出一篇结构完整、表达流畅的 Markdown 文档。

输出 JSON（除此之外不输出任何内容）：
{ "message": "给用户的简短说明（中文）", "state": { "content": "完整 Markdown 文档" } }

规则：
- 必须覆盖所有上游节点的核心内容，不遗漏任何上游素材。
- 如有大纲节点（outline），以其章节结构为骨架展开内容。
- 如有文档节点（document），将其内容融入对应章节，不重复引用。
- state.content 是完整文档，全量替换，不是 patch。
- 不输出思考过程、解释或操作说明。
```

#### `lib/skills/compose/index.ts`

```typescript
import { Layers } from "lucide-react";

import type { SkillManifest } from "@/types/skill";

import systemPrompt from "./system-prompt.md";

export const composeManifest: SkillManifest = {
  source: "builtin",
  version: "1.0.0",
  id: "compose",
  name: "内容合成",
  description: "读取所有上游节点内容，合并输出完整 Markdown 交付物。",
  category: "document",
  icon: Layers,
  stateSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "完整 Markdown 文档" },
    },
  },
  initialState: { content: "" },
  stages: [
    {
      id: "empty",
      label: "待合成",
      description: "尚未合成内容",
      priority: 10,
      condition: { op: "missing", paths: ["content"] },
    },
    {
      id: "done",
      label: "已合成",
      description: "已合成完整文档",
      priority: 20,
      condition: { op: "present", paths: ["content"] },
    },
  ],
  actions: [
    { id: "compose", label: "合成文档", description: "整合上游内容，输出完整文档" },
    { id: "recompose", label: "重新合成", description: "重新整合所有上游内容" },
  ],
  prompts: { system: systemPrompt },
  canvas: {
    nodeType: "text",
    defaultSize: { w: 440, h: 320 },
    isComposer: true,
  },
};
```

---

### Step 2.4 — 注册两个新 Skill

**文件：** `lib/skills/register-builtins.ts`

```typescript
import { documentManifest } from "@/lib/skills/document";
import { outlineManifest } from "@/lib/skills/outline";
import { composeManifest } from "@/lib/skills/compose";
import { skillRegistry } from "@/lib/skills/core/registry";

let builtinsRegistered = false;

export function getSkillRegistry() {
  if (!builtinsRegistered) {
    skillRegistry.register(documentManifest);
    skillRegistry.register(outlineManifest);
    skillRegistry.register(composeManifest);
    builtinsRegistered = true;
  }

  return skillRegistry;
}
```

注册后，`listSkillOptions()` 会自动把两个新 Skill 暴露到画布新增节点菜单，无需额外改动菜单代码。

---

### Step 2.5 — `outline` 节点内容展示

**文件：** `lib/canvas/node-content.ts`

`outline` 节点的 state 是 `{ sections: [...] }` 而非字符串，需要为其补充展示逻辑，否则节点卡片会空白。

在文件末尾新增：

```typescript
export const OUTLINE_SKILL_ID = "outline";
export const COMPOSE_SKILL_ID = "compose";

export function isOutlineSkill(skillId: string) {
  return skillId === OUTLINE_SKILL_ID;
}

export function isComposeSkill(skillId: string) {
  return skillId === COMPOSE_SKILL_ID;
}

export function getOutlineMarkdown(state: Record<string, unknown>): string {
  const sections = state.sections;
  if (!Array.isArray(sections) || sections.length === 0) return "";

  return sections
    .map((s: { title?: string; bullets?: string[] }) => {
      const bullets = s.bullets?.map((b) => `- ${b}`).join("\n") ?? "";
      return `## ${s.title ?? "无标题"}\n\n${bullets}`;
    })
    .join("\n\n");
}
```

**文件：** `components/canvas/nodes/text-node.tsx`

在节点正文渲染处，补充对 `outline` 的分支（`compose` 与 `document` 相同，都用 `state.content`，不需要单独处理）：

```typescript
// 现有逻辑（仅示意改动位置，不影响其他分支）：
const markdownContent = isDocumentSkill(data.skillId)
  ? getDocumentMarkdown(data.state)
  : isOutlineSkill(data.skillId)
    ? getOutlineMarkdown(data.state)
    : getFallbackNodeContent(data.state);
```

---

## 改动文件汇总

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `lib/skills/upstream-context.ts` | 修改 | 按 skillId 提取关键字段，提升 prompt 可读性 |
| `lib/skills/outline/system-prompt.md` | 新建 | `outline` skill 的 AI 指令 |
| `lib/skills/outline/index.ts` | 新建 | `outline` Skill manifest |
| `lib/skills/compose/system-prompt.md` | 新建 | `compose` skill 的 AI 指令 |
| `lib/skills/compose/index.ts` | 新建 | `compose` Skill manifest |
| `lib/skills/register-builtins.ts` | 修改 | 注册两个新 Skill |
| `lib/canvas/node-content.ts` | 修改 | 新增 `getOutlineMarkdown` 及辅助函数 |
| `lib/canvas/constants.ts` | 修改（可选） | 新增 `OUTLINE_SKILL_ID`、`COMPOSE_SKILL_ID` 常量（也可放 node-content.ts） |
| `components/canvas/nodes/text-node.tsx` | 修改 | 节点正文渲染增加 outline 分支 |

**不需要修改：**

- `handle-post.ts` — 上游 context 已通用化
- `document-graph.ts` — graph 已通用化
- 数据库 schema / 迁移脚本 — 无新表，state 是 JSON 字段
- 菜单代码 — `listSkillOptions()` 自动感知新注册的 Skill

---

## 验收方式

### 场景 A：outline 独立使用

1. 新增「大纲生成」节点
2. 输入「写一篇关于 AI 助手的文章大纲」
3. 节点正文显示层级化大纲（章节标题 + 要点列表）

### 场景 B：三节点内容流水线

```
[document 节点 A]  ──────────────────┐
                                     ▼
[outline 节点 B]  ──→  [compose 节点 C]
```

1. 节点 A（document）生成一段素材：「AI 助手的核心优势：效率高、24 小时在线、个性化」
2. 节点 B（outline）不连接上游，手动生成大纲：3 个章节
3. 将 A、B 分别连线到 C（compose）
4. 在 C 中输入「合成完整文章」
5. 观察生成内容是否：
   - 包含节点 A 的核心要点
   - 遵循节点 B 的大纲章节结构
   - 输出完整、连贯的 Markdown 文档

### 场景 C：仅 document → compose（最小链路）

1. 节点 A（document）生成内容
2. 节点 B（compose）连接 A，输入「合成成完整文章」
3. 输出覆盖 A 的内容，且比 A 更完整

---

## 后续扩展提示

- **`compose` 节点专属 UI**：可在节点标题区显示「已连接 N 个上游节点」徽章，提示用户流水线状态
- **自动触发合成**：`isComposer: true` 标记已预留，后续可在里程碑 3 中让 Orchestrator 感知合成节点、自动收集上游再触发
- **token 截断**：上游节点过多时，可在 `buildUpstreamContext` 中按预估 token 数截断（V1.5）
- **`outline` 节点编辑**：后续可为 sections 数组做专属可视化编辑器（类似 Plate 之于 document）
