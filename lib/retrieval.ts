import OpenAI from "openai";
import { search_subjects, get_subject_chunks, search_chunks } from "./tools.js";
import { c } from "./colors.js";
import { RETRIEVAL_MODEL, RETRIEVAL_SYSTEM, retrievalTools } from "./prompts.js";

const openai = new OpenAI();

async function executeRetrievalTool(
  name: string,
  input: Record<string, any>
): Promise<string> {
  switch (name) {
    case "search_subjects":
      return JSON.stringify(await search_subjects(input.query));
    case "get_subject_chunks":
      return JSON.stringify(await get_subject_chunks(input.subject_id, input.type));
    case "search_chunks":
      return JSON.stringify(await search_chunks(input.query));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function toolColor(name: string): string {
  switch (name) {
    case "search_subjects": return c.cyan;
    case "get_subject_chunks": return c.magenta;
    case "search_chunks": return c.yellow;
    default: return c.white;
  }
}

export async function runRetrievalAgent(
  conversationMessages: OpenAI.ChatCompletionMessageParam[]
): Promise<string> {
  const contextSummary = conversationMessages
    .map((m) => {
      const role = m.role === "user" ? "Användare" : "Assistent";
      const text =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? (m.content as any[])
                .filter((b: any) => b.type === "text")
                .map((b: any) => b.text)
                .join("\n")
            : "";
      return `${role}: ${text}`;
    })
    .join("\n\n");

  let messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: RETRIEVAL_SYSTEM,
    },
    {
      role: "user",
      content: `Här är den pågående konversationen:\n\n${contextSummary}\n\nSök i minnet efter information som är relevant för att besvara den senaste frågan.`,
    },
  ];

  let toolCallCount = 0;

  while (toolCallCount < 15) {
    const response = await openai.chat.completions.create({
      model: RETRIEVAL_MODEL,
      max_completion_tokens: 4096,
      tools: retrievalTools,
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
      const color = toolColor(toolCall.function.name);
      const argsStr = Object.values(args).join(", ");
      console.log(`  ${c.dim}${toolCallCount}/15${c.reset}  ${color}${toolCall.function.name}${c.reset}${c.gray}(${argsStr})${c.reset}`);
      const result = await executeRetrievalTool(toolCall.function.name, args);
      const parsed = JSON.parse(result);
      const count = Array.isArray(parsed) ? parsed.length : 0;
      console.log(`       ${count > 0 ? c.green : c.red}${count} results${c.reset}`);
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

  return "Retrieval-agenten nådde max antal tool calls utan att ge ett slutsvar.";
}
