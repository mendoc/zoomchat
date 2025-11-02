CREATE TABLE "bot_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"response_message_id" bigint,
	"response_text" text,
	"response_type" varchar(50) NOT NULL,
	"search_results_count" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" integer NOT NULL,
	"chat_id" bigint NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"interaction_type" varchar(50) NOT NULL,
	"message_id" bigint,
	"message_text" text,
	"command_name" varchar(50),
	"callback_data" varchar(100),
	"search_query" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_annonces_search_vector";--> statement-breakpoint
ALTER TABLE "annonces" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
ALTER TABLE "bot_responses" ADD CONSTRAINT "bot_responses_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bot_responses_conversation_id" ON "bot_responses" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_bot_responses_chat_id" ON "bot_responses" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_bot_responses_created_at" ON "bot_responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_bot_responses_response_type" ON "bot_responses" USING btree ("response_type");--> statement-breakpoint
CREATE INDEX "idx_conversations_chat_id" ON "conversations" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_subscriber_id" ON "conversations" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_session_id" ON "conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_created_at" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_interaction_type" ON "conversations" USING btree ("interaction_type");--> statement-breakpoint
ALTER TABLE "annonces" DROP COLUMN "search_vector";