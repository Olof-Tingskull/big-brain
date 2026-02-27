# big-brain

A "second brain" prototype. Scripts + Postgres, no frameworks. Stores notes, todos, meeting notes and tickets as vector-embedded chunks, linked to subjects (people, projects, concepts, workflows). Retrieval is done by a two-agent Claude system: a conversational agent that delegates search to a retrieval agent that autonomously queries the database.

## Prerequisites

- Docker (for Postgres)
- Node.js 18+
- An OpenAI API key (for embeddings + chat)

## Quick start

```bash
cd big-brain

# 1. Set your API keys
cp .env .env.local   # or just edit .env directly
# Fill in:
#   OPENAI_API_KEY=sk-...
#   DATABASE_URL=postgresql://bigbrain:bigbrain@localhost:5432/bigbrain

# 2. Install dependencies
npm install

# 3. Start Postgres (pgvector)
docker compose up -d

# 4. Wait a few seconds for Postgres to initialize, then seed
npx tsx seed.ts

# 5. Start the interactive retrieval CLI
npx tsx retrieve.ts
```

To reset the database completely (drops volume, re-runs schema.sql on next start):

```bash
docker compose down -v
docker compose up -d
# wait a few seconds
npx tsx seed.ts
```

## File structure

```
big-brain/
├── docker-compose.yml          # pgvector/pgvector:pg16, port 5432
├── schema.sql                  # Mounted as init script, creates tables + indexes
├── package.json                # pg, openai, dotenv, tsx
├── tsconfig.json
├── .env                        # API keys + DATABASE_URL
├── .gitignore
│
├── lib/
│   ├── db.ts                   # pg Pool, query(), queryOne(), end()
│   ├── embeddings.ts           # embed(text), embedBatch(texts) via OpenAI
│   └── tools.ts                # search_subjects, get_subject_chunks, search_chunks
│
├── seed.ts                     # Populates DB with mock data + real embeddings
└── retrieve.ts                 # Interactive CLI with two-agent retrieval
```

## Database schema

Three tables, all using UUIDs:

