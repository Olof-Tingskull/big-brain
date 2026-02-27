CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('note', 'todo', 'email', 'ticket')),
  source text NOT NULL CHECK (source IN ('manual', 'gmail', 'github')),
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('person', 'project', 'concept', 'workflow')),
  summary text,
  summary_embedding vector(1536),
  last_consolidated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE chunk_subjects (
  chunk_id uuid REFERENCES chunks(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (chunk_id, subject_id)
);

CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX ON subjects USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 10);
