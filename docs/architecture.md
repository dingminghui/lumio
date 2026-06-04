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
| `projects`      | 工作区元数据（viewport、bgColor、showDots）            |
| `canvas_items`  | 画布节点（positionX/Y、width、height、skillId、state） |
| `item_messages` | 节点级对话记录                                         |
| `canvas_edges`  | 节点连线                                               |

## Skill 体系

- 仅**内置 Skill**（`source: "builtin"`），注册于 `lib/skills/register-builtins.ts`
- 当前内置：`document`（文档生成）
- 自定义 Skill（`user_skills`）已从产品逻辑移除
- 设置页 `SkillCatalog` 只读展示内置模板

## AI 输出

```typescript
{
  message: string;
  state: Record<string, unknown>;
}
```

- 文档 Skill：`state.content` 为完整 Markdown（全量替换，无 patch）
- 聊天 API 写入 `canvas_items.state` 与 `item_messages`

## API

| 方法 | 路径                                            | 说明                                    |
| ---- | ----------------------------------------------- | --------------------------------------- |
| POST | `/api/projects/[projectId]/items/[itemId]/chat` | 节点对话，流式返回 `{ message, state }` |

## Server Actions（`app/projects/actions.ts`）

| Action                                              | 说明                             |
| --------------------------------------------------- | -------------------------------- |
| `createCanvasItemAction`                            | 新增节点                         |
| `deleteCanvasItemAction`                            | 删除节点                         |
| `updateCanvasItemPositionAction`                    | 保存位置与宽高                   |
| `updateCanvasItemStateAction`                       | 保存节点 state（如手动编辑文档） |
| `createCanvasEdgeAction` / `deleteCanvasEdgeAction` | 连线 CRUD                        |
| `updateProjectViewportAction`                       | 视口与画布外观                   |

## 前端模块划分

| 路径                                                | 职责                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| `components/canvas/canvas-home.tsx`                 | 项目页客户端壳：items/edges 状态、侧栏、回调     |
| `components/canvas/flow-canvas.tsx`                 | React Flow 视图（薄组件）                        |
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
2. 「新增节点」→ 内置 Skill 立即创建；占位项（PPT/Word 等）仅 toast 提示
3. 点击节点 → 右侧 `ItemPanel` / `ItemChat`；拖标题栏移动节点
4. 选中节点 → 拖四角调整宽高；文档节点可 Plate 内编辑（选中时可编辑）
5. 上下 Handle 连线 → 持久化 `canvas_edges`
6. AI 回复 → 更新 `state.content` → 文档节点 Plate 同步展示

## 画布交互约定

- **拖拽**：节点卡片整体可拖；仅编辑中的 Plate / 可滚动预览区 `nodrag`
- **缩放**：默认滚轮/捏合缩放画布；内容可滚动且未到边界时 `stopPropagation` 优先滚节点
- **防抖**：布局 400ms、文档编辑 500ms、视口 400ms 写入 DB

## 演进（未实现）

- 占位节点（PPT、Word、HTML 合成等）落地为真实 Skill
- 合成节点读取 `canvas_edges` 上游 state
- 多用户 / 协作
