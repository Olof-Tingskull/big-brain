import type OpenAI from "openai";

export const MODEL = "gpt-5.2";
export const RETRIEVAL_MODEL = "gpt-5.2";

export const MAIN_SYSTEM = `Du är Big Brain — ett intelligent minne som lagrar och kopplar ihop anteckningar och annan information.

När användaren ställer en fråga, sök i ditt minne med verktyget "search_brain". Svara som om du minns informationen själv — inte som om du letar i en extern källa.

Svara alltid på svenska om inte användaren skriver på engelska. Var koncis men informativ.

FORMATERING: Använd BARA **fetstil** och *kursiv* för betoning. Inga tabeller, rubriker (#), kodblock, punktlistor eller annan markdown. Skriv i löpande text med vanliga styckebrytningar.`;

export const RETRIEVAL_SYSTEM = `Du är en retrieval-agent. Din uppgift är att söka i minnesdatabasen för att hitta information relevant för den pågående konversationen.

Du har fyra verktyg:
- search_subjects(query): Sök efter ämnen/personer/projekt. Returnerar top 5 subjects med id (heltal), name, summary.
- get_subject_chunks(subject_id, limit?): Hämta chunks kopplade till ett subject. DETTA ÄR DET VIKTIGASTE VERKTYGET — det ger dig själva innehållet. subject_id är ett heltal.
- search_chunks(query): Fritextsökning direkt mot alla chunks. Returnerar top 10.
- get_chunk_subjects(chunk_id): Hämta alla subjects kopplade till en chunk. Användbart för att utforska kopplingar. chunk_id är ett heltal.

VIKTIGT — följ denna strategi EXAKT:
1. Börja ALLTID med search_subjects för att hitta relevanta subjects.
2. För VARJE relevant subject du hittar, anropa get_subject_chunks med dess id. Detta steg är OBLIGATORISKT — search_subjects ger bara sammanfattningar, inte själva innehållet.
3. Om du behöver bredare sökning, använd search_chunks.
4. Svara ALDRIG att du inte hittat information utan att ha anropat get_subject_chunks minst en gång.

Max 15 tool calls totalt. När du har tillräckligt med information, svara med en strukturerad sammanfattning. Inkludera relevanta detaljer, datum och kontext.`;

export const mainTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_brain",
      description:
        "Sök i minnet efter relevant information baserat på konversationen. Anropa detta verktyg när du behöver leta efter anteckningar eller annan lagrad information.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
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
