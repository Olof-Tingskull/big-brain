import OpenAI from "openai";
import {
  create_chunk,
  update_chunk,
  delete_chunk,
  create_subject,
  update_subject_summary,
  link_chunk_subject,
  list_subject_chunks,
} from "./write-tools.js";
import { c } from "./colors.js";
import { WRITER_MODEL, WRITER_SYSTEM, writerTools } from "./prompts.js";

const openai = new OpenAI();

async function executeWriterTool(
  name: string,
  input: Record<string, any>
): Promise<string> {
  switch (name) {
    case "create_chunk":
      return JSON.stringify(
        await create_chunk(input.content, input.type, input.metadata, input.subject_ids)
      );
    case "update_chunk":
      return JSON.stringify(await update_chunk(input.chunk_id, input.content));
    case "delete_chunk":
      return JSON.stringify(await delete_chunk(input.chunk_id));
    case "create_subject":
      return JSON.stringify(
        await create_subject(input.name, input.type, input.initial_summary)
      );
    case "update_subject_summary":
      return JSON.stringify(
        await update_subject_summary(input.subject_id, input.new_summary)
      );
    case "link_chunk_subject":
      return JSON.stringify(
        await link_chunk_subject(input.chunk_id, input.subject_id)
      );
    case "list_subject_chunks":
      return JSON.stringify(await list_subject_chunks(input.subject_id));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function runWriterAgent(
  userInput: string,
  retrievalContext: string
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: WRITER_SYSTEM },
    {
      role: "user",
      content: `NY INFORMATION:\n${userInput}\n\nBEFINTLIG KONTEXT:\n${retrievalContext}`,
    },
  ];

  let toolCallCount = 0;

  while (toolCallCount < 15) {
    const response = await openai.chat.completions.create({
      model: WRITER_MODEL,
      max_completion_tokens: 4096,
      tools: writerTools,
      messages,
    });

    const choice = response.choices[0];
    const message = choice.message;

    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? "";
    }

    for (const toolCall of message.tool_calls) {
      toolCallCount++;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`  ${c.dim}${toolCallCount}/15${c.reset}  ${c.cyan}${toolCall.function.name}${c.reset}`);
      const result = await executeWriterTool(toolCall.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    if (choice.finish_reason === "stop") {
      return message.content ?? "";
    }
  }

  return "Writer-agenten nådde max antal tool calls utan att ge ett slutsvar.";
}
