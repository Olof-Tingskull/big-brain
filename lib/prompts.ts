import type OpenAI from "openai";

export const MODEL = "gpt-5.2";
export const RETRIEVAL_MODEL = "gpt-5-mini";

export const MAIN_SYSTEM = `Du är Big Brain — ett intelligent minne som lagrar och kopplar ihop anteckningar, todos, mötesnoteringar, tickets och annan information.

När användaren ställer en fråga, sök i ditt minne med verktyget "search_brain". Svara som om du minns informationen själv — inte som om du letar i en extern källa.

Svara alltid på svenska om inte användaren skriver på engelska. Var koncis men informativ.

FORMATERING: Använd BARA **fetstil** och *kursiv* för betoning. Inga tabeller, rubriker (#), kodblock, punktlistor eller annan markdown. Skriv i löpande text med vanliga styckebrytningar.`;

export const RETRIEVAL_SYSTEM = `Du är en retrieval-agent. Din uppgift är att söka i minnesdatabasen för att hitta information relevant för den pågående konversationen.

Du har tre verktyg:
- search_subjects(query): Sök efter ämnen/personer/projekt. Returnerar top 5 subjects med id, name, summary.
- get_subject_chunks(subject_id, type?): Hämta ALLA chunks (anteckningar, todos etc) kopplade till ett subject. DETTA ÄR DET VIKTIGASTE VERKTYGET — det ger dig själva innehållet.
- search_chunks(query): Fritextsökning direkt mot alla chunks. Returnerar top 10.

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
        "Sök i minnet efter relevant information baserat på konversationen. Anropa detta verktyg när du behöver leta efter anteckningar, todos, mötesnoteringar eller annan lagrad information.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

export const WRITER_MODEL = "gpt-5-mini";

export const WRITER_SYSTEM = `Du hanterar ett minnessystem. Du får ny information och befintlig kontext. Din uppgift är att lagra den nya informationen korrekt.

Du ska:
- Skapa chunks för ny info
- Uppdatera befintliga chunks om info har ändrats
- Ta bort chunks som blivit inaktuella
- Skapa nya subjects om nya koncept/personer/projekt dyker upp
- Koppla chunks till rätt subjects

Du har dessa verktyg:
- create_chunk(content, type, metadata, subject_ids): Skapa ny chunk med kopplingar. type måste vara "note", "todo", "email" eller "ticket".
- update_chunk(chunk_id, content): Uppdatera en befintlig chunk (regenerar embedding automatiskt).
- delete_chunk(chunk_id): Ta bort en chunk och dess kopplingar.
- create_subject(name, type, initial_summary): Skapa nytt subject. type måste vara "person", "project", "concept" eller "workflow".
- update_subject_summary(subject_id, new_summary): Uppdatera sammanfattning för ett subject.
- link_chunk_subject(chunk_id, subject_id): Koppla en chunk till ett subject.
- list_subject_chunks(subject_id): Lista befintliga chunks för ett subject (använd detta INNAN du uppdaterar/tar bort, så du vet vad som redan finns).

VIKTIGT:
- Använd list_subject_chunks för att se vad som redan finns innan du skapar dubbletter.
- Om informationen uppdaterar något befintligt, uppdatera istället för att skapa nytt.
- Svara alltid på svenska med en kort sammanfattning av vad du gjorde.`;

export const writerTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_chunk",
      description: "Skapa en ny chunk (anteckning, todo, etc) med kopplingar till subjects.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Innehållet i chunken" },
          type: {
            type: "string",
            enum: ["note", "todo", "email", "ticket"],
            description: "Typ av chunk",
          },
          metadata: {
            type: "object",
            description: "Extra metadata (t.ex. datum, taggar)",
          },
          subject_ids: {
            type: "array",
            items: { type: "string" },
            description: "Lista av subject UUIDs att koppla till",
          },
        },
        required: ["content", "type", "metadata", "subject_ids"],
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
          chunk_id: { type: "string", description: "Chunk UUID" },
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
          chunk_id: { type: "string", description: "Chunk UUID" },
        },
        required: ["chunk_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_subject",
      description: "Skapa ett nytt subject (person, projekt, koncept, workflow).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Namn på subject" },
          type: {
            type: "string",
            enum: ["person", "project", "concept", "workflow"],
            description: "Typ av subject",
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
          subject_id: { type: "string", description: "Subject UUID" },
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
          chunk_id: { type: "string", description: "Chunk UUID" },
          subject_id: { type: "string", description: "Subject UUID" },
        },
        required: ["chunk_id", "subject_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_subject_chunks",
      description: "Lista alla befintliga chunks kopplade till ett subject. Använd detta för att se vad som redan finns.",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "string", description: "Subject UUID" },
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
      description: "Sök efter subjects (personer, projekt, koncept, workflows) med en textfråga. Returnerar top 5.",
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
        "Hämta chunks kopplade till ett subject. Kan filtrera på type (note, todo, email, ticket).",
      parameters: {
        type: "object",
        properties: {
          subject_id: { type: "string", description: "Subject UUID" },
          type: {
            type: "string",
            description: "Filtrera på chunk-typ (note, todo, email, ticket)",
          },
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
];
