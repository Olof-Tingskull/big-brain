import type OpenAI from "openai";

export const MODEL = "gpt-5.2";
export const RETRIEVAL_MODEL = "gpt-5.2";
export const MAX_TOOL_CALLS = 20;

export const MAIN_SYSTEM = `Du är Big Brain — ett intelligent minne som lagrar och kopplar ihop anteckningar och information.

Varje meddelande du får innehåller en MINNESKONTEXT-sektion med relevant information från ditt minne. Svara som om du minns informationen själv — inte som om du letar i en extern källa.

Du har ETT verktyg: ingest_to_brain(information). Använd det för att spara ny information.

KLASSIFICERING — bedöm varje meddelande från användaren:

1. FRÅGA (t.ex. "Vad jobbar Kasper med?")
   → Svara direkt med information från minneskontexten. Anropa INTE ingest_to_brain.

2. NY INFORMATION — TYDLIG (t.ex. "Kasper har fått nytt jobb på Spotify")
   → Anropa ingest_to_brain DIREKT med informationen. Ge sedan en kort bekräftelse.

3. NY INFORMATION — OTYDLIG (t.ex. "Kasper verkar trivas bra")
   → Fråga användaren: "Vill du att jag ska komma ihåg detta?" Anropa ingest_to_brain BARA om användaren bekräftar.

4. BÅDE FRÅGA OCH NY INFO (t.ex. "Vad vet du om Kasper? Han har förresten bytt jobb")
   → Svara på frågan FÖRST, anropa sedan ingest_to_brain med den nya informationen.

BEKRÄFTELSEFLÖDE:
Om du frågade "Vill du att jag ska komma ihåg detta?" och användaren svarar "ja", anropa ingest_to_brain med den URSPRUNGLIGA informationen från det tidigare meddelandet — INTE med "ja".

OM MINNESKONTEXTEN ÄR TOM:
Det är normalt — det kan betyda att informationen är helt ny. Svara på frågor med "Jag har ingen information om det ännu" och erbjud att spara om användaren ger ny info.

Svara alltid på svenska om inte användaren skriver på engelska. Var koncis men informativ.

FORMATERING: Använd BARA **fetstil** och *kursiv* för betoning. Inga tabeller, rubriker (#), kodblock, punktlistor eller annan markdown. Skriv i löpande text med vanliga styckebrytningar.`;

export const RETRIEVAL_SYSTEM = `Du är en retrieval-agent. Din uppgift är att söka i minnesdatabasen för att hitta information relevant för den pågående konversationen.

Du har fyra verktyg:
- search_subjects(query): Sök efter ämnen/personer/projekt. Returnerar top 5 subjects med id (heltal), name, summary.
- get_subject_chunks(subject_id, limit?): Hämta chunks kopplade till ett subject. DETTA ÄR DET VIKTIGASTE VERKTYGET — det ger dig själva innehållet. subject_id är ett heltal.
- search_chunks(query): Fritextsökning direkt mot alla chunks. Returnerar top 10.
- get_chunk_subjects(chunk_id): Hämta alla subjects kopplade till en chunk. Användbart för att utforska kopplingar. chunk_id är ett heltal.

VIKTIGT — följ denna strategi EXAKT:
1. Börja med BÅDE search_subjects OCH search_chunks parallellt (i samma svar).
   - search_subjects hittar kända entiteter (personer, projekt, företag) via sammanfattningar.
   - search_chunks hittar specifika detaljer, datum och info som kanske inte är kopplad till rätt subject.
   Använd ALLTID båda — de söker i olika rymder och kompletterar varandra.
2. För VARJE relevant subject du hittar, anropa get_subject_chunks med dess id. Detta steg är OBLIGATORISKT — search_subjects ger bara sammanfattningar, inte själva innehållet.
3. Använd get_chunk_subjects om du vill utforska kopplingar från intressanta chunks.
4. Svara ALDRIG att du inte hittat information utan att ha anropat BÅDE search_subjects och search_chunks.

Max ${MAX_TOOL_CALLS} tool calls totalt. När du har tillräckligt med information, svara med en strukturerad sammanfattning. Inkludera relevanta detaljer, datum och kontext.`;

export const brainTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "ingest_to_brain",
      description:
        "Spara ny information i minnet. Anropa detta när användaren ger dig ny information som bör lagras. Parametern 'information' ska vara en ren, tydlig formulering av vad som ska sparas.",
      parameters: {
        type: "object",
        properties: {
          information: {
            type: "string",
            description: "Den information som ska sparas, formulerad som en tydlig anteckning.",
          },
        },
        required: ["information"],
      },
    },
  },
];

export const WRITER_MODEL = "gpt-5.2";

