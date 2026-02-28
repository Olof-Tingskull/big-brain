# big-brain

A "second brain" personal memory system. Scripts + Postgres, no frameworks. Stores knowledge as vector-embedded chunks linked to subjects (people, projects, concepts, workflows). Uses a three-agent LLM architecture: a conversational agent delegates search to a retrieval agent and writing to a writer agent, both of which autonomously query and mutate the database.

## Prerequisites

- Docker (for Postgres)
- Node.js 18+
- An OpenAI API key (for embeddings + chat)

## Quick start

```bash
cd big-brain

# 1. Set your API keys
# Edit .env directly:
#   OPENAI_API_KEY=sk-...
#   DATABASE_URL=postgresql://bigbrain:bigbrain@localhost:5432/bigbrain

# 2. Install dependencies
npm install

# 3. Start Postgres (pgvector)
docker compose up -d

# 4. Run migrations
npm run db:migrate

# 5. Seed the database with mock data
npm run seed

# 6. Start the interactive CLI
npm run brain
```

To reset the database completely:

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run seed
```

## npm scripts

| Script              | Description                                    |
|---------------------|------------------------------------------------|
| `npm run brain`     | Interactive CLI — ask questions + store info    |
| `npm run seed`      | Populate database with mock data + embeddings  |
| `npm run clear`     | Delete all data from the database              |
| `npm run graph`     | Start knowledge graph visualization on :4444   |
| `npm run studio`    | Open Drizzle ORM studio                        |
| `npm run db:generate` | Generate migration files from schema changes |
| `npm run db:migrate`  | Apply pending migrations                     |

## File structure

```
big-brain/
├── docker-compose.yml          # pgvector/pgvector:pg16, port 5432
├── drizzle.config.ts           # Drizzle ORM configuration
├── package.json
├── tsconfig.json
├── .env                        # API keys + DATABASE_URL
│
├── cmd/
│   ├── brain.ts                # Interactive CLI (read + write)
│   ├── seed.ts                 # Populates DB with mock data + real embeddings
│   ├── clear.ts                # Wipes all data
│   └── graph.ts                # Knowledge graph visualization server
│
├── lib/
│   ├── db.ts                   # pg Pool + drizzle-orm wrapper
│   ├── schema.ts               # Drizzle table definitions (chunks, subjects, chunk_subjects)
│   ├── embeddings.ts           # embed(text), embedBatch(texts) via OpenAI
│   ├── prompts.ts              # System prompts + tool schemas for all three agents
│   ├── tools.ts                # Read-only DB queries (retrieval agent tools)
│   ├── write-tools.ts          # DB mutations (writer agent tools)
│   ├── retrieval.ts            # Retrieval agent loop
│   ├── writer.ts               # Writer agent loop
│   ├── colors.ts               # ANSI terminal colors
│   └── format.ts               # Markdown formatting for CLI output
│
└── drizzle/                    # Generated migration SQL files
```

## Database schema

Three tables using serial integer IDs and pgvector (1536-dim embeddings). Schema is defined in `lib/schema.ts` and managed with Drizzle ORM migrations.

**chunks** — individual pieces of information
| Column     | Type             | Notes                                      |
|------------|------------------|--------------------------------------------|
| id         | serial (PK)      | Auto-incrementing integer                  |
| content    | text             | The actual text                            |
| embedding  | vector(1536)     | OpenAI text-embedding-3-small              |
| metadata   | jsonb            | Freeform (emotional, date, tags, etc.)     |
| created_at | timestamptz      |                                            |
| updated_at | timestamptz      |                                            |

**subjects** — entities that chunks relate to
| Column              | Type          | Notes                                    |
|---------------------|---------------|------------------------------------------|
| id                  | serial (PK)   | Auto-incrementing integer                |
| name                | text (unique) | e.g. "Ella", "Dimljus", "Uppbrottet"    |
| type                | text          | `person`, `project`, `concept`, `workflow` |
| summary             | text          | Human-readable summary of the subject    |
| summary_embedding   | vector(1536)  | Embedding of "{name}: {summary}"         |
| last_consolidated_at| timestamptz   | For future consolidation feature         |
| created_at          | timestamptz   |                                          |

**chunk_subjects** — many-to-many join table
| Column     | Type    | Notes                         |
|------------|---------|-------------------------------|
| chunk_id   | integer | FK → chunks, cascade delete   |
| subject_id | integer | FK → subjects, cascade delete |

Both `chunks.embedding` and `subjects.summary_embedding` have IVFFlat indexes for fast cosine similarity search.

## Lib modules

### lib/db.ts

Drizzle ORM wrapper around `pg.Pool`. Reads `DATABASE_URL` from `.env`.

- `query<T>(sql, params?)` — returns `T[]` (all rows)
- `queryOne<T>(sql, params?)` — returns first row or `undefined`
- `end()` — closes the pool

### lib/schema.ts

Drizzle table definitions with a custom `vector` column type. Defines `chunks`, `subjects`, and `chunkSubjects` tables with their indexes and relations.

### lib/embeddings.ts

Uses OpenAI `text-embedding-3-small` (1536 dimensions).

- `embed(text)` — returns `number[]` (single embedding)
- `embedBatch(texts)` — returns `number[][]` (one embedding per input)

### lib/prompts.ts

Defines system prompts (in Swedish), tool schemas (OpenAI function calling format), and model constants for all three agents.

### lib/tools.ts

Read-only database queries used by the retrieval agent:

- **`search_subjects(query)`** — Embeds the query, does cosine similarity search against `subjects.summary_embedding` (top 5). Also does ILIKE fuzzy match on `subjects.name`. Results are merged and deduplicated.
- **`get_subject_chunks(subject_id, limit?)`** — Gets all chunks linked to a subject via `chunk_subjects`. Sorted by `created_at DESC`.
- **`search_chunks(query)`** — Embeds the query, does cosine similarity search directly against `chunks.embedding`. Returns top 10.
- **`get_chunk_subjects(chunk_id)`** — Gets all subjects linked to a given chunk.

### lib/write-tools.ts

Database mutations used by the writer agent:

- **`create_chunk(content, metadata, subject_ids)`** — Creates a chunk with an auto-generated embedding and links it to subjects.
- **`update_chunk(chunk_id, content)`** — Updates chunk content and regenerates its embedding.
- **`delete_chunk(chunk_id)`** — Deletes a chunk and its subject links.
- **`create_subject(name, type, initial_summary)`** — Creates a subject with a summary embedding. Enforces unique names.
- **`update_subject_summary(subject_id, new_summary)`** — Updates a subject's summary and regenerates its embedding.
- **`link_chunk_subject(chunk_id, subject_id)`** — Links a chunk to a subject (idempotent).
- **`list_subject_chunks(subject_id)`** — Lists all chunks for a subject.

### lib/retrieval.ts

Autonomous retrieval agent loop. Takes conversation context, forks a new LLM conversation with a retrieval-focused system prompt, and executes tool calls against the database in a loop (max 20 calls). Returns a structured result with collected subjects and chunks.

### lib/writer.ts

Writer agent loop. Receives user input and retrieval context (subjects + chunks with IDs), then autonomously creates, updates, deletes, and links chunks and subjects (max 15 tool calls).

## How brain.ts works

The main CLI uses a **three-agent architecture**:

```
You type a question or new information
        │
        ▼
