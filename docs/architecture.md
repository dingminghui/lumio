# Lumio 架构设计（已实现）

## 核心数据模型

**Project = 画布工作区**（viewport、背景色、点阵、名称）

**Canvas Item = 业务单元**（每个节点独立拥有 skillId、state、位置尺寸、对话历史）

**Canvas Edge = 节点连线**（source → target，数据流依赖，已持久化）

```
Project
  ├── canvas_items[]
  │     └── item_messages[]
  └── canvas_edges[]
```

## 数据库表

| 表              | 说明                                                   |
| --------------- | ------------------------------------------------------ |
| `projects`      | 工作区元数据（viewport、bgColor、showDots、name）      |
| `canvas_items`  | 画布节点（positionX/Y、width、height、skillId、state） |
| `item_messages` | 节点级对话记录（role、content）                        |
| `canvas_edges`  | 节点连线（sourceItemId → targetItemId）                |
| `user_profile`  | 本地用户显示名（单行 `id = default`）                  |

迁移脚本位于 `db/migrations/`；`db/migrate.mjs` 按文件名顺序执行，并对已有库跳过 `0000` 的重复建表。

## 模型配置

LLM 凭据通过**必填环境变量**注入（`lib/server-model-config.ts`），不再写入数据库：

| 变量                | 说明               |
| ------------------- | ------------------ |
| `DEEPSEEK_API_KEY`  | API Key            |
| `DEEPSEEK_BASE_URL` | 兼容 OpenAI 的基址 |
| `DEEPSEEK_MODEL`    | 模型名称           |

缺失任一变量时，服务端在首次调用 `getServerModelConfig()` 时抛出错误。

## Skill 体系

- 仅**内置 Skill**（`source: "builtin"`），由 `lib/skills/register-builtins.ts` 懒加载注册
- 当前内置：`document`（文档生成）
- Manifest 定义：`lib/skills/document/`
- 阶段推导：`lib/skills/core/stage-engine.ts`（`deriveSkillStage` 仅需 `{ id, stages }`）
- Prompt 工厂：`lib/skills/system-prompt.ts`（`createSkillSystemPrompt` + `createAnswerSystemPrompt`）

## 节点对话与 AI 图

```
POST /api/projects/[projectId]/items/[itemId]/chat
  → handle-post.ts
  → documentGraph.invoke()（lib/graph/document-graph.ts）
       router → answer | generate
```

- **answer**：自然语言回复，不修改 state
- **generate**：输出 `{ message, state }`，由 `generateSkillOutput` 解析 JSON

流式事件：

- `data-node-chat-result`：文本增量与最终决策
- `data-skill-output`：仅在 commit 且 DB 写入成功时发送（`shouldSendSkillOutput`）

用户消息在图执行前通过 `createItemMessage` 持久化；助手消息在流结束后写入 `item_messages`。

## AI 输出

```typescript
{
  message: string;
  state: Record<string, unknown>;
}
```

- 文档 Skill：`state.content` 为完整 Markdown（全量替换，无 patch）
- 成功生成后更新 `canvas_items.state` 与 `item_messages`

## API

| 方法 | 路径                                            | 说明                                      |
| ---- | ----------------------------------------------- | ----------------------------------------- |
| POST | `/api/projects/[projectId]/items/[itemId]/chat` | 节点对话，流式返回文本与可选 skill output |

`maxDuration` 定义于 `app/api/config.ts`（当前 60s）。

## Server Actions（`app/projects/actions.ts`）

| Action                                              | 说明                               |
| --------------------------------------------------- | ---------------------------------- |
| `createCanvasItemAction`                            | 新增节点（按 manifest 初始 state） |
| `deleteCanvasItemAction`                            | 删除节点                           |
| `updateCanvasItemPositionAction`                    | 保存位置与宽高                     |
| `updateCanvasItemStateAction`                       | 保存节点 state（如手动编辑文档）   |
| `syncItemMessagesAction`                            | 全量替换节点对话记录               |
| `createCanvasEdgeAction` / `deleteCanvasEdgeAction` | 连线 CRUD                          |
| `updateProjectViewportAction`                       | 视口、背景、点阵、项目名称         |

个人资料仅通过 `/profile` 页面与 `saveUserProfileNameAction`（`app/profile/actions.ts`）更新显示名，无独立 REST API。

## 前端模块划分

| 路径                                                | 职责                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| `components/canvas/canvas-home.tsx`                 | 项目页客户端壳：items/edges 状态、侧栏、回调     |
| `components/canvas/flow-canvas.tsx`                 | React Flow 视图（薄组件）                        |
| `components/canvas/session-chat.tsx`                | 节点对话 UI 与流式消费                           |
| `hooks/use-flow-canvas-state.ts`                    | 画布交互：节点同步、缩放、连线、防抖保存         |
| `hooks/use-canvas-item-panel.ts`                    | 右侧对话面板开合动画                             |
| `hooks/use-debounced-callback.ts`                   | 通用防抖调度                                     |
| `lib/canvas/flow-mapper.ts`                         | items ↔ React Flow nodes 映射                    |
| `lib/canvas/node-content.ts`                        | 节点正文读取（document / fallback）              |
| `lib/canvas/node-wheel.ts`                          | 滚轮：节点内滚动 vs 画布缩放                     |
| `components/canvas/nodes/text-node.tsx`             | 通用节点 UI                                      |
| `components/canvas/nodes/document-plate-editor.tsx` | 文档节点 [Plate.js](https://platejs.org/) 编辑器 |
| `lib/plate/*`                                       | Plate 插件与 Markdown 互转                       |

## UI 流程

1. 打开项目 → 服务端加载 items、edges、manifests → `CanvasHome`
2. 「新增节点」→ 内置 Skill 立即创建；占位项（PPT/Word）仅 toast 提示
3. 点击节点 → 右侧 `ItemPanel` / `SessionChat`；拖标题栏移动节点
4. 选中节点 → 拖四角调整宽高；文档节点可 Plate 内编辑（选中时可编辑）
5. 上下 Handle 连线 → 持久化 `canvas_edges`
6. AI 回复 → 更新 `state.content` → 文档节点 Plate 同步展示

## 画布交互约定

- **拖拽**：节点卡片整体可拖；仅编辑中的 Plate / 可滚动预览区 `nodrag`
- **缩放**：默认滚轮/捏合缩放画布；内容可滚动且未到边界时 `stopPropagation` 优先滚节点
- **防抖**：布局 400ms、文档编辑 500ms、视口 400ms 写入 DB

## 演进（未实现）

- 占位节点（PPT、Word 等）落地为真实 Skill
- 合成节点读取 `canvas_edges` 上游 state
- 多用户 / 协作