export const WRITER_SYSTEM = `Du hanterar ett minnessystem. Du får ny information och befintlig kontext. Din uppgift är att lagra den nya informationen korrekt.

Du ska:
- Skapa chunks för ny info
- Uppdatera befintliga chunks om info har ändrats
- Ta bort chunks som blivit inaktuella
- Skapa NYA subjects BARA om det dyker upp helt nya koncept/personer/projekt som INTE redan finns
- Koppla chunks till rätt subjects
- Uppdatera subject-sammanfattningar om ny info ändrar bilden väsentligt

KRITISKT — ÅTERANVÄND BEFINTLIGA SUBJECTS:
Den befintliga kontexten du får innehåller subject-IDn (heltal). ANVÄND DESSA IDn direkt. Skapa ALDRIG ett nytt subject för något som redan finns. Om du är osäker, använd search_subjects för att kolla.

Du har dessa verktyg:
- search_subjects(query): Sök efter befintliga subjects. ANVÄND DETTA för att hitta IDn innan du skapar något nytt.
- create_chunk(content, metadata, subject_ids): Skapa ny chunk med kopplingar. subject_ids är en lista av heltal.
- update_chunk(chunk_id, content): Uppdatera en befintlig chunk (regenerar embedding automatiskt). chunk_id är ett heltal.
- delete_chunk(chunk_id): Ta bort en chunk och dess kopplingar. chunk_id är ett heltal.
- create_subject(name, type, initial_summary): Skapa nytt subject BARA för helt nya koncept. type är fri text (t.ex. "person", "project", "concept", "place", "event").
- update_subject_summary(subject_id, new_summary): Uppdatera sammanfattning för ett subject. subject_id är ett heltal.
- link_chunk_subject(chunk_id, subject_id): Koppla en chunk till ett subject. Båda är heltal.
- list_subject_chunks(subject_id): Lista befintliga chunks för ett subject. subject_id är ett heltal.

STRATEGI:
1. Läs den befintliga kontexten noga — den innehåller subject-IDn och chunk-IDn.
2. Om du behöver fler IDn, anropa search_subjects.
3. Skapa chunks och koppla till BEFINTLIGA subject-IDn.
4. Uppdatera subject-sammanfattningar som påverkas av den nya infon.
5. Skapa BARA nya subjects om det dyker upp en helt ny person/koncept som inte redan finns i databasen.
- Svara alltid på svenska med en kort sammanfattning av vad du gjorde.`;

export const writerTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_subjects",
      description: "Sök efter befintliga subjects. Använd detta för att hitta subject-IDn INNAN du skapar nya subjects. Returnerar top 5.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Sökfråga" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chunk",
      description: "Skapa en ny chunk med kopplingar till subjects.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Innehållet i chunken" },
          metadata: {
            type: "object",
            description: "Extra metadata (t.ex. datum, taggar)",
          },
          subject_ids: {
            type: "array",
            items: { type: "integer" },
            description: "Lista av subject-IDn (heltal) att koppla till",
          },
        },
        required: ["content", "metadata", "subject_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_chunk",
      description: "Uppdatera innehållet i en befintlig chunk. Embedding regeneras automatiskt.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
          content: { type: "string", description: "Nytt innehåll" },
        },
        required: ["chunk_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_chunk",
      description: "Ta bort en chunk och alla dess kopplingar.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
        },
        required: ["chunk_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_subject",
      description: "Skapa ett nytt subject. Typ är fri text (person, project, concept, place, event, etc).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Namn på subject" },
          type: {
            type: "string",
            description: "Typ av subject (fri text, t.ex. person, project, concept, place, event)",
          },
          initial_summary: { type: "string", description: "Sammanfattning" },
        },
        required: ["name", "type", "initial_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_subject_summary",
      description: "Uppdatera sammanfattningen för ett subject. Embedding regeneras automatiskt.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
          new_summary: { type: "string", description: "Ny sammanfattning" },
        },
        required: ["subject_id", "new_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_chunk_subject",
      description: "Koppla en chunk till ett subject.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
        },
        required: ["chunk_id", "subject_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_subject_chunks",
      description: "Lista alla befintliga chunks kopplade till ett subject.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
        },
        required: ["subject_id"],
      },
    },
  },
];

// ── Consolidation agent ──

export const CONSOLIDATOR_MODEL = "gpt-5.2";
export const MAX_CONSOLIDATOR_TOOL_CALLS = 25;

