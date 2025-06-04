import { z } from "zod";

const envSchema = z.object({
  PROJECT_ID: z.string(),
  MODEL: z.string().default("gemini-2.5-flash-preview-05-20"),
  MODEL_REGION: z.string().default("us-central1"),
  MCP_CONFIG: z.string().default("./mcp-config.json"),
});

export const env = envSchema.parse(process.env);
