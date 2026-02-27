import OpenAI from "openai";
import readline from "readline";
import { end } from "../lib/db.js";
import { c } from "../lib/colors.js";
import { createStreamFormatter } from "../lib/format.js";
import { MODEL, RETRIEVAL_MODEL, WRITER_MODEL, MAIN_SYSTEM, brainTools } from "../lib/prompts.js";
import { runRetrievalAgent, type RetrievalResult } from "../lib/retrieval.js";
import { runWriterAgent } from "../lib/writer.js";
import "dotenv/config";

const openai = new OpenAI();

const CONFIRMATION_WORDS = new Set(["ja", "nej", "ok", "tack", "nä", "japp", "nope", "yes", "no"]);

function isShortConfirmation(input: string): boolean {
  const words = input.toLowerCase().split(/\s+/);
  return words.length <= 3 && words.some((w) => CONFIRMATION_WORDS.has(w));
}

function buildContextBlock(retrieval: RetrievalResult): string {
  const subjectList = retrieval.data.subjects
    .map((s) => `  [subject ${s.id}] ${s.name} (${s.type}): ${s.summary ?? "ingen sammanfattning"}`)
    .join("\n");

  const chunkList = retrieval.data.chunks
    .map((ch) => `  [chunk ${ch.id}] ${ch.content.slice(0, 200)}${ch.content.length > 200 ? "..." : ""}`)
    .join("\n");

  const parts = [
    "MINNESKONTEXT:",
    retrieval.summary,
    subjectList ? `\nBEFINTLIGA SUBJECTS:\n${subjectList}` : "",
    chunkList ? `\nBEFINTLIGA CHUNKS:\n${chunkList}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: MAIN_SYSTEM },
  ];

  let lastRetrieval: RetrievalResult | null = null;

  console.log();
  console.log(`  ${c.bold}${c.cyan}big-brain${c.reset}  ${c.dim}unified CLI${c.reset}`);
  console.log(`  ${c.dim}model: ${MODEL} | retrieval: ${RETRIEVAL_MODEL} | writer: ${WRITER_MODEL} | ctrl+c to exit${c.reset}`);
  console.log();

  let lineBuffer: string[] = [];
  let pasteTimer: ReturnType<typeof setTimeout> | null = null;
  let processing = false;

  async function handleInput(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      prompt();
      return;
    }

    processing = true;

    try {
      // 1. Retrieval — always run (reuse previous for short confirmations)
      let retrieval: RetrievalResult;

      if (isShortConfirmation(trimmed) && lastRetrieval) {
        retrieval = lastRetrieval;
        console.log(`\n  ${c.dim}using previous context${c.reset}`);
      } else {
        console.log(`\n  ${c.dim}remembering...${c.reset}`);
        const contextMessages = messages.filter(
          (m) => m.role !== "system" && m.role !== "tool"
        );
        contextMessages.push({ role: "user", content: trimmed });
        retrieval = await runRetrievalAgent(contextMessages);
        lastRetrieval = retrieval;
      }

      // 2. Build context-prefixed user message
      const contextBlock = buildContextBlock(retrieval);
      messages.push({
        role: "user",
        content: `${contextBlock}\n\nAnvändarens meddelande:\n${trimmed}`,
      });

      // 3. Main agent loop (may call ingest_to_brain)
      while (true) {
        const stream = await openai.chat.completions.create({
          model: MODEL,
          max_completion_tokens: 4096,
          tools: brainTools,
          messages,
          stream: true,
        });

        let content = "";
        const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();
        let headerPrinted = false;
        const fmt = createStreamFormatter((s) => process.stdout.write(s));

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Stream content to stdout with formatting
          if (delta.content) {
            if (!headerPrinted) {
              process.stdout.write(`\n${c.bold}${c.cyan}brain${c.reset}${c.dim} >${c.reset} `);
              headerPrinted = true;
            }
            fmt.push(delta.content);
            content += delta.content;
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCalls.get(tc.index);
              if (existing) {
                existing.args += tc.function?.arguments ?? "";
              } else {
                toolCalls.set(tc.index, {
                  id: tc.id ?? "",
                  name: tc.function?.name ?? "",
                  args: tc.function?.arguments ?? "",
                });
              }
            }
          }
        }

        fmt.flush();
        if (headerPrinted) process.stdout.write("\n\n");

        // Reconstruct assistant message for history
        const assistantMessage: OpenAI.ChatCompletionMessageParam = {
          role: "assistant",
          content: content || null,
        };
        const toolCallList = [...toolCalls.values()].filter((tc) => tc.id);
        if (toolCallList.length > 0) {
          (assistantMessage as any).tool_calls = toolCallList.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.args },
          }));
        }
        messages.push(assistantMessage);

        // If no tool calls, we're done
        if (toolCallList.length === 0) break;

        // Process tool calls
        for (const tc of toolCallList) {
          if (tc.name === "ingest_to_brain") {
            const args = JSON.parse(tc.args);
            console.log(`  ${c.dim}saving to memory...${c.reset}`);
            const writerResult = await runWriterAgent(args.information, retrieval);
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: writerResult,
            });
            console.log(`  ${c.green}saved${c.reset}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`\n${c.red}error:${c.reset} ${err.message}\n`);
    }

    processing = false;
    prompt();
  }

  function prompt() {
    process.stdout.write(`${c.bold}${c.cyan}> ${c.reset}`);
  }

  rl.on("line", (line) => {
    if (processing) return;

    lineBuffer.push(line);

    if (pasteTimer) clearTimeout(pasteTimer);
    pasteTimer = setTimeout(() => {
      const input = lineBuffer.join("\n");
      lineBuffer = [];
      pasteTimer = null;
      handleInput(input);
    }, 50);
  });

  prompt();

  rl.on("close", async () => {
    console.log(`\n${c.dim}bye!${c.reset}`);
    await end();
    process.exit(0);
  });
}

main();
