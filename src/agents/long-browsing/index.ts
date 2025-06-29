import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { toolsMCPServers } from "../../mcp";
import { env } from "../../env";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage } from "@langchain/core/messages";
import { todoTools, type TodoItem } from "../../tools/todo";
import { createCompactionHook } from "../../hooks/compaction/lastn";
import { BROWSER_AGENT_SYSTEM_PROMPT } from "./system-prompt";
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

const model = new ChatVertexAI({
  model: env.MODEL,
  location: env.MODEL_REGION,
  authOptions: {
    projectId: env.PROJECT_ID,
  },
});

const mcpTools = await toolsMCPServers(env.MCP_CONFIG);
const allTools = [...mcpTools, ...todoTools];

const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  todolist: Annotation<TodoItem[] | null>(),
});

export const agent = createReactAgent({
  llm: model,
  tools: allTools,
  stateSchema: StateAnnotation,
  prompt: new SystemMessage(BROWSER_AGENT_SYSTEM_PROMPT),
  preModelHook: createCompactionHook(),
});
