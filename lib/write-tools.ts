import { query, queryOne } from "./db.js";
import { embed } from "./embeddings.js";
import { c } from "./colors.js";

export async function create_chunk(
  content: string,
  type: string,
  metadata: Record<string, any>,
  subject_ids: string[]
): Promise<{ id: string }> {
  const embedding = await embed(content);
  const vec = `[${embedding.join(",")}]`;

  const row = await queryOne<{ id: string }>(
    `INSERT INTO chunks (content, type, source, embedding, metadata)
     VALUES ($1, $2, 'manual', $3::vector, $4)
     RETURNING id`,
    [content, type, vec, JSON.stringify(metadata)]
  );

  const chunkId = row!.id;

  for (const subjectId of subject_ids) {
    await query(
      `INSERT INTO chunk_subjects (chunk_id, subject_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [chunkId, subjectId]
    );
  }

  console.log(`  ${c.green}[CREATE chunk]${c.reset} ${c.dim}${content.slice(0, 80)}${content.length > 80 ? "..." : ""}${c.reset}`);
  return { id: chunkId };
}

export async function update_chunk(
  chunk_id: string,
  content: string
): Promise<{ id: string }> {
  const embedding = await embed(content);
  const vec = `[${embedding.join(",")}]`;

  await query(
    `UPDATE chunks SET content = $1, embedding = $2::vector, updated_at = now()
     WHERE id = $3`,
    [content, vec, chunk_id]
  );

  console.log(`  ${c.yellow}[UPDATE chunk]${c.reset} ${c.dim}${chunk_id.slice(0, 8)}… → ${content.slice(0, 60)}${content.length > 60 ? "..." : ""}${c.reset}`);
  return { id: chunk_id };
}

export async function delete_chunk(
  chunk_id: string
): Promise<{ deleted: boolean }> {
  await query(`DELETE FROM chunk_subjects WHERE chunk_id = $1`, [chunk_id]);
  await query(`DELETE FROM chunks WHERE id = $1`, [chunk_id]);

  console.log(`  ${c.red}[DELETE chunk]${c.reset} ${c.dim}${chunk_id}${c.reset}`);
  return { deleted: true };
}

export async function create_subject(
  name: string,
  type: string,
  initial_summary: string
): Promise<{ id: string }> {
  const embedding = await embed(initial_summary);
  const vec = `[${embedding.join(",")}]`;

  const row = await queryOne<{ id: string }>(
    `INSERT INTO subjects (name, type, summary, summary_embedding)
     VALUES ($1, $2, $3, $4::vector)
     RETURNING id`,
    [name, type, initial_summary, vec]
  );

  console.log(`  ${c.cyan}[CREATE subject]${c.reset} ${c.dim}${name} (${type})${c.reset}`);
  return { id: row!.id };
}

export async function update_subject_summary(
  subject_id: string,
  new_summary: string
): Promise<{ id: string }> {
  const embedding = await embed(new_summary);
  const vec = `[${embedding.join(",")}]`;

  await query(
    `UPDATE subjects SET summary = $1, summary_embedding = $2::vector
     WHERE id = $3`,
    [new_summary, vec, subject_id]
  );

  console.log(`  ${c.yellow}[UPDATE subject]${c.reset} ${c.dim}${subject_id.slice(0, 8)}… → ${new_summary.slice(0, 60)}${new_summary.length > 60 ? "..." : ""}${c.reset}`);
  return { id: subject_id };
}

export async function link_chunk_subject(
  chunk_id: string,
  subject_id: string
): Promise<{ linked: boolean }> {
  await query(
    `INSERT INTO chunk_subjects (chunk_id, subject_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [chunk_id, subject_id]
  );

  console.log(`  ${c.magenta}[LINK]${c.reset} ${c.dim}chunk ${chunk_id.slice(0, 8)}… ↔ subject ${subject_id.slice(0, 8)}…${c.reset}`);
  return { linked: true };
}

export async function list_subject_chunks(
  subject_id: string
): Promise<{ id: string; content: string; type: string; created_at: string }[]> {
  const rows = await query(
    `SELECT c.id, c.content, c.type, c.created_at
     FROM chunks c
     JOIN chunk_subjects cs ON cs.chunk_id = c.id
     WHERE cs.subject_id = $1
     ORDER BY c.created_at DESC`,
    [subject_id]
  );

  console.log(`  ${c.dim}[LIST chunks]${c.reset} ${c.dim}subject ${subject_id.slice(0, 8)}… → ${rows.length} chunks${c.reset}`);
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    type: r.type,
    created_at: r.created_at,
  }));
}
