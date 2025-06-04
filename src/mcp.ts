import type { StructuredToolInterface } from "@langchain/core/tools";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import * as fs from "node:fs/promises";

type MCPConfigJSON = {
  mcpServers: Record<string, unknown>;
};

function isMCPConfigJSON(input: unknown): input is MCPConfigJSON {
  return (
    typeof input === "object" &&
    input !== null &&
    "mcpServers" in input &&
    typeof input.mcpServers === "object" &&
    input.mcpServers !== null
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function initializeMCPClient(config: any): MultiServerMCPClient {
  if (!isMCPConfigJSON(config)) {
    throw new Error("mcpServers configuration is missing or invalid");
  }
  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    useStandardContentBlocks: true,

    // もしダメなら @langchain/mcp-adapters 側のスキーマ検証に通らずエラーになるので気にしない
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    mcpServers: config.mcpServers,
  });
  return client;
}

export async function toolsMCPServers(
  configPath: string
): Promise<StructuredToolInterface[]> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const client = initializeMCPClient(config);
  return await client.getTools();
}
