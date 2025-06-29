import type { DynamicStructuredTool } from "@langchain/core/tools";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  Annotation,
  Command,
  getCurrentTaskInput,
  type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";

export interface TodoListConfig {
  messagesKey: string;
  stateKey: string;
}

const defaultTodoListConfig: TodoListConfig = {
  stateKey: "todolist",
  messagesKey: "messages",
};

export type TodoState = "todo" | "doing" | "done";

export interface TodoItem {
  index: number;
  task: string;
  state: TodoState;
}

function getStateFromGraph(
  config: LangGraphRunnableConfig | undefined,
  stateKey: string
): TodoItem[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const StateAnnotation = Annotation.Root({
    [stateKey]: Annotation<TodoItem[] | null>(),
  });
  const state = getCurrentTaskInput<typeof StateAnnotation.State>(config);
  return state[stateKey] || [];
}

function createList(tasks: string[]): TodoItem[] {
  return tasks.map((task, index) => ({
    index,
    task,
    state: "todo",
  }));
}

function addTodoItem(list: TodoItem[], task: string): TodoItem[] {
  const newIndex =
    list.length > 0 ? Math.max(...list.map((item) => item.index)) + 1 : 0;
  const newTodo: TodoItem = {
    index: newIndex,
    task,
    state: "todo",
  };
  return [...list, newTodo];
}

function updateTodoState(
  list: TodoItem[],
  index: number,
  state: TodoState
): TodoItem[] {
  return list.map((todo) => (todo.index === index ? { ...todo, state } : todo));
}

function startItem(list: TodoItem[], index: number): TodoItem[] {
  return updateTodoState(list, index, "doing");
}

function doneItem(list: TodoItem[], index: number): TodoItem[] {
  return updateTodoState(list, index, "done");
}

function removeItem(list: TodoItem[], index: number): TodoItem[] {
  return list
    .filter((todo) => todo.index !== index)
    .map((todo, i) => ({ ...todo, index: i }));
}

export const formatTodoList = (todos: TodoItem[]): string => {
  if (todos.length === 0) {
    return "No TODO items found.";
  }
  function format(todo: TodoItem): string {
    const symbol = {
      todo: " ",
      doing: "*",
      done: "x",
    }[todo.state];
    return `- [${symbol}] ${todo.index}: ${todo.task}`;
  }
  const legend = `(Status: [ ]=TODO, [*]=IN_PROGRESS, [x]=COMPLETED)`;
  return [...todos.map(format), legend].join("\n");
};

function isAllDone(todos: TodoItem[]): boolean {
  return todos.every((todo) => todo.state === "done");
}

function formatContent(msg: string, todos: TodoItem[]): string {
  if (todos.length === 0) return msg;
  return `${msg}\n---\n${formatTodoList(todos)}`;
}

export function createTodoTools(
  toolConfig: TodoListConfig
): DynamicStructuredTool[] {
  const { stateKey, messagesKey } = toolConfig;

  const createTodoListTool = tool(
    (input, config) => {
      const list = getStateFromGraph(config, stateKey);
      if (!isAllDone(list))
        throw new Error(
          "A TODO list already exists. Please complete all TODOs or clear the list before creating a new one."
        );

      const todos = createList(input.tasks);
      const msg = "TODO list created! Let's get started on these tasks.";
      return new Command({
        update: {
          [stateKey]: todos,
          [messagesKey]: [
            new ToolMessage({
              content: formatContent(msg, todos),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              tool_call_id: config.toolCall.id as string,
            }),
          ],
        },
      });
    },
    {
      name: "create_todo_list",
      description: "Create a new TODO list for multi-step tasks",
      schema: z.object({
        tasks: z.array(z.string()).describe("List of tasks to be executed"),
      }),
    }
  );
  const addTodoItemTool = tool(
    (input, config) => {
      const list = getStateFromGraph(config, stateKey);
      const updatedList = addTodoItem(list, input.task);
      const msg =
        "Task added to your TODO list! Let's keep the momentum going with the next task.";
      return new Command({
        update: {
          [stateKey]: updatedList,
          [messagesKey]: [
            new ToolMessage({
              content: formatContent(msg, updatedList),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              tool_call_id: config.toolCall.id as string,
            }),
          ],
        },
      });
    },
    {
      name: "add_todo_item",
      description: "Add a new item to the TODO list",
      schema: z.object({
        task: z.string().describe("Task to add"),
      }),
    }
  );

  const startTodoItemTool = tool(
    (input, config) => {
      const list = getStateFromGraph(config, stateKey);
      const updatedList = startItem(list, input.index);
      const msg =
        "Task added to your TODO list! Let's keep the momentum going with the next task.";
      return new Command({
        update: {
          [stateKey]: updatedList,
          [messagesKey]: [
            new ToolMessage({
              content: formatContent(msg, updatedList),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              tool_call_id: config.toolCall.id as string,
            }),
          ],
        },
      });
    },
    {
      name: "start_todo_item",
      description: "Set a TODO item to started state",
      schema: z.object({
        index: z.number().describe("Index of the item to start"),
      }),
    }
  );

  const completeTodoItemTool = tool(
    (input, config) => {
      const list = getStateFromGraph(config, stateKey);
      const updatedList = doneItem(list, input.index);
      const msg = isAllDone(updatedList)
        ? "All tasks completed. Great job! Let's plan the next steps."
        : "Task completed! Let's move on to the next one.";
      return new Command({
        update: {
          [stateKey]: updatedList,
          [messagesKey]: [
            new ToolMessage({
              content: formatContent(msg, updatedList),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              tool_call_id: config.toolCall.id as string,
            }),
          ],
        },
      });
    },
    {
      name: "complete_todo_item",
      description: "Set a TODO item to completed state",
      schema: z.object({
        index: z.number().describe("Index of the item to complete"),
      }),
    }
  );

  const removeTodoItemTool = tool(
    (input, config) => {
      const list = getStateFromGraph(config, stateKey);
      const updatedList = removeItem(list, input.index);
      const msg =
        "Task removed from your TODO list! Let's focus on the remaining tasks.";

      return new Command({
        update: {
          [stateKey]: updatedList,
          [messagesKey]: [
            new ToolMessage({
              content: formatContent(msg, updatedList),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              tool_call_id: config.toolCall.id as string,
            }),
          ],
        },
      });
    },
    {
      name: "remove_todo_item",
      description: "Remove an item from the TODO list",
      schema: z.object({
        index: z.number().describe("Index of the item to remove"),
      }),
    }
  );

  const clearTodoListTool = tool(
    (_, config) => {
      const msg = "TODO list cleared! Let's start fresh with new tasks.";
      return new Command({
        update: {
          [stateKey]: [],
          [messagesKey]: [
            new ToolMessage({
              content: formatContent(msg, []),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              tool_call_id: config.toolCall.id as string,
            }),
          ],
        },
      });
    },
    {
      name: "clear_todo_list",
      description: "Completely clear the TODO list",
      schema: z.object({}),
    }
  );

  return [
    createTodoListTool,
    addTodoItemTool,
    startTodoItemTool,
    completeTodoItemTool,
    removeTodoItemTool,
    clearTodoListTool,
  ];
}

export const todoTools = createTodoTools(defaultTodoListConfig);