**chunks** — individual pieces of information
| Column     | Type             | Notes                                      |
|------------|------------------|--------------------------------------------|
| id         | uuid (PK)        | gen_random_uuid()                          |
| content    | text             | The actual text                            |
| type       | text             | `note`, `todo`, `email`, or `ticket`       |
| source     | text             | `manual`, `gmail`, or `github`             |
| embedding  | vector(1536)     | OpenAI text-embedding-3-small              |
| metadata   | jsonb            | Freeform (priority, assignee, PR#, etc.)   |
| created_at | timestamptz      |                                            |
| updated_at | timestamptz      |                                            |

**subjects** — entities that chunks relate to
| Column              | Type          | Notes                                    |
|---------------------|---------------|------------------------------------------|
| id                  | uuid (PK)     | gen_random_uuid()                        |
| name                | text          | e.g. "Erik", "AI Twin", "SSO"           |
| type                | text          | `person`, `project`, `concept`, `workflow` |
| summary             | text          | Human-readable summary of the subject    |
| summary_embedding   | vector(1536)  | Embedding of "{name}: {summary}"         |
| last_consolidated_at| timestamptz   | For future consolidation feature         |
| created_at          | timestamptz   |                                          |

**chunk_subjects** — many-to-many join table
| Column     | Type | Notes                       |
|------------|------|-----------------------------|
| chunk_id   | uuid | FK → chunks, cascade delete |
| subject_id | uuid | FK → subjects, cascade delete |

Both `chunks.embedding` and `subjects.summary_embedding` have IVFFlat indexes for fast cosine similarity search.

## Lib modules

### lib/db.ts

Thin wrapper around `pg.Pool`. Reads `DATABASE_URL` from `.env`.

- `query<T>(sql, params?)` — returns `T[]` (all rows)
- `queryOne<T>(sql, params?)` — returns first row or `undefined`
- `end()` — closes the pool

### lib/embeddings.ts

Uses OpenAI `text-embedding-3-small` (1536 dimensions).

- `embed(text)` — returns `number[]` (single embedding)
- `embedBatch(texts)` — returns `number[][]` (one embedding per input)

### lib/tools.ts

Three retrieval functions that the retrieval agent can call:

- **`search_subjects(query)`** — Embeds the query, does cosine similarity search against `subjects.summary_embedding` (top 5). Also does ILIKE fuzzy match on `subjects.name`. Results are merged and deduplicated.

- **`get_subject_chunks(subject_id, type?)`** — Gets all chunks linked to a subject via `chunk_subjects`. Optional type filter (`note`, `todo`, `email`, `ticket`). Sorted by `created_at DESC`.

- **`search_chunks(query)`** — Embeds the query, does cosine similarity search directly against `chunks.embedding`. Returns top 10.

## Seed data

`seed.ts` populates the database with mock data resembling a tech lead at a small consultancy building an AI product ("AI Twin") for clients. It generates real embeddings via OpenAI for all content.

**6 subjects:**
| Name         | Type     | Description                                    |
|--------------|----------|------------------------------------------------|
| Erik         | person   | Senior fullstack consultant, tech lead         |
| Lisa         | person   | Backend dev, SSO specialist                    |
| AI Twin      | project  | Main product — RAG-based AI assistant          |
| IF Elfsborg  | project  | Customer — football club scouting department   |
| SSO          | concept  | Azure AD OIDC integration                      |
| Deployment   | workflow | CI/CD with GitHub Actions, Helm, Kubernetes    |

**18 chunks** spanning the last ~45 days: meeting notes, todos, bug tickets, PR notes, experiment logs. Chunks cross-link subjects realistically (e.g. a deployment todo links to Erik + Deployment + IF Elfsborg + AI Twin).

Running `seed.ts` clears all existing data before inserting. It makes 2 OpenAI API calls (one batch for subject embeddings, one for chunk embeddings).

## How retrieve.ts works

The retrieval system uses a **two-agent architecture**:

```
You type a question
        │
        ▼
┌─────────────────────┐
│   Main agent        │  GPT-5.2, has tool: search_brain
│   (conversational)  │  System prompt: "you have a second brain"
└────────┬────────────┘
         │ search_brain tool call (no parameters)
         ▼
┌─────────────────────────────────────────────┐
│   Retrieval agent                           │
│   (autonomous, forked conversation context) │
│                                             │
│   Tools: search_subjects(query)             │
│          get_subject_chunks(subject_id, type?)
│          search_chunks(query)               │
│                                             │
│   Runs in a loop: Claude → tool calls →     │
│   execute against DB → send results back →  │
│   repeat until text response (max 6 calls)  │
└────────┬────────────────────────────────────┘
         │ structured summary of findings
         ▼
┌─────────────────────┐
│   Main agent        │  Receives retrieval result as tool_result,
│   (continued)       │  formulates final answer
└─────────────────────┘
         │
         ▼
    Answer printed to terminal
```

### Step by step

1. You type a question at `du> ` prompt
2. The main agent (GPT-5.2) decides if it needs to search. If not, it responds directly.
3. If it calls `search_brain`:
   - The full conversation history is serialized and sent to a **new** Claude API conversation with a retrieval-focused system prompt
   - The retrieval agent autonomously makes tool calls (vector search on subjects, fetch chunks, vector search on chunks) — up to 6 calls
   - Each tool call hits the Postgres database, results are sent back to GPT
   - When the retrieval agent stops making tool calls, its text response becomes the tool result
4. The main agent receives the retrieval summary and generates a final answer
5. The conversation continues — previous context is preserved across turns

### What you see in the terminal

```
du> Vad jobbar Lisa med just nu?
  [söker i hjärnan...]
    [retrieval] search_subjects({"query":"Lisa"})
    [retrieval] get_subject_chunks({"subject_id":"abc-123"})
    [retrieval] search_chunks({"query":"Lisa arbete uppgifter"})

assistent> Lisa jobbar med flera saker: hon har precis...
```

Lines prefixed with `[retrieval]` show the retrieval agent's tool calls in real time.

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
- **Main agent:** OpenAI `gpt-5.2`
- **Retrieval agent:** OpenAI `gpt-5.2`

Both chat completion calls are in `retrieve.ts`. Change the `MODEL` constant there to switch models.

## Extending this

Some ideas for next steps:

- **Ingest script** — add new chunks from CLI, auto-generate embeddings and link subjects
- **Subject consolidation** — periodically re-summarize subjects based on their latest chunks (use `last_consolidated_at`)
- **More sources** — Gmail API, GitHub issues API, calendar events
- **Hybrid search** — combine vector similarity with keyword search (pg_trgm or full-text search)
- **Streaming** — use Claude's streaming API to show responses token by token
- **Conversation memory** — persist conversation history so it survives restarts
