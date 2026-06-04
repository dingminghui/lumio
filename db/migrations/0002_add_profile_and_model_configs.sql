CREATE TYPE "public"."model_provider" AS ENUM('deepseek');--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" text DEFAULT 'default' PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "model_configs" (
	"provider" "model_provider" PRIMARY KEY NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"validated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
