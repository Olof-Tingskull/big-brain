import OpenAI from "openai";
import {
  create_chunk,
  update_chunk,
  delete_chunk,
  create_subject,
  update_subject_summary,
  link_chunk_subject,
  list_subject_chunks,
  mark_consolidated,
} from "./write-tools.js";
import { c } from "./colors.js";
import {
  CONSOLIDATOR_MODEL,
  CONSOLIDATOR_SYSTEM,
  consolidatorTools,
  MAX_CONSOLIDATOR_TOOL_CALLS,
} from "./prompts.js";

const openai = new OpenAI();

type SubjectInfo = {
  id: number;
  name: string;
  type: string;
  summary: string | null;
};

type ChunkInfo = {
  id: number;
  content: string;
  metadata: unknown;
  created_at: Date | null;
};

async function executeConsolidatorTool(
  name: string,
  input: Record<string, any>
): Promise<string> {
  switch (name) {
    case "list_subject_chunks":
      return JSON.stringify(await list_subject_chunks(input.subject_id));
    case "create_chunk":
      return JSON.stringify(
        await create_chunk(input.content, input.metadata ?? {}, input.subject_ids)
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
    case "mark_consolidated":
      return JSON.stringify(await mark_consolidated(input.subject_id));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function runConsolidatorAgent(
  subject: SubjectInfo,
  chunks: ChunkInfo[]
): Promise<string> {
  const chunkList = chunks
    .map(
      (ch) =>
        `[chunk ${ch.id}] (${ch.content.length} tecken)\n${ch.content}`
    )
    .join("\n\n");

  const userMessage = `SUBJECT: [id=${subject.id}] ${subject.name} (${subject.type})
SUMMARY: ${subject.summary ?? "(ingen)"}

CHUNKS (${chunks.length} st):

${chunkList}

Analysera och consolidera detta subject. Anropa mark_consolidated(${subject.id}) när du är klar.`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: CONSOLIDATOR_SYSTEM },
    { role: "user", content: userMessage },
  ];

  let toolCallCount = 0;

  while (toolCallCount < MAX_CONSOLIDATOR_TOOL_CALLS) {
    const response = await openai.chat.completions.create({
      model: CONSOLIDATOR_MODEL,
      max_completion_tokens: 4096,
      tools: consolidatorTools,
      messages,
    });

    const choice = response.choices[0];
    const message = choice.message;

    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? "";
    }

    // Check if this batch would blow the limit
    if (toolCallCount + message.tool_calls.length > MAX_CONSOLIDATOR_TOOL_CALLS) {
      // Execute only the ones that fit
      const remaining = MAX_CONSOLIDATOR_TOOL_CALLS - toolCallCount;
      const toExecute = message.tool_calls.slice(0, remaining);
      const toSkip = message.tool_calls.slice(remaining);

      for (const toolCall of toExecute) {
        toolCallCount++;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(
          `  ${c.dim}${toolCallCount}/${MAX_CONSOLIDATOR_TOOL_CALLS}${c.reset}  ${c.cyan}${toolCall.function.name}${c.reset}${c.gray}(${formatArgs(toolCall.function.name, args)})${c.reset}`
        );
        const result = await executeConsolidatorTool(toolCall.function.name, args);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }

      // Return error for skipped ones
      for (const toolCall of toSkip) {
        console.log(`  ${c.red}SKIPPED${c.reset} ${c.dim}${toolCall.function.name}${c.reset}`);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: "Skipped — max tool calls reached." }),
        });
      }

      // Final summary call — no tools, just text
      console.log(`  ${c.dim}Max tool calls nådd — hämtar sammanfattning...${c.reset}`);
      try {
        const finalResponse = await openai.chat.completions.create({
          model: CONSOLIDATOR_MODEL,
          max_completion_tokens: 2048,
          messages,
        });
        return finalResponse.choices[0].message.content ?? "Consolidation klar (max tool calls nådd).";
      } catch {
        return "Consolidation avbruten vid max tool calls.";
      }
    }

    // Normal execution — all fit within limit
    for (const toolCall of message.tool_calls) {
      toolCallCount++;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(
        `  ${c.dim}${toolCallCount}/${MAX_CONSOLIDATOR_TOOL_CALLS}${c.reset}  ${c.cyan}${toolCall.function.name}${c.reset}${c.gray}(${formatArgs(toolCall.function.name, args)})${c.reset}`
      );
      const result = await executeConsolidatorTool(
        toolCall.function.name,
        args
      );
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

  return "Consolidation-agenten nådde max antal tool calls.";
}

function formatArgs(name: string, args: Record<string, any>): string {
  switch (name) {
    case "list_subject_chunks":
      return `subject ${args.subject_id}`;
    case "create_chunk":
      return `${(args.content as string).slice(0, 50)}...`;
    case "update_chunk":
      return `chunk ${args.chunk_id}`;
    case "delete_chunk":
      return `chunk ${args.chunk_id}`;
    case "create_subject":
      return `${args.name}`;
    case "update_subject_summary":
      return `subject ${args.subject_id}`;
    case "link_chunk_subject":
      return `chunk ${args.chunk_id} ↔ subject ${args.subject_id}`;
    case "mark_consolidated":
      return `subject ${args.subject_id}`;
    default:
      return JSON.stringify(args);
  }
}
