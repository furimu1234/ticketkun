create schema build_example;

CREATE TABLE "build_example"."welcome_message" (
	"server_id" varchar(19) PRIMARY KEY NOT NULL,
	"message" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "welcome_message_server_id" ON "build_example"."welcome_message" USING btree ("server_id");