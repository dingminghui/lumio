# 画布与节点

本文档描述当前已实现的画布行为，与 `docs/architecture.md` 互补。

## 节点类型

所有 Skill 默认映射为 React Flow `type: "text"`（`TextNode`）。

| Skill                  | 节点内展示                                                 | 编辑                       |
| ---------------------- | ---------------------------------------------------------- | -------------------------- |
| `document`（文档生成） | [Plate.js](https://platejs.org/) 富文本，底层仍为 Markdown | 默认只读；点击铅笔 → `onStartDocumentEdit`（选中 + 布局 60%×70% + fitView）→ 可编辑；节点失焦锁定；AI 更新仍 remount 同步 |
| 其他 / 未来            | Markdown 预览（Streamdown）或 state 字段回退展示           | 仅对话面板                 |

Plate 配置（`lib/plate/document-editor-plugins.ts`）：

- `BasicBlocksPlugin`：段落、标题、引用等
- `BasicMarksPlugin`：粗体、斜体、下划线等
- `MarkdownPlugin`：`state.content` ↔ 编辑器 Value

`DocumentPlateEditor` 通过 `next/dynamic` 懒加载，减小首屏 bundle。

## 尺寸约束

定义于 `lib/canvas/node-layout.ts`：

| 属性 | 范围       | 默认                                             |
| ---- | ---------- | ------------------------------------------------ |
| 宽度 | 280–720 px | 400（或 manifest `defaultSize.w`）               |
| 高度 | 120–560 px | 120（新建文档节点可用 manifest `defaultSize.h`） |

## 新增节点菜单

`lib/canvas/node-menu.ts`：

- **可用**：`registry.listSkillOptions()` 内置 Skill（当前为「文档生成」）
- **占位**：生成 PPT、生成 Word、生成配图、HTML 合成 → 点击 toast「暂时还没有开发好呢」

## 连线

- 节点顶部 `target`、底部 `source` Handle
- `nodesConnectable` 开启；连接成功调用 `createCanvasEdgeAction`
- 删除边同步 `deleteCanvasEdgeAction`

## 状态同步策略

React Flow 内节点 position/size 为交互态真相；`items` prop 更新时（如 AI 改 state）通过 `syncNodesFromItems` **仅保留**当前拖拽中的 position/width/height，避免节点跳回数据库坐标。

节点 `data` 回调通过 `NodeInteractionHandlers` 注入（`useMemo`），避免 render 阶段读写 ref（符合 React 19 / ESLint `react-hooks/refs`）。

## 滚动条

所有可滚动容器使用统一 class：`lumio-scrollbar`（样式在 `styles/lumio-scrollbar.css`，CSS 变量在 `app/globals.css` `:root`）。

- 细圆角滑块、颜色跟随 `--border` / `--muted-foreground`
- Radix `ScrollArea`：`components/ui/scroll-area.css`
- 节点 / Plate / 取色器等非通用样式放在对应组件的 `.css` 文件中
- 代码中可引用 `LUMIO_SCROLLBAR_CLASS`（`lib/ui/scroll.ts`）

## 滚轮行为

此前在整块内容区使用 `nowheel` 会导致鼠标在节点上时无法缩放画布。

当前逻辑（`lib/canvas/node-wheel.ts`）：

1. 内容区**不使用** `nowheel`
2. 可滚动容器在「还能继续滚」时 `stopPropagation`，否则事件交给画布 `zoomOnScroll`

## 快捷键

- `Shift + 1`：适应画布（fit view）

## 相关文件速查

```
components/canvas/
  canvas-home.tsx          # 页面状态机
  flow-canvas.tsx          # React Flow 壳
  flow-canvas-toolbar.tsx  # 新增节点 / 对话按钮
  nodes/text-node.tsx
  nodes/document-plate-editor.tsx
hooks/
  use-flow-canvas-state.ts
  use-canvas-item-panel.ts
  use-debounced-callback.ts
lib/canvas/
  flow-mapper.ts
  node-menu.ts
  node-wheel.ts
  constants.ts
```
