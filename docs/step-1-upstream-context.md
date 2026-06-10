# 里程碑 1：上游边上下文注入

## 目标

让下游节点的 AI 调用能读取所有通过连线传入的上游节点内容。

**当前问题：** `canvas_edges` 已经持久化，但 `handle-post.ts` 调用 `documentGraph` 时，完全没有传入上游节点的 `state`。`createSkillSystemPrompt` 里 `context` 参数永远是 `undefined`。

**完成后效果：** 用户在文案节点生成内容后，连线到另一个文档节点，再次对话时，AI 可以自动引用上游内容。

---

## 数据流现状

```
POST /api/projects/[projectId]/items/[itemId]/chat
  handle-post.ts
    getCanvasItem(itemId)          ← 只取当前节点
    documentGraph.invoke({
      messages,
      manifest,
      itemState,                   ← 只有当前节点 state
      model,
      latestUserMessage,
    })
      generateNode
        createSkillSystemPrompt({
          manifest,
          itemState,
          context: undefined,      ← ← ← 这里是缺口
        })
```

---

## 改造步骤

### Step 1.1 — 新增 `getUpstreamItems` 查询函数

**文件：** `db/queries.ts`

在末尾新增：

```typescript
export async function getUpstreamItems(
  itemId: string,
  projectId: string,
): Promise<CanvasItemRow[]> {
  const edges = await db
    .select({ sourceItemId: canvasEdges.sourceItemId })
    .from(canvasEdges)
    .where(
      and(
        eq(canvasEdges.targetItemId, itemId),
        eq(canvasEdges.projectId, projectId),
      ),
    );

  if (!edges.length) return [];

  const sourceIds = edges.map((e) => e.sourceItemId);

  const items = await db
    .select()
    .from(canvasItems)
    .where(inArray(canvasItems.id, sourceIds));

  return items.map(mapCanvasItem);
}
```

**注意：** `and`、`inArray` 已在文件顶部导入，不需要新增 import。

---

### Step 1.2 — 新增上下文序列化工具函数

**文件：** `lib/skills/upstream-context.ts`（新建）

```typescript
import type { CanvasItemRow } from "@/types/skill";

/**
 * 将上游节点列表序列化为 prompt 可读的上下文字符串。
 * 只取有内容的节点，跳过空 state。
 */
export function buildUpstreamContext(items: CanvasItemRow[]): string | undefined {
  const parts = items
    .filter((item) => {
      const state = item.state;
      return state && Object.keys(state).length > 0;
    })
    .map((item) => {
      const label = `[上游节点 ${item.skillId} / ${item.id.slice(0, 8)}]`;
      const content = JSON.stringify(item.state, null, 2);
      return `${label}\n${content}`;
    });

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
```

---

### Step 1.3 — `handle-post.ts` 读取上游 state 并传入图

**文件：** `app/api/projects/[projectId]/items/[itemId]/chat/handle-post.ts`

在 `getCanvasItem(itemId)` 之后，`documentGraph.invoke` 之前，新增上游查询：

```typescript
// 新增 import（文件顶部）
import { getUpstreamItems } from "@/db/queries";
import { buildUpstreamContext } from "@/lib/skills/upstream-context";
```

在 `handle-post.ts` 第 44 行 `const item = await getCanvasItem(itemId)` 之后：

```typescript
const upstreamItems = await getUpstreamItems(itemId, projectId);
const upstreamContext = buildUpstreamContext(upstreamItems);
```

将 `documentGraph.invoke` 的调用改为：

```typescript
const graphState = await documentGraph.invoke(
  {
    messages: modelMessages,
    manifest,
    itemState: item.state,
    model,
    latestUserMessage: userContent,
    upstreamContext,            // ← 新增
  },
  { configurable: { onText: writeDelta } },
);
```

---

### Step 1.4 — `DocumentState` 增加 `upstreamContext` 字段

**文件：** `lib/graph/document-graph.ts`

在 `DocumentState` 的 `Annotation.Root` 中新增一个字段：

```typescript
upstreamContext: Annotation<string | undefined>({
  default: () => undefined,
  reducer: (_, b) => b,
}),
```

同时更新 `DocumentGraphState` 中 `generateNode` 对 `createSkillSystemPrompt` 的调用：

```typescript
// 第 131 行附近，改为：
output = await generateSkillOutput({
  model: state.model,
  system: createSkillSystemPrompt({
    manifest: state.manifest,
    itemState: state.itemState,
    context: state.upstreamContext,   // ← 新增
  }),
  messages: state.messages,
  onPartialMessage: writeMessage,
});
```

---

### Step 1.5 — 更新 `createSkillSystemPrompt` 的上下文展示

**文件：** `lib/skills/system-prompt.ts`

现有实现已有 `context` 参数，但展示文字是「额外上下文」，改为更明确的说明：

```typescript
// 第 14 行，将：
${context ? `额外上下文：\n${context}\n` : ""}
// 改为：
${context ? `上游节点内容（来自画布连线）：\n${context}\n` : ""}
```

---

## 改动文件汇总

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `db/queries.ts` | 新增函数 | `getUpstreamItems` |
| `lib/skills/upstream-context.ts` | 新建文件 | `buildUpstreamContext` |
| `app/api/.../handle-post.ts` | 修改 | 查询上游 + 传入 graph |
| `lib/graph/document-graph.ts` | 修改 | State 增加字段 + generateNode 传 context |
| `lib/skills/system-prompt.ts` | 修改 | 上下文标签文字 |

**影响范围：** 仅 generate 分支（answer 分支不读上游，不影响现有行为）。

---

## 验收方式

1. 在画布上创建节点 A（文档），生成内容「这是一篇关于 AI 的简介」
2. 创建节点 B（文档），用连线从 A 指向 B
3. 在节点 B 的对话框输入「基于上游内容，扩展写成一篇完整文章」
4. 观察生成内容是否包含节点 A 的素材

---

## 后续扩展提示

- `buildUpstreamContext` 目前把上游 state 整个序列化；后续可按 skillId 提取特定字段（如 `document` skill 只取 `state.content`）
- 上游节点过多时可按 token 数做截断（V1.5）
- 循环依赖检测：`canvas_edges` 已有唯一约束，但多级循环需要在查询层或 UI 层拦截（V2）
