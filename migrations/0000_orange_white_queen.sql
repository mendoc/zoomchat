CREATE TABLE "annonces" (
	"id" serial PRIMARY KEY NOT NULL,
	"parution_id" integer NOT NULL,
	"category" text,
	"subcategory" text,
	"title" text,
	"reference" text,
	"description" text,
	"contact" text,
	"price" text,
	"location" text,
	"embedding" vector(768),
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "annonces_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "envois" (
	"id" serial PRIMARY KEY NOT NULL,
	"parution_id" integer,
	"subscriber_id" integer,
	"statut" varchar(20) NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"nom" text NOT NULL,
	"telephone" text,
	"date_abonnement" timestamp with time zone DEFAULT now(),
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "subscribers_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "parutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" varchar(10) NOT NULL,
	"periode" text,
	"pdf_url" text,
	"telegram_file_id" text,
	"date_parution" date,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "parutions_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
ALTER TABLE "annonces" ADD CONSTRAINT "annonces_parution_id_parutions_id_fk" FOREIGN KEY ("parution_id") REFERENCES "public"."parutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envois" ADD CONSTRAINT "envois_parution_id_parutions_id_fk" FOREIGN KEY ("parution_id") REFERENCES "public"."parutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envois" ADD CONSTRAINT "envois_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_annonces_search_vector" ON "annonces" USING btree ("search_vector");