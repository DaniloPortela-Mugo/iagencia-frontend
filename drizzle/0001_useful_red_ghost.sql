CREATE TYPE "public"."ai_section" AS ENUM('strategy', 'creation', 'art_direction', 'production', 'media', 'planning');--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"user_id" integer NOT NULL,
	"title" text,
	"section" "ai_section" NOT NULL,
	"messages" text NOT NULL,
	"is_archived" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
