# Big Brain — Arkitektur

Ett AI-drivet "minne" i terminalen. Du ställer frågor och boten söker igenom en databas av anteckningar, todos och annat för att svara — som om den "minns" saker.

Datan som lagts in är en fiktiv kompiskrets i Göteborg med ~10 personer, massa drama (breakups, hemliga crushes, spelproblem, alkoholproblem, etc.).

## Två LLM-agenter i kedja

Programmet använder ett tvåstegs-agentmönster:

### 1. Huvudagenten (`gpt-5.2`)

- Tar emot användarens fråga
- Har tillgång till ETT verktyg: `search_brain`
- Om den bestämmer att den behöver information anropar den `search_brain`, vilket triggar retrieval-agenten
- När den fått tillbaka data svarar den användaren i naturlig text på svenska

### 2. Retrieval-agenten (`gpt-5-mini`)

En sub-agent som körs i `lib/retrieval.ts`. Den får konversationshistoriken som kontext och har tre verktyg:

- **search_subjects** — vektorsökning + fuzzy-namnmatch mot subjects
- **get_subject_chunks** — hämtar alla anteckningar kopplade till ett subject
- **search_chunks** — vektorsökning direkt mot chunks

Kör en autonom loop (max 15 tool calls) tills den har tillräcklig info, och returnerar en strukturerad sammanfattning tillbaka till huvudagenten.

## Databas — pgvector

PostgreSQL med `pgvector`-extensionen via Docker (`docker-compose.yml`). Schemat i `schema.sql` definierar tre tabeller:

- **chunks** — informationsbittarna (anteckningar, todos). Varje chunk har en `embedding` (vektor med 1536 dimensioner) för semantisk sökning.
- **subjects** — personer, projekt, koncept, workflows. Har en `summary_embedding` för sökning.
- **chunk_subjects** — kopplingstabellen (many-to-many) som länkar chunks till subjects.

Vektorsökningen använder cosine distance (`<=>`) med IVFFlat-index.

## Filer

```
retrieve.ts            CLI-entrypoint, readline-loop, huvudagent
seed.ts                Fyller databasen med all fiktiv data + embeddings
lib/
  prompts.ts           System prompts, modellnamn, tool-definitioner
  retrieval.ts         Retrieval-agentens loop (sub-agent)
  tools.ts             Databasfunktioner (search_subjects, get_subject_chunks, search_chunks)
  db.ts                Postgres-pool med query/queryOne/end
  embeddings.ts        Wrapper runt OpenAIs embedding-API (text-embedding-3-small)
  colors.ts            ANSI-färgkoder för terminaloutput
  format.ts            Konverterar **bold** och *italic* till ANSI-koder
schema.sql             Databasschema (chunks, subjects, chunk_subjects + index)
docker-compose.yml     pgvector/pgvector:pg16
```

## Flöde

```
Användare skriver fråga
  → Huvudagent (gpt-5.2) bedömer om den behöver söka
    → Om ja: triggar search_brain
      → Retrieval-agent (gpt-5-mini) startar
        → Söker subjects med vektorsökning
        → Hämtar chunks per subject
        → Ev. söker chunks direkt
        → Returnerar sammanfattning
    → Huvudagent svarar med informationen
```

## Köra

```bash
docker compose up -d          # Starta Postgres
npm run seed                  # Fyll databasen
npm run retrieve              # Starta CLI:n
```
