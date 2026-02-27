import { query } from "./db.js";
import { embed } from "./embeddings.js";

export async function search_subjects(queryText: string) {
  const embedding = await embed(queryText);
  const vec = `[${embedding.join(",")}]`;

  const rows = await query(
    `SELECT id, name, type, summary,
            1 - (summary_embedding <=> $1::vector) AS similarity
     FROM subjects
     WHERE summary_embedding IS NOT NULL
     ORDER BY summary_embedding <=> $1::vector
     LIMIT 5`,
    [vec]
  );

  // Also do fuzzy match on name
  const fuzzy = await query(
    `SELECT id, name, type, summary
     FROM subjects
     WHERE name ILIKE $1
     LIMIT 5`,
    [`%${queryText}%`]
  );

  // Merge, deduplicate by id
  const seen = new Set(rows.map((r) => r.id));
  for (const f of fuzzy) {
    if (!seen.has(f.id)) {
      rows.push({ ...f, similarity: null });
      seen.add(f.id);
    }
  }

  return rows.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    summary: r.summary,
    similarity: r.similarity,
  }));
}

export async function get_subject_chunks(
  subject_id: string,
  type?: string
) {
  const params: any[] = [subject_id];
  let typeClause = "";
  if (type) {
    typeClause = "AND c.type = $2";
    params.push(type);
  }

  const rows = await query(
    `SELECT c.id, c.content, c.type, c.source, c.metadata, c.created_at
     FROM chunks c
     JOIN chunk_subjects cs ON cs.chunk_id = c.id
     WHERE cs.subject_id = $1 ${typeClause}
     ORDER BY c.created_at DESC`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    type: r.type,
    source: r.source,
    metadata: r.metadata,
    created_at: r.created_at,
  }));
}

export async function search_chunks(queryText: string) {
  const embedding = await embed(queryText);
  const vec = `[${embedding.join(",")}]`;

  const rows = await query(
    `SELECT c.id, c.content, c.type, c.source, c.metadata, c.created_at,
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     WHERE c.embedding IS NOT NULL
     ORDER BY c.embedding <=> $1::vector
     LIMIT 10`,
    [vec]
  );

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    type: r.type,
    source: r.source,
    metadata: r.metadata,
    created_at: r.created_at,
    similarity: r.similarity,
  }));
}
