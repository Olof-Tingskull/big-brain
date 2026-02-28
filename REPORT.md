# Databasrapport: big-brain

Genererad 2026-02-28. Baserad på direkta SQL-queries mot produktionsdatabasen.

---

## 1. Översikt

| Mätvärde | Antal |
|----------|-------|
| Subjects | 18 |
| Chunks | 40 |
| Kopplingar (chunk_subjects) | 79 |
| Orphan subjects (inga chunks) | 0 |
| Orphan chunks (inga subjects) | 0 |

Snitt: ~2 kopplingar per chunk, ~4.4 chunks per subject.

---

## 2. Subjects (sorterat på chunk-antal)

| ID | Subject | Type | Chunks | Summary (80 tecken) |
|----|---------|------|--------|----------------------|
| 51 | AI Twin (PHB) | project | 18 | PHB:s flaggskeppsprodukt: AI Twin, en chatbot/AI-representation av företags-VD:a... |
| 50 | Olof | person | 12 | Användaren heter Olof och arbetar som Founding Engineer på People Heart Business... |
| 49 | PHB – People Heart Business (PHB) | organization | 12 | People Heart Business (PHB) är företaget där användaren Olof arbetar som Foundin... |
| 60 | Coor Cleaning | organization | 8 | Coor Cleaning är kund till PHB:s produkt AI Twin... |
| 59 | Dynavox | organization | 6 | Dynavox är kund till PHB:s produkt AI Twin och var en av de första kunderna... |
| 65 | Big Brain (big-brain) | project | 6 | Big Brain (big-brain) är Olofs assistentsystem/second brain... |
| 53 | Lovisa | person | 4 | Olofs partner/flickvän. Bor i Göteborg och pluggar till copywriter... |
| 55 | Klara Ljungqvist | person | 2 | Klara Ljungqvist är VD på People Heart Business (PHB)... |
| 57 | Erik Bohjort | person | 2 | Kollega/samarbetspartner till Olof på People Heart Business (PHB)... |
| 66 | Olivia | person | 1 | Olofs kollega som föreslog att presentera roadmapen som ett Gantt-schema. |
| 58 | Alergeek Ventures | organization | 1 | Extern konsultpartner som Olof samarbetar med i arbetet på PHB. |
| 61 | Fredrik Ruben | person | 1 | VD för Dynavox Group... |
| 54 | Qura | organization | 1 | Startup där Olof var första utvecklaren... |
| 56 | Felicia Grosin | person | 1 | COO på People Heart Business (PHB)... |
| 52 | St. Anton-resa (dec 2025–apr 2026) | event | 1 | Olofs vistelse i St. Anton (dec 2025–apr 2026) där han jobbar på distans... |
| 63 | Malin (Coor-samtalet) | person | 1 | Person (troligen hos Coor) som Olof haft ett samtal med... |
| 64 | AI-Klara-dev | project | 1 | AI-Klara-dev är en dev-/utvecklingsinstans av plattformen/repo:t AI Twin... |
| 62 | Thobias (Coor) | person | 1 | Kontaktperson på Coor som Olof behöver prata med... |

AI Twin dominerar med 18 chunks (45% av alla). 9 av 18 subjects har bara 1 chunk.

---

## 3. Duplicering & överlapp

### Chunk-duplicering (cosine similarity > 0.92)

**Inga träffar.** Inga nära-duplicerade chunks.

### Subject-duplicering (cosine similarity > 0.90)

**Inga träffar.** Inga överlappande subject-embeddings.

### Överlappande subject-namn (substring-match)

**Inga träffar.**

### Låg similarity inom samma subject (potentiella motsägelser)

Chunk-par på samma subject med cosine similarity < 0.50 (topp 10):

