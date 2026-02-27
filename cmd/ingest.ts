import readline from "readline";
import { end } from "../lib/db.js";
import { c } from "../lib/colors.js";
import { formatMarkdown } from "../lib/format.js";
import { WRITER_MODEL, RETRIEVAL_MODEL } from "../lib/prompts.js";
import { runRetrievalAgent } from "../lib/retrieval.js";
import { runWriterAgent } from "../lib/writer.js";
import "dotenv/config";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  console.log(`  ${c.bold}${c.magenta}big-brain${c.reset}  ${c.dim}ingest CLI${c.reset}`);
  console.log(`  ${c.dim}retrieval: ${RETRIEVAL_MODEL} | writer: ${WRITER_MODEL} | ctrl+c to exit${c.reset}`);
  console.log();

  const ask = () => {
    rl.question(`${c.bold}${c.magenta}+ ${c.reset}`, async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        ask();
        return;
      }

      try {
        // STEG 1 — RESEARCH
        console.log(`\n  ${c.dim}researching...${c.reset}`);

        const fakeConversation: { role: "user"; content: string }[] = [
          {
            role: "user",
            content: `Jag har fått följande ny information: ${trimmed}. Vad vet vi redan som relaterar till det här?`,
          },
        ];

        const retrievalResult = await runRetrievalAgent(fakeConversation);

        console.log(`  ${c.dim}context ready${c.reset}\n`);

        // STEG 2 — WRITE
        console.log(`  ${c.dim}writing...${c.reset}`);

        const writerResult = await runWriterAgent(trimmed, retrievalResult);

        console.log(`\n${c.bold}${c.magenta}saved${c.reset}${c.dim} >${c.reset} ${formatMarkdown(writerResult)}\n`);
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