export const CONSOLIDATOR_SYSTEM = `Du underhåller ett minnessystem. Du får ett subject och dess chunks.
Din uppgift:
- Splitta chunks som är för långa (> ~300 tecken) eller blandar flera ämnen i separata, fokuserade chunks
- Merga chunks som överlappar eller kan kondenseras
- Uppdatera subject summary baserat på nuvarande chunks
- Varje chunk ska handla om EN sak eller ETT sammanhängande ämne
- TODO-listor: splitta per KATEGORI (t.ex. "Dataanalys", "Teknik", "UX"), INTE per enskild punkt. En TODO-chunk per kategori med 2-5 punkter är bra. Skapa ALDRIG en chunk per enskild TODO-punkt.
- Repo-dokumentation bör separeras från produkt-beskrivningar
- Bevara ALL information — inget får tappas bort
- Räkna dina tool calls. Du har max 25 totalt — planera därefter.

Var konservativ. Ändra bara det som behöver ändras. Om chunks redan ser bra ut, rör dem inte.

Du har dessa verktyg:
- list_subject_chunks(subject_id): Lista alla chunks för ett subject (med id, content, created_at). Anropa detta FÖRST om du vill se aktuellt läge.
- create_chunk(content, metadata, subject_ids): Skapa ny chunk med kopplingar. subject_ids är en lista av heltal.
- update_chunk(chunk_id, content): Uppdatera en chunk (regenerar embedding). chunk_id är heltal.
- delete_chunk(chunk_id): Ta bort en chunk och alla dess kopplingar. chunk_id är heltal.
- create_subject(name, type, initial_summary): Skapa nytt subject. Bara om det behövs (t.ex. separera repo-docs från produkt).
- update_subject_summary(subject_id, new_summary): Uppdatera sammanfattning. subject_id är heltal.
- link_chunk_subject(chunk_id, subject_id): Koppla en chunk till ett subject. Båda heltal.
- mark_consolidated(subject_id): Markera subject som consoliderat. Anropa detta SIST när du är klar.

STRATEGI:
1. Analysera alla chunks du får. Identifiera problem: för långa, blandade ämnen, överlapp.
2. Splitta/merga/uppdatera det som behöver ändras.
3. Uppdatera subject summary om det behövs.
4. Anropa mark_consolidated(subject_id) som sista steg.

VIKTIGT:
- När du splittar en chunk: skapa de nya först, koppla dem, ta sedan bort originalet.
- När du mergar: skapa ny merged chunk, ta sedan bort de gamla.
- subject_ids i create_chunk ska alltid inkludera MINST det aktuella subjectets ID.
- Skriv kort och koncist — undvik att citera hela chunk-innehåll i dina svar.

Svara på svenska med en kort sammanfattning av vad du gjorde.`;

export const consolidatorTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_subject_chunks",
      description: "Lista alla befintliga chunks kopplade till ett subject.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
        },
        required: ["subject_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chunk",
      description: "Skapa en ny chunk med kopplingar till subjects.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Innehållet i chunken" },
          metadata: {
            type: "object",
            description: "Extra metadata (t.ex. datum, taggar)",
          },
          subject_ids: {
            type: "array",
            items: { type: "integer" },
            description: "Lista av subject-IDn (heltal) att koppla till",
          },
        },
        required: ["content", "metadata", "subject_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_chunk",
      description: "Uppdatera innehållet i en befintlig chunk. Embedding regeneras automatiskt.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
          content: { type: "string", description: "Nytt innehåll" },
        },
        required: ["chunk_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_chunk",
      description: "Ta bort en chunk och alla dess kopplingar.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
        },
        required: ["chunk_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_subject",
      description: "Skapa ett nytt subject. Typ är fri text (person, project, concept, etc).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Namn på subject" },
          type: {
            type: "string",
            description: "Typ av subject (fri text)",
          },
          initial_summary: { type: "string", description: "Sammanfattning" },
        },
        required: ["name", "type", "initial_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_subject_summary",
      description: "Uppdatera sammanfattningen för ett subject. Embedding regeneras automatiskt.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
          new_summary: { type: "string", description: "Ny sammanfattning" },
        },
        required: ["subject_id", "new_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "link_chunk_subject",
      description: "Koppla en chunk till ett subject.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
        },
        required: ["chunk_id", "subject_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_consolidated",
      description: "Markera ett subject som consoliderat. Anropa detta som SISTA steg.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
        },
        required: ["subject_id"],
      },
    },
  },
];

export const retrievalTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_subjects",
      description: "Sök efter subjects med en textfråga. Returnerar top 5.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Sökfråga" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_subject_chunks",
      description:
        "Hämta chunks kopplade till ett subject.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "integer", description: "Subject-ID (heltal)" },
          limit: { type: "integer", description: "Max antal chunks att hämta (default 50)" },
        },
        required: ["subject_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_chunks",
      description: "Fritextsökning direkt mot chunks. Returnerar top 10.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Sökfråga" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_chunk_subjects",
      description: "Hämta alla subjects kopplade till en chunk. Användbart för att utforska kopplingar.",
      parameters: {
        type: "object",
        properties: {
          chunk_id: { type: "integer", description: "Chunk-ID (heltal)" },
        },
        required: ["chunk_id"],
      },
    },
  },
];