┌──────────────────────────────────────────────┐
│  Retrieval Agent (autonomous)                │
│  Tools: search_subjects, get_subject_chunks, │
│         search_chunks, get_chunk_subjects    │
│  Loops up to 20 tool calls against DB        │
│  Returns: summary + collected subjects/chunks│
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Main Agent (GPT-5.2, streaming)             │
│  Tool: ingest_to_brain(information)          │
│                                              │
│  Receives retrieval context, decides:        │
│  • Answer directly (question) → stream text  │
│  • Store info → call ingest_to_brain         │
│                                              │
│  IF ingest_to_brain is called:               │
│  ┌────────────────────────────────────────┐  │
│  │ Writer Agent (autonomous)              │  │
│  │ Tools: create_chunk, update_chunk,     │  │
│  │   delete_chunk, create_subject,        │  │
│  │   update_subject_summary,              │  │
│  │   link_chunk_subject, list_subject_chunks│ │
│  │ Loops up to 15 tool calls              │  │
│  │ Returns: confirmation text             │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
        │
        ▼
   Answer printed to terminal
```

### Step by step

1. You type at the `> ` prompt (questions or new information)
2. The **retrieval agent** autonomously searches the database — vector search on subjects and chunks, fetching linked data — up to 20 tool calls
3. The retrieval results are injected as context into the **main agent**'s conversation
4. The main agent (GPT-5.2, streaming) decides:
   - If the input is a **question**: it answers based on the retrieved context
   - If the input is **new information**: it calls `ingest_to_brain`, which triggers the **writer agent** to autonomously create/update chunks and subjects in the database
5. Conversation history is preserved across turns

### What you see in the terminal

```
> Vad jobbar Ella med?
  1/20  search_subjects("Ella")
        1 result
        · Ella
  2/20  get_subject_chunks(3)
        4 results

brain > Ella jobbar på ett kafé och drömmer om att...

> Ella har börjat söka nytt jobb
  1/20  search_subjects("Ella jobb")
        ...

brain > Noterat! Jag har sparat att Ella har börjat söka nytt jobb.
  [writer] create_chunk(...)
  [writer] link_chunk_subject(...)
```

## Graph visualization

Run `npm run graph` to start an interactive knowledge graph on `http://localhost:4444`. Built with Cytoscape.js.

- **Purple nodes** — subjects (people, projects, concepts)
- **Cyan nodes** — chunks (information pieces)
- **Edges** — links between chunks and subjects
- Click any node to see its details in the info panel

## Seed data

`cmd/seed.ts` populates the database with mock data centered around a friend group in Göteborg. It generates real embeddings via OpenAI for all content.

- **21 subjects** — 10 people, 5 projects, 6 concepts, 3 workflows
- **49 chunks** — meeting notes, todos, secrets, drama spanning ~120 days

Running `npm run seed` clears all existing data before inserting. It makes 2 OpenAI API calls (one batch for subject embeddings, one for chunk embeddings).

## Environment variables

| Variable           | Required | Description                              |
|--------------------|----------|------------------------------------------|
| `OPENAI_API_KEY`   | Yes      | OpenAI API key (embeddings + chat)       |
| `DATABASE_URL`     | Yes      | Postgres connection string               |

The default `DATABASE_URL` matching docker-compose is:
```
postgresql://bigbrain:bigbrain@localhost:5432/bigbrain
```

## Models used

- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **All agents:** OpenAI `gpt-5.2`

Model constants are defined in `lib/prompts.ts`.