| Subject | Chunk A | Chunk B | Similarity | Innehåll A (50 tecken) | Innehåll B (50 tecken) |
|---------|---------|---------|------------|------------------------|------------------------|
| Olof | 100 | 102 | 0.24 | Tidslinje: Det är år 2026. Olof jobbar på distans... | PHB (People Heart Business) är en verksamhet/organ... |
| PHB | 104 | 109 | 0.24 | PHB:s kultur: fokus på att människor hos kunder oc... | AI Twin – intäkter och prognos: Omsättning 24/25:... |
| PHB | 102 | 109 | 0.26 | PHB (People Heart Business) är en verksamhet/organ... | AI Twin – intäkter och prognos: Omsättning 24/25:... |
| AI Twin | 124 | 132 | 0.26 | Roadmap/planering: Olof vill att roadmapen ska var... | AI Twin (ai-twin) – Repo/README: AI Twin Platform... |
| Olof | 102 | 122 | 0.27 | PHB (People Heart Business) är en verksamhet/organ... | TODO (Olof): Undersök varför OpenAI-kostnaderna är... |
| AI Twin | 109 | 124 | 0.27 | AI Twin – intäkter och prognos: Omsättning 24/25:... | Roadmap/planering: Olof vill att roadmapen ska var... |
| AI Twin | 118 | 124 | 0.28 | Coor Cleaning är kund hos PHB för AI Twin... | Roadmap/planering: Olof vill att roadmapen ska var... |
| AI Twin | 110 | 124 | 0.28 | AI Twin – nuvarande kunder och use cases:... | Roadmap/planering: Olof vill att roadmapen ska var... |
| AI Twin | 124 | 133 | 0.29 | Roadmap/planering: Olof vill att roadmapen ska var... | AI Twin (ai-twin) – Monorepo-struktur enligt READM... |
| Olof | 97 | 99 | 0.29 | PHB:s flaggskeppsprodukt AI Twin (PHB): en AI-repr... | Privat: Olof är tillsammans med Lovisa... |

**Bedömning:** Inga faktiska motsägelser. Den låga similariteten beror på att chunks täcker genuint olika aspekter av samma subject (personligt vs professionellt, kultur vs ekonomi, planering vs teknisk docs).

---

## 4. Chunk-kvalitet

### Distribution: antal subjects per chunk

| Antal subjects | Antal chunks | Andel |
|----------------|-------------|-------|
| 1 | 18 | 45% |
| 2 | 14 | 35% |
| 3 | 4 | 10% |
| 4 | 2 | 5% |
| 6 | 1 | 2.5% |
| 7 | 1 | 2.5% |

### Bredaste chunks (flest subjects)

**Chunk 120** (7 subjects: Dynavox, Coor Cleaning, Thobias, Malin, AI Twin, Erik Bohjort, Olof):
```
Olofs aktuella arbets-TODOs:
1) Få in onboarding-datan i AI-Fredrik (Dynavox).
2) Hitta ett sätt att göra roadmap varje vecka som ett Gantt-schema.
3) Prata med Thobias på Coor om var PHB:s AI Twin och Coors miljö ska "möta" varandra...
4) Kolla konsultkostnader med Erik Bohjort.
5) Undersök varför OpenAI-kostnaderna är höga...
```
Problem: En TODO-lista dumpat som en enda chunk. Alla 5 TODO-punkter har blandade ämnen.

**Chunk 96** (6 subjects: PHB, Klara, Felicia, Erik, Alergeek, Olof):
```
Olof (användaren) är Founding Engineer på People Heart Business (PHB) i Stockholm.
Han började sent 2025 / tidigt 2026. Rapporterar till Klara Ljungqvist (VD).
Arbetar främst med PHB:s flaggskeppsprodukt AI Twin för Microsoft Teams.
```
Problem: Bio-chunk som nämner många personer/organisationer — vid retrieval pollutar den resultat.

### Smalaste chunks (1 subject) — exempel

