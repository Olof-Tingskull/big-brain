-- Drop FKs and indexes first
ALTER TABLE "chunk_subjects" DROP CONSTRAINT "chunk_subjects_chunk_id_chunks_id_fk";--> statement-breakpoint
ALTER TABLE "chunk_subjects" DROP CONSTRAINT "chunk_subjects_subject_id_subjects_id_fk";--> statement-breakpoint
ALTER TABLE "chunk_subjects" DROP CONSTRAINT "chunk_subjects_chunk_id_subject_id_pk";--> statement-breakpoint
DROP INDEX IF EXISTS "chunks_embedding_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "subjects_summary_embedding_idx";--> statement-breakpoint

-- Drop old tables
DROP TABLE "chunk_subjects";--> statement-breakpoint
DROP TABLE "chunks";--> statement-breakpoint
DROP TABLE "subjects";--> statement-breakpoint

-- Recreate with serial IDs, no type/source, unique name
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"summary" text,
	"summary_embedding" vector(1536),
	"last_consolidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);--> statement-breakpoint
CREATE TABLE "chunk_subjects" (
	"chunk_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	CONSTRAINT "chunk_subjects_chunk_id_subject_id_pk" PRIMARY KEY("chunk_id","subject_id")
);--> statement-breakpoint
ALTER TABLE "chunk_subjects" ADD CONSTRAINT "chunk_subjects_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_subjects" ADD CONSTRAINT "chunk_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING ivfflat ("embedding") WITH (lists=10);--> statement-breakpoint
CREATE INDEX "subjects_summary_embedding_idx" ON "subjects" USING ivfflat ("summary_embedding") WITH (lists=10);
