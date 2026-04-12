CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"instagram" varchar(128),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text,
	"file_key" text,
	"file_type" varchar(64),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_media_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_social_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"platform" varchar(32) NOT NULL,
	"handle" varchar(128),
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"version_label" varchar(64) DEFAULT 'v1',
	"file_url" text,
	"file_key" text,
	"file_type" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"channel_id" integer,
	"title" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" varchar(32),
	"city" varchar(128),
	"state" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"metric_date" timestamp NOT NULL,
	"source" varchar(64),
	"payload_json" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_date" timestamp NOT NULL,
	"status" varchar(32) DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now() NOT NULL
);
