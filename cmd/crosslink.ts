import readline from "readline";
import OpenAI from "openai";
import { db, end } from "../lib/db.js";
import { chunks, subjects, chunkSubjects } from "../lib/schema.js";
import { sql } from "drizzle-orm";
import { link_chunk_subject } from "../lib/write-tools.js";
import { c } from "../lib/colors.js";
import "dotenv/config";

const openai = new OpenAI();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function parseVector(vec: string): number[] {
  return vec.slice(1, -1).split(",").map(Number);
}

const SIMILARITY_THRESHOLD = 0.50;

type Candidate = {
  chunkId: number;
  subjectId: number;
  subjectName: string;
  similarity: number;
  chunkContent: string;
};

async function verifyWithLLM(
  subjectName: string,
  subjectSummary: string,
  candidates: Candidate[]
): Promise<Candidate[]> {
  const chunkList = candidates
    .map((c, i) => `[${i + 1}] chunk ${c.chunkId} (sim=${c.similarity.toFixed(3)}): ${c.chunkContent.slice(0, 200)}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    max_completion_tokens: 256,
    messages: [
      {
        role: "system",
        content: `Du bedömer om chunks bör kopplas till ett subject i ett minnessystem. Svara BARA med de nummer (kommaseparerat) som verkligen handlar om eller är direkt relevanta för subjectet. Om ingen passar, svara "ingen". Var strikt — en chunk som bara nämner subjectet i förbigående ska INTE kopplas.`,
      },
      {
        role: "user",
        content: `Subject: ${subjectName}\nSummary: ${subjectSummary}\n\nKandidater:\n${chunkList}\n\nVilka nummer ska kopplas?`,
      },
    ],
  });

  const answer = response.choices[0].message.content ?? "";
  if (answer.toLowerCase().includes("ingen")) return [];

  const nums = answer
    .match(/\d+/g)
    ?.map(Number)
    .filter((n) => n >= 1 && n <= candidates.length) ?? [];

  return nums.map((n) => candidates[n - 1]);
}

async function main() {
  console.log();
  console.log(`  ${c.bold}${c.cyan}big-brain cross-linking${c.reset}`);
  console.log(`  ${c.dim}Embedding-kandidater + LLM-verifiering${c.reset}`);
  console.log(`  ${c.dim}Threshold: cosine similarity > ${SIMILARITY_THRESHOLD}${c.reset}`);
  console.log();

  // 1. Fetch all data
  console.log(`  ${c.dim}Hämtar data...${c.reset}`);
  const allChunks = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      embedding: chunks.embedding,
    })
    .from(chunks)
    .where(sql`${chunks.embedding} IS NOT NULL`);

  const allSubjects = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      summary: subjects.summary,
      summaryEmbedding: subjects.summaryEmbedding,
    })
    .from(subjects)
    .where(sql`${subjects.summaryEmbedding} IS NOT NULL`);

  const existingLinks = await db
    .select({
      chunkId: chunkSubjects.chunkId,
      subjectId: chunkSubjects.subjectId,
    })
    .from(chunkSubjects);

  const linkSet = new Set(existingLinks.map((l) => `${l.chunkId}:${l.subjectId}`));

  console.log(`  ${c.dim}${allChunks.length} chunks, ${allSubjects.length} subjects, ${existingLinks.length} befintliga kopplingar${c.reset}`);
  console.log();

  // 2. Find embedding candidates
  console.log(`  ${c.dim}Beräknar embedding-kandidater...${c.reset}`);
  const candidates: Candidate[] = [];

  for (const chunk of allChunks) {
    if (!chunk.embedding) continue;
    const chunkVec = parseVector(chunk.embedding);

    for (const subject of allSubjects) {
      if (!subject.summaryEmbedding) continue;
      if (linkSet.has(`${chunk.id}:${subject.id}`)) continue;

      const subjectVec = parseVector(subject.summaryEmbedding);
      const sim = cosineSimilarity(chunkVec, subjectVec);

      if (sim > SIMILARITY_THRESHOLD) {
        candidates.push({
          chunkId: chunk.id,
          subjectId: subject.id,
          subjectName: subject.name,
          similarity: sim,
          chunkContent: chunk.content,
        });
      }
    }
  }

  if (candidates.length === 0) {
    console.log(`  ${c.green}Inga kandidater hittade.${c.reset}`);
    rl.close();
    await end();
    return;
  }

  console.log(`  ${c.dim}${candidates.length} embedding-kandidater (pre-LLM)${c.reset}`);
  console.log();

  // 3. Group by subject and verify with LLM
  const bySubject = new Map<number, Candidate[]>();
  for (const cand of candidates) {
    const list = bySubject.get(cand.subjectId) ?? [];
    list.push(cand);
    bySubject.set(cand.subjectId, list);
  }

  const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));

  const verified: Candidate[] = [];

  console.log(`  ${c.yellow}LLM-verifiering per subject (${bySubject.size} subjects)...${c.reset}`);
  console.log();

  for (const [subjectId, subjectCandidates] of bySubject) {
    const subject = subjectMap.get(subjectId)!;
    process.stdout.write(`  ${c.dim}${subject.name}:${c.reset} ${subjectCandidates.length} kandidater → `);

    const approved = await verifyWithLLM(
      subject.name,
      subject.summary ?? "",
      subjectCandidates
    );

    if (approved.length > 0) {
      console.log(`${c.green}${approved.length} godkända${c.reset}`);
      for (const a of approved) {
        console.log(`    ${c.dim}chunk ${a.chunkId}${c.reset} ${c.gray}${a.chunkContent.replace(/\n/g, " ").slice(0, 60)}...${c.reset}`);
      }
    } else {
      console.log(`${c.dim}0 godkända${c.reset}`);
    }

    verified.push(...approved);
  }

  console.log();

  if (verified.length === 0) {
    console.log(`  ${c.green}LLM godkände inga nya kopplingar.${c.reset}`);
    rl.close();
    await end();
    return;
  }

  // 4. Show verified and ask
  console.log(`  ${c.bold}${verified.length} LLM-godkända kopplingar:${c.reset}`);
  console.log();

  for (let i = 0; i < verified.length; i++) {
    const v = verified[i];
    console.log(
      `  ${c.dim}${(i + 1).toString().padStart(3)}.${c.reset} ` +
      `${c.green}${v.similarity.toFixed(3)}${c.reset}  ` +
      `chunk ${v.chunkId} → ${c.cyan}${v.subjectName}${c.reset}`
    );
    console.log(`       ${c.gray}${v.chunkContent.replace(/\n/g, " ").slice(0, 70)}...${c.reset}`);
  }
  console.log();

  const answer = await ask(`  ${c.bold}Applicera alla? (y/n/nummer för att välja)${c.reset} `);
  const trimmed = answer.trim().toLowerCase();

  if (trimmed === "y" || trimmed === "ja") {
    console.log();
    for (const v of verified) {
      await link_chunk_subject(v.chunkId, v.subjectId);
    }
    console.log();
    console.log(`  ${c.green}${c.bold}${verified.length} kopplingar applicerade!${c.reset}`);
  } else if (trimmed === "n" || trimmed === "nej") {
    console.log(`  ${c.dim}Inga kopplingar applicerade.${c.reset}`);
  } else {
    const nums = trimmed
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= verified.length);

    if (nums.length === 0) {
      console.log(`  ${c.dim}Inga giltiga nummer. Avbryter.${c.reset}`);
    } else {
      console.log();
      for (const num of nums) {
        await link_chunk_subject(verified[num - 1].chunkId, verified[num - 1].subjectId);
      }
      console.log();
      console.log(`  ${c.green}${c.bold}${nums.length} kopplingar applicerade!${c.reset}`);
    }
  }

  rl.close();
  await end();
}

main().catch(async (err) => {
  console.error(`${c.red}Error:${c.reset}`, err);
  rl.close();
  await end();
  process.exit(1);
});
