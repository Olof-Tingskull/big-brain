import { db } from "./db.js";
import { chunks, subjects, chunkSubjects } from "./schema.js";
import { embed } from "./embeddings.js";
import { eq, sql } from "drizzle-orm";
import { c } from "./colors.js";

export async function create_chunk(
  content: string,
  metadata: Record<string, any>,
  subject_ids: number[]
): Promise<{ id: number }> {
  const embedding = await embed(content);
  const vec = `[${embedding.join(",")}]`;

  const [row] = await db
    .insert(chunks)
    .values({
      content,
      embedding: vec,
      metadata,
    })
    .returning({ id: chunks.id });

  for (const subjectId of subject_ids) {
    await db
      .insert(chunkSubjects)
      .values({ chunkId: row.id, subjectId })
      .onConflictDoNothing();
  }

  console.log(`  ${c.green}[CREATE chunk ${row.id}]${c.reset} ${c.dim}${content.slice(0, 80)}${content.length > 80 ? "..." : ""}${c.reset}`);
  return { id: row.id };
}

export async function update_chunk(
  chunk_id: number,
  content: string
): Promise<{ id: number }> {
  const embedding = await embed(content);
  const vec = `[${embedding.join(",")}]`;

  await db
    .update(chunks)
    .set({
      content,
      embedding: vec,
      updatedAt: sql`now()`,
    })
    .where(eq(chunks.id, chunk_id));

  console.log(`  ${c.yellow}[UPDATE chunk ${chunk_id}]${c.reset} ${c.dim}${content.slice(0, 60)}${content.length > 60 ? "..." : ""}${c.reset}`);
  return { id: chunk_id };
}

export async function delete_chunk(
  chunk_id: number
): Promise<{ deleted: boolean }> {
  await db.delete(chunkSubjects).where(eq(chunkSubjects.chunkId, chunk_id));
  await db.delete(chunks).where(eq(chunks.id, chunk_id));

  console.log(`  ${c.red}[DELETE chunk ${chunk_id}]${c.reset}`);
  return { deleted: true };
}

export async function create_subject(
  name: string,
  type: string,
  initial_summary: string
): Promise<{ id: number }> {
  const embedding = await embed(initial_summary);
  const vec = `[${embedding.join(",")}]`;

  const [row] = await db
    .insert(subjects)
    .values({
      name,
      type,
      summary: initial_summary,
      summaryEmbedding: vec,
    })
    .returning({ id: subjects.id });

  console.log(`  ${c.cyan}[CREATE subject ${row.id}]${c.reset} ${c.dim}${name} (${type})${c.reset}`);
  return { id: row.id };
}

export async function update_subject_summary(
  subject_id: number,
  new_summary: string
): Promise<{ id: number }> {
  const embedding = await embed(new_summary);
  const vec = `[${embedding.join(",")}]`;

  await db
    .update(subjects)
    .set({
      summary: new_summary,
      summaryEmbedding: vec,
    })
    .where(eq(subjects.id, subject_id));

  console.log(`  ${c.yellow}[UPDATE subject ${subject_id}]${c.reset} ${c.dim}${new_summary.slice(0, 60)}${new_summary.length > 60 ? "..." : ""}${c.reset}`);
  return { id: subject_id };
}

export async function link_chunk_subject(
  chunk_id: number,
  subject_id: number
): Promise<{ linked: boolean }> {
  await db
    .insert(chunkSubjects)
    .values({ chunkId: chunk_id, subjectId: subject_id })
    .onConflictDoNothing();

  console.log(`  ${c.magenta}[LINK]${c.reset} ${c.dim}chunk ${chunk_id} ↔ subject ${subject_id}${c.reset}`);
  return { linked: true };
}

export async function list_subject_chunks(
  subject_id: number
): Promise<{ id: number; content: string; created_at: Date | null }[]> {
  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      createdAt: chunks.createdAt,
    })
    .from(chunks)
    .innerJoin(chunkSubjects, eq(chunkSubjects.chunkId, chunks.id))
    .where(eq(chunkSubjects.subjectId, subject_id))
    .orderBy(sql`${chunks.createdAt} DESC`);

  console.log(`  ${c.dim}[LIST chunks]${c.reset} ${c.dim}subject ${subject_id} → ${rows.length} chunks${c.reset}`);
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.createdAt,
  }));
}
