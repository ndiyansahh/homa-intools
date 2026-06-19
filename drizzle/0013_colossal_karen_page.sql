CREATE TABLE "bot_user_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'reporter' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "bot_user_db_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" varchar(20) NOT NULL,
	"reported_by_chat_id" varchar(50) NOT NULL,
	"reported_by_name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"invoice_id" varchar(100),
	"customer_name" varchar(255),
	"mitra_name" varchar(255),
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'Open' NOT NULL,
	"estimated_duration" varchar(50),
	"fix_notes" text,
	"resolved_at" timestamp with time zone,
	"time_to_fix" numeric(8, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ticket_db_ticket_number_unique" UNIQUE("ticket_number")
);
