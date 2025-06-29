import { z } from "zod";

// const DEFAULT_MODEL = "gemini-2.5-flash";
// const DEFAULT_MODEL = "gemini-2.5-flash-lite-preview-06-17";
const DEFAULT_MODEL = "gemini-2.0-flash";

const envSchema = z.object({
  PROJECT_ID: z.string(),
  MODEL: z.string().default(DEFAULT_MODEL),
  MODEL_REGION: z.string().default("global"),
  MCP_CONFIG: z.string().default("./mcp-config.json"),
});

export const env = envSchema.parse(process.env);
