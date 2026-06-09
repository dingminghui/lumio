import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { streamText, type LanguageModel, type ModelMessage } from "ai";

import {
  createSkillOutputErrorMessage,
  generateSkillOutput,
} from "@/lib/skills/generate-skill-output";
import { decideNodeChatAction } from "@/lib/skills/node-chat-decision";
import {
  type NodeChatDecision,
  type NodeChatResult,
} from "@/lib/skills/node-chat-schema";
import {
  createAnswerSystemPrompt,
  createSkillSystemPrompt,
} from "@/lib/skills/system-prompt";
import type { SimpleSkillOutput, SkillManifest } from "@/types/skill";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const DocumentState = Annotation.Root({
  messages: Annotation<ModelMessage[]>({ default: () => [], reducer: (_, b) => b }),
  manifest: Annotation<SkillManifest>({
    default: () => null as unknown as SkillManifest,
    reducer: (_, b) => b,
  }),
  itemState: Annotation<Record<string, unknown>>({
    default: () => ({}),
    reducer: (_, b) => b,
  }),
  model: Annotation<LanguageModel>({
    default: () => null as unknown as LanguageModel,
    reducer: (_, b) => b,
  }),
  latestUserMessage: Annotation<string>({ default: () => "", reducer: (_, b) => b }),
  decision: Annotation<NodeChatDecision | null>({
    default: () => null,
    reducer: (_, b) => b,
  }),
  result: Annotation<NodeChatResult | null>({
    default: () => null,
    reducer: (_, b) => b,
  }),
});

export type DocumentGraphState = typeof DocumentState.State;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOnText(config: RunnableConfig): (delta: string) => void {
  return (
    (config.configurable?.onText as ((delta: string) => void) | undefined) ?? (() => {})
  );
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

async function routerNode(
  state: DocumentGraphState,
): Promise<Partial<DocumentGraphState>> {
  const decision = await decideNodeChatAction({
    model: state.model,
    messages: state.messages,
    manifest: state.manifest,
    itemState: state.itemState,
    latestUserMessage: state.latestUserMessage,
  });

  return { decision };
}

async function answerNode(
  state: DocumentGraphState,
  config: RunnableConfig,
): Promise<Partial<DocumentGraphState>> {
  const onText = getOnText(config);
  let message = "";

  const textStream = streamText({
    model: state.model,
    system: createAnswerSystemPrompt(state.manifest, state.itemState),
    messages: state.messages,
  });

  for await (const delta of textStream.textStream) {
    onText(delta);
    message += delta;
  }

  const result: NodeChatResult = {
    message: message.trim() || (state.decision?.message ?? ""),
    toolCalls: [],
    write: "none",
  };

  return { result };
}

async function generateNode(
  state: DocumentGraphState,
  config: RunnableConfig,
): Promise<Partial<DocumentGraphState>> {
  const onText = getOnText(config);
  let streamedMessage = "";

  function writeMessage(nextMessage: string) {
    if (!nextMessage || nextMessage === streamedMessage) {
      return;
    }

    if (!nextMessage.startsWith(streamedMessage)) {
      return;
    }

    onText(nextMessage.slice(streamedMessage.length));
    streamedMessage = nextMessage;
  }

  let output: SimpleSkillOutput;

  try {
    output = await generateSkillOutput({
      model: state.model,
      system: createSkillSystemPrompt({
        manifest: state.manifest,
        itemState: state.itemState,
      }),
      messages: state.messages,
      onPartialMessage: writeMessage,
    });

    writeMessage(output.message);
  } catch (error) {
    const message = createSkillOutputErrorMessage({ error, streamedMessage });
    output = {
      message,
      state: { ...state.itemState, status: "error", error: message },
    };
    writeMessage(message);
  }

  const result: NodeChatResult = {
    message: output.message,
    toolCalls: [],
    output,
    write: state.decision?.write ?? "commit",
  };

  return { result };
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function routeDecision(state: DocumentGraphState): string {
  return state.decision?.action === "answer" ? "answer" : "generate";
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

const workflow = new StateGraph(DocumentState)
  .addNode("router", routerNode)
  .addNode("answer", answerNode)
  .addNode("generate", generateNode)
  .addEdge(START, "router")
  .addConditionalEdges("router", routeDecision)
  .addEdge("answer", END)
  .addEdge("generate", END);

export const documentGraph = workflow.compile();
