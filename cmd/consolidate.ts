import readline from "readline";
import { db, end } from "../lib/db.js";
import { chunks, subjects, chunkSubjects } from "../lib/schema.js";
import { eq, sql } from "drizzle-orm";
import { runConsolidatorAgent } from "../lib/consolidator.js";
import { c } from "../lib/colors.js";
import "dotenv/config";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function getSubjectsSorted() {
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      type: subjects.type,
      summary: subjects.summary,
      chunkCount: sql<number>`count(${chunkSubjects.chunkId})`.as("chunk_count"),
    })
    .from(subjects)
    .leftJoin(chunkSubjects, eq(chunkSubjects.subjectId, subjects.id))
    .groupBy(subjects.id, subjects.name, subjects.type, subjects.summary)
    .orderBy(sql`count(${chunkSubjects.chunkId}) DESC`);

  return rows;
}

async function getSubjectChunks(subjectId: number) {
  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      metadata: chunks.metadata,
      createdAt: chunks.createdAt,
    })
    .from(chunks)
    .innerJoin(chunkSubjects, eq(chunkSubjects.chunkId, chunks.id))
    .where(eq(chunkSubjects.subjectId, subjectId))
    .orderBy(sql`${chunks.createdAt} DESC`);

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    metadata: r.metadata,
    created_at: r.createdAt,
  }));
}

async function main() {
  console.log();
  console.log(`  ${c.bold}${c.cyan}big-brain consolidation${c.reset}`);
  console.log(`  ${c.dim}Per-subject genomgång — sorterat på chunk-antal${c.reset}`);
  console.log();

  const allSubjects = await getSubjectsSorted();

  console.log(`  ${c.dim}Hittade ${allSubjects.length} subjects:${c.reset}`);
  for (const s of allSubjects) {
    console.log(`    ${c.dim}${s.chunkCount} chunks${c.reset}  ${s.name} ${c.gray}(${s.type})${c.reset}`);
  }
  console.log();

  for (let i = 0; i < allSubjects.length; i++) {
    const subject = allSubjects[i];

    if (subject.chunkCount === 0) {
      console.log(`  ${c.dim}Hoppar över ${subject.name} (0 chunks)${c.reset}`);
      continue;
    }

    console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`  ${c.bold}[${i + 1}/${allSubjects.length}] ${subject.name}${c.reset} ${c.gray}(${subject.type})${c.reset}`);
    console.log(`  ${c.dim}${subject.chunkCount} chunks | summary: ${(subject.summary ?? "(ingen)").slice(0, 60)}...${c.reset}`);
    console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log();

    const subjectChunks = await getSubjectChunks(subject.id);

    if (subjectChunks.length > 30) {
      console.log(`  ${c.yellow}Varning: ${subjectChunks.length} chunks är väldigt många.${c.reset}`);
      console.log(`  ${c.dim}Kör crosslink EFTER consolidate, inte före.${c.reset}`);
      const skip = await ask(`  ${c.bold}Skippa detta subject? (y/n)${c.reset} `);
      if (skip.trim().toLowerCase() === "y" || skip.trim().toLowerCase() === "ja") {
        console.log();
        continue;
      }
    }

    // Show chunks before consolidation
    for (const ch of subjectChunks) {
      const lines = ch.content.split("\n");
      const preview = lines[0].slice(0, 80);
      console.log(`  ${c.dim}[chunk ${ch.id}]${c.reset} ${c.gray}(${ch.content.length} tecken)${c.reset} ${preview}${ch.content.length > 80 ? "..." : ""}`);
    }
    console.log();

    // Run consolidation agent
    console.log(`  ${c.yellow}Kör consolidation-agent...${c.reset}`);
    console.log();

    const result = await runConsolidatorAgent(
      {
        id: subject.id,
        name: subject.name,
        type: subject.type,
        summary: subject.summary,
      },
      subjectChunks
    );

    console.log();
    console.log(`  ${c.green}Resultat:${c.reset} ${result}`);
    console.log();

    // Ask to continue
    if (i < allSubjects.length - 1) {
      const answer = await ask(`  ${c.bold}Fortsätt till nästa subject? (y/n)${c.reset} `);
      if (answer.trim().toLowerCase() !== "y" && answer.trim().toLowerCase() !== "ja") {
        console.log(`\n  ${c.dim}Avbryter. Kör igen för att fortsätta.${c.reset}`);
        break;
      }
      console.log();
    }
  }

  console.log(`\n  ${c.green}${c.bold}Consolidation klar!${c.reset}`);
  rl.close();
  await end();
}

main().catch(async (err) => {
  console.error(`${c.red}Error:${c.reset}`, err);
  rl.close();
  await end();
  process.exit(1);
});
