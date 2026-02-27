import OpenAI from "openai";
import readline from "readline";
import { end } from "../lib/db.js";
import { c } from "../lib/colors.js";
import { formatMarkdown } from "../lib/format.js";
import { MODEL, RETRIEVAL_MODEL, MAIN_SYSTEM, mainTools } from "../lib/prompts.js";
import { runRetrievalAgent } from "../lib/retrieval.js";
import "dotenv/config";

const openai = new OpenAI();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: MAIN_SYSTEM },
  ];

  console.log();
  console.log(`  ${c.bold}${c.cyan}big-brain${c.reset}  ${c.dim}retrieval CLI${c.reset}`);
  console.log(`  ${c.dim}model: ${MODEL} | retrieval: ${RETRIEVAL_MODEL} | ctrl+c to exit${c.reset}`);
  console.log();

  const ask = () => {
    rl.question(`${c.bold}${c.green}> ${c.reset}`, async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        ask();
        return;
      }

      messages.push({ role: "user", content: trimmed });

      try {
        const response = await openai.chat.completions.create({
          model: MODEL,
          max_completion_tokens: 4096,
          tools: mainTools,
          messages,
        });

        const choice = response.choices[0];
        const message = choice.message;

        const searchBrainCall = message.tool_calls?.find(
          (tc) => tc.function.name === "search_brain"
        );

        if (searchBrainCall) {
          console.log(`\n  ${c.dim}remembering...${c.reset}`);

          messages.push(message);

          const conversationMessages = messages.filter((m) => m.role !== "system" && m.role !== "tool");
          const retrievalResult = await runRetrievalAgent(conversationMessages);

          messages.push({
            role: "tool",
            tool_call_id: searchBrainCall.id,
            content: retrievalResult.summary,
          });

          const finalResponse = await openai.chat.completions.create({
            model: MODEL,
            max_completion_tokens: 4096,
            tools: mainTools,
            messages,
          });

          const finalMessage = finalResponse.choices[0].message;
          const finalText = finalMessage.content ?? "";

          messages.push(finalMessage);
          console.log(`\n${c.bold}${c.cyan}assistant${c.reset}${c.dim} >${c.reset} ${formatMarkdown(finalText)}\n`);
        } else {
          messages.push(message);
          console.log(`\n${c.bold}${c.cyan}assistant${c.reset}${c.dim} >${c.reset} ${formatMarkdown(message.content ?? "")}\n`);
        }
      } catch (err: any) {
        console.error(`\n${c.red}error:${c.reset} ${err.message}\n`);
      }

      ask();
    });
  };

  ask();

  rl.on("close", async () => {
    console.log(`\n${c.dim}bye!${c.reset}`);
    await end();
    process.exit(0);
  });
}

main();
