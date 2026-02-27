import {
  pgTable,
  serial,
  text,
  jsonb,
  timestamp,
  primaryKey,
  index,
  integer,
  unique,
  customType,
} from "drizzle-orm/pg-core";

// Custom pgvector type
const vector = customType<{
  data: string;
  config: { dimensions: number };
  driverData: string;
}>({
  dataType(config) {
    return `vector(${config!.dimensions})`;
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value) {
    return value;
  },
});

export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("chunks_embedding_idx")
      .using("ivfflat", table.embedding.asc().nullsLast())
      .with({ lists: 10 }),
  ]
);

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    summary: text("summary"),
    summaryEmbedding: vector("summary_embedding", { dimensions: 1536 }),
    lastConsolidatedAt: timestamp("last_consolidated_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("subjects_name_unique").on(table.name),
    index("subjects_summary_embedding_idx")
      .using("ivfflat", table.summaryEmbedding.asc().nullsLast())
      .with({ lists: 10 }),
  ]
);

export const chunkSubjects = pgTable(
  "chunk_subjects",
  {
    chunkId: integer("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.chunkId, table.subjectId] })]
);
