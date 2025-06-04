import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { toolsMCPServers } from "./mcp";
import { env } from "./env";
import { ChatVertexAI } from "@langchain/google-vertexai";

const model = new ChatVertexAI({
  model: env.MODEL,
  location: env.MODEL_REGION,
  authOptions: {
    projectId: env.PROJECT_ID,
  },
});

export const agent = createReactAgent({
  llm: model,
  tools: await toolsMCPServers(env.MCP_CONFIG),
});
