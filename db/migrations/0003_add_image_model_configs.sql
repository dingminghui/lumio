CREATE TABLE "image_model_configs" (
	"id" text PRIMARY KEY DEFAULT 'cloudflare-workers-ai' NOT NULL,
	"account_id" text NOT NULL,
	"api_token_encrypted" text NOT NULL,
	"model" text NOT NULL,
	"validated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