| Chunk ID | Enda subject | Innehåll (100 tecken) |
|----------|--------------|------------------------|
| 131 | Big Brain | Big Brain använder en 3-agent-arkitektur: Conversational agent, retrieval... |
| 97 | Olof | PHB:s flaggskeppsprodukt AI Twin (PHB): en AI-representation av en organisations... |
| 105 | AI Twin | AI Twin (PHB) bygger på två grundpelare: 1) Avkodning av individen... |
| 123 | Klara Ljungqvist | Olof fungerar i praktiken som tech lead på PHB och leder konsulter... |
| 96 | Erik Bohjort | Olof (användaren) är Founding Engineer på PHB i Stockholm... |

Problem: Chunk 97 handlar om AI Twin men är bara kopplad till Olof. Chunk 123 handlar om Olof/PHB men är bara kopplad till Klara.

Totalt: **18 av 40 chunks (45%)** har bara 1 subject. Flera av dessa borde vara kopplade till fler.

### Korta chunks (< 50 tecken)

**Inga.** Alla chunks har rimlig längd.

### Långa chunks (> 500 tecken)

| Chunk ID | Längd | Subjects | Innehåll (120 tecken) |
|----------|-------|----------|-----------------------|
| **121** | **2590** | AI Twin | AI Twin – Projekt workflow/roadmap (TODO): ~40 feature-punkter med prioritet... |
| 130 | 1177 | Big Brain | Big Brain (repo README / nuvarande implementation) — en README-dump... |
| 123 | 915 | Klara | Olof fungerar som tech lead på PHB och leder konsulter. Arbetar 50%... |
| 129 | 888 | Big Brain | TODO / designriktning i Big Brain: Stöd för connectors/sources... |
| 131 | 733 | Big Brain | Big Brain använder en 3-agent-arkitektur... |
| 120 | 524 | 7 subjects | Olofs aktuella arbets-TODOs: 5 punkter... |

**Chunk 121 (2590 tecken)** är den mest problematiska — hela AI Twin-roadmapen med ~40 feature-rader i en chunk. En sökning om vilken enskild feature som helst matchar hela listan.

---

## 5. Subject-kvalitet

### Subjects med kort/saknad summary (< 30 tecken)

**Inga.** Alla subjects har ordentliga summaries.

### Överlappande namn

**Inga.** Alla namn är unika och distinkt formulerade.

---

## 6. AI Twin-chunks i detalj

Eftersom AI Twin har 18 chunks (45% av alla) förtjänar den en närmare titt:

| Chunk ID | Längd | Innehåll |
|----------|-------|----------|
| 97 | 399 | Produktbeskrivning: AI-representation av nyckelperson i MS Teams |
| 105 | 418 | Grundpelare: avkodning av individ + personalisering |
| 106 | 404 | Proaktivt/reaktivt beteende |
| 107 | 436 | Personalisering och organisationsinsikter |
| 108 | 325 | Teknisk stack 2026 (OpenAI, RAG, etc.) |
| 109 | 206 | Intäkter och prognos (0.8→2→4 MSEK) |
| 110 | 421 | Kunder och use cases (Dynavox, Coor) |
| 114 | 315 | Dynavox/SharePoint-projektdata |
| 118 | 250 | Coor implementation (AI-Charlotte, AI-Thobias) |
| 119 | 336 | Coor-integration (de vill äga infra) |
| 120 | 524 | Olofs TODO-lista (blandat) |
| **121** | **2590** | **Hela roadmapen (~40 features med prioritet)** |
| 122 | 193 | TODO: OpenAI-kostnader |
| 123 | 915 | Olof som tech lead, arbetsfördelning |
| 124 | 218 | Roadmap-planering (datum, milstolpar) |
| 132 | 478 | Repo/README-beskrivning |
| 133 | 308 | Monorepo-struktur |
| 134 | 427 | Deploy-script |

