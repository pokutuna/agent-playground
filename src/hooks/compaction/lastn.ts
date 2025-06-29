import type { BaseMessage } from "@langchain/core/messages";
import { AIMessageChunk, RemoveMessage } from "@langchain/core/messages";
import {
  REMOVE_ALL_MESSAGES,
  type MessagesAnnotation,
} from "@langchain/langgraph";

export type CompactionConfig = {
  lastN: number;
  maxTokens: number;
  compactionThreshold: number;
};

const defaultCompactionConfig: CompactionConfig = {
  lastN: 10,
  maxTokens: 512 * 1000,
  compactionThreshold: 256 * 1000,
};

/**
 * messages から入出力トークンを返す
 * 末尾の AIMessageChunk の usage_metadata を参照
 */
export function tokenUsage(messages: BaseMessage[]): number | null {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage instanceof AIMessageChunk && lastMessage.usage_metadata) {
    const usageMetadata = lastMessage.usage_metadata;
    return usageMetadata.total_tokens;
  }
  return null;
}

export function createCompactionHook(options?: Partial<CompactionConfig>) {
  const config = { ...defaultCompactionConfig, ...options };
  return async (
    state: typeof MessagesAnnotation.State
  ): Promise<typeof MessagesAnnotation.State> => {
    const tokens = tokenUsage(state.messages);
    if (tokens && tokens > config.compactionThreshold) {
      // eslint-disable-next-line no-console
      console.log(`Messages reached ${tokens} tokens, compacting...`);
      return {
        messages: [
          new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
          ...state.messages.slice(-config.lastN),
        ],
      };
    }
    return { messages: [] };
  };
}
