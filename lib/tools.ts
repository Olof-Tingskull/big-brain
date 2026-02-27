import { db } from "./db.js";
import { chunks, subjects, chunkSubjects } from "./schema.js";
import { embed } from "./embeddings.js";
import { sql, eq, ilike, and } from "drizzle-orm";

export async function search_subjects(queryText: string) {
  const embedding = await embed(queryText);
  const vec = `[${embedding.join(",")}]`;

  const vectorRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      type: subjects.type,
      summary: subjects.summary,
      similarity: sql<number>`1 - (${subjects.summaryEmbedding} <=> ${vec}::vector)`.as(
        "similarity"
      ),
    })
    .from(subjects)
    .where(sql`${subjects.summaryEmbedding} IS NOT NULL`)
    .orderBy(sql`${subjects.summaryEmbedding} <=> ${vec}::vector`)
    .limit(5);

  const fuzzyRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      type: subjects.type,
      summary: subjects.summary,
    })
    .from(subjects)
    .where(ilike(subjects.name, `%${queryText}%`))
    .limit(5);

  // Merge, deduplicate by id
  const seen = new Set(vectorRows.map((r) => r.id));
  const merged: {
    id: number;
    name: string;
    type: string;
    summary: string | null;
    similarity: number | null;
  }[] = [...vectorRows];

  for (const f of fuzzyRows) {
    if (!seen.has(f.id)) {
      merged.push({ ...f, similarity: null });
      seen.add(f.id);
    }
  }

  return merged.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    summary: r.summary,
    similarity: r.similarity,
  }));
}

export async function get_subject_chunks(
  subject_id: number,
  limit?: number
) {
  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      metadata: chunks.metadata,
      createdAt: chunks.createdAt,
    })
    .from(chunks)
    .innerJoin(chunkSubjects, eq(chunkSubjects.chunkId, chunks.id))
    .where(eq(chunkSubjects.subjectId, subject_id))
    .orderBy(sql`${chunks.createdAt} DESC`)
    .limit(limit ?? 50);

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    metadata: r.metadata,
    created_at: r.createdAt,
  }));
}

export async function search_chunks(queryText: string) {
  const embedding = await embed(queryText);
  const vec = `[${embedding.join(",")}]`;

  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      metadata: chunks.metadata,
      createdAt: chunks.createdAt,
      similarity: sql<number>`1 - (${chunks.embedding} <=> ${vec}::vector)`.as(
        "similarity"
      ),
    })
    .from(chunks)
    .where(sql`${chunks.embedding} IS NOT NULL`)
    .orderBy(sql`${chunks.embedding} <=> ${vec}::vector`)
    .limit(10);

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    metadata: r.metadata,
    created_at: r.createdAt,
    similarity: r.similarity,
  }));
}

export async function get_chunk_subjects(chunk_id: number) {
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      type: subjects.type,
      summary: subjects.summary,
    })
    .from(subjects)
    .innerJoin(chunkSubjects, eq(chunkSubjects.subjectId, subjects.id))
    .where(eq(chunkSubjects.chunkId, chunk_id));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    summary: r.summary,
  }));
}