Observationer:
- Chunk 121 (roadmapen) bör splittas i ~6-8 fokuserade chunks per kategori
- Chunks 132-134 är repository-dokumentation — kanske bör vara en separat "ai-twin-repo" subject
- Chunks 118-119 överlappar med Coor Cleaning-subject men ger AI Twin-perspektivet
- Chunk 97 är bara kopplad till Olof, inte till AI Twin (felkoppling)

---

## 7. Sammanfattning av problem

### Vad som fungerar bra
- Inga orphans (alla chunks och subjects är kopplade)
- Inga dupliceringar (varken chunks eller subjects)
- Inga motsägelser
- Alla subjects har ordentliga summaries
- Inga suspekt korta chunks

### Tre strukturella problem

**Problem 1: Klump-chunks (för långa)**
6 chunks > 500 tecken. Chunk 121 (2590 tecken) är hela roadmapen i en enda chunk. Chunk 130 (1177 tecken) är en README-dump. Dessa ger oprecisa retrieval-resultat — en sökning om "onboarding use case" matchar hela roadmapen.

**Problem 2: Catch-all chunks (för breda)**
Chunk 120 (TODO-lista, 7 subjects) och chunk 96 (Olof-bio, 6 subjects) pollutar retrieval. En fråga om Malin hämtar hela Olofs TODO-lista.

**Problem 3: Under-kopplade chunks**
18 av 40 chunks (45%) har bara 1 subject. Chunk 97 ("PHB:s flaggskeppsprodukt AI Twin...") är bara kopplad till Olof men handlar lika mycket om AI Twin och PHB. Chunk 123 ("Olof fungerar som tech lead...") är bara kopplad till Klara men handlar om Olof, PHB, och konsultarbete.

---

## 8. Rekommendation: Consolidation-agent

### Rekommenderad approach: Variant B + cross-linking (steg 3 från C)

Baserat på att datan är relativt ren men har granularitets- och kopplingsproblem:

### Fas 1: Per-subject genomgång (variant B)

```
consolidate(subject_id):
  1. Hämta subject summary + alla chunks
  2. LLM analyserar:
     - Vilka chunks bör splittas? (> ~300 tecken, blandat innehåll)
     - Vilka chunks bör mergas? (liknande ämne, kan kondenseras)
     - Behöver subject summary uppdateras?
  3. Utför mutationer via befintliga write-tools
  4. Returnera changelog
```

Prioritetsordning: AI Twin (18 chunks) → Olof (12) → PHB (12) → Coor (8) → resten.

**Varför B och inte A:** Datan är tillräckligt organiserad. En fri agent (A) riskerar att röra till det som redan är rent — och det finns inget globalt problem (inga dupliceringar, inga orphans) som kräver en helhetsvy. Per-subject är enklare att kontrollera, debugga, och köra om vid fel.

### Fas 2: Cross-linking pass (steg 3 från C)

```
cross_link():
  1. För varje chunk:
     - Sök liknande subjects via embedding-similarity
     - Om similarity > threshold OCH inte redan kopplad → koppla
  2. Returnera lista med nya kopplingar
```

Detta löser det största strukturella problemet (45% under-kopplade chunks) och kräver ingen LLM — ren embedding-jämförelse.

### Varför inte C fullt ut?

Steg 2 i C ("ta bort chunks som alla subjects markerat som onödiga") löser ett problem som inte finns i datan — det finns inga dupliceringar att städa. Kan läggas till senare om writer-agenten börjar skapa duplicerat innehåll.

### Implementationsnoteringar

- Reuse befintliga `write-tools.ts` för alla mutationer
- Consolidation bör logga alla ändringar (innan/efter) för review
- Chunk 121 (2590-tecken roadmapen) bör splittas i ~6-8 chunks efter kategori (Kärna, Admin, Teknik, etc.)
- Chunks 132-134 (repo-docs) kanske bör ligga under ett eget subject ("ai-twin-repo") snarare än under det generella "AI Twin (PHB)"
- `last_consolidated_at` på subjects-tabellen finns redan — använd den för att tracka vilka subjects som bearbetats
