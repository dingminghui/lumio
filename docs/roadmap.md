# Lumio 产品路线图

## 终局目标

**面向内容创作者的多 Agent 内容生产系统**——在可视化画布上，将职责明确的 AI Agent 连接成生产流水线，最终输出可直接交付的内容产物（文档、报告、落地页等）。

区别于 Manus 的「黑盒自主执行」，Lumio 强调：

- **可见**：每个 Agent 是画布上的节点，步骤透明
- **可控**：用户编排流水线，AI 执行生产
- **可审核**：支持合规/质检节点介入生产链路

### 终局 Agent 架构（9 个专职角色）

```
Content Orchestrator          ← 项目级编排中枢
├── Intention & Scenario      ← 场景意图识别
├── Material Routing          ← 素材路由与上下文组装
├── Storyline & Narrative     ← 叙事结构与大纲
├── Content Crafting          ← 内容生产（文案/文档）
├── Compliance & MLR Review   ← 合规与审核（差异化护城河）
├── Knowledge Evolution       ← Skill 知识进化
├── Memory & Context Mgmt     ← 跨节点/跨项目记忆
└── Quality & Evaluation      ← 质量自动评估
```

---

## 当前状态（V0）

| 能力 | 状态 |
|------|------|
| 可视化画布 + 节点布局 | ✅ 已实现 |
| 节点级 AI 对话（answer / generate） | ✅ 已实现 |
| `document` Skill（Markdown 文档） | ✅ 已实现 |
| 边（连线）持久化与渲染 | ✅ 已实现，**未参与 AI** |
| 上游节点 state 注入下游 prompt | ❌ 未实现 |
| 多 Skill 类型（大纲、合成） | ❌ 未实现 |
| 项目级 Orchestrator | ❌ 未实现 |
| 合规/质检节点 | ❌ 未实现 |

---

## V1 目标：「最小可跑通的内容流水线」

**验收标准：** 用户在画布上用 3 个节点（文案 → 大纲 → 合成），跑通「上游生成 → 连线 → 合成节点读取上游 → 输出完整交付物」全链路。

### 里程碑 1：上游边上下文注入（~1 周）

详见 [step-1-upstream-context.md](./step-1-upstream-context.md)

### 里程碑 2：outline + compose Skill（~2 周）

- 新增 `outline` skill：结构化大纲生产（章节标题 + 要点列表）
- 新增 `compose` skill：消费所有上游节点，合并输出完整 Markdown

### 里程碑 3：项目级 Intention Router（~1 周）

- 将 `decideNodeChatAction` 升级为感知「合成节点」的场景路由
- 合成节点触发时，Orchestrator 收集全部上游 state 再调用 compose

### 里程碑 4：极简 Quality Pass（~3 天）

- 合成后跑一次 checklist prompt（结构完整性 + 覆盖上游要点 + 格式合规）
- 不通过则自动 regenerate 一次

### 里程碑 5：导出交付物（~3 天）

- 复制 Markdown / 导出 .md 文件
- 为后续 HTML 合成节点预留接口

---

## V2 目标：内容生产系统初步成型

- `Compliance & MLR Review` Agent（最重要的差异化节点）
- 素材路由：连接外部文件/URL 作为上游素材节点
- 叙事引擎独立化：Storyline Agent 支持多种内容体裁

## V3 目标：平台化

- Knowledge Evolution：基于用户反馈迭代 Skill prompt
- Memory 升级：向量存储 + 跨项目长期记忆
- API 开放 + 团队协作
