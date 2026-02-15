CREATE TABLE "close_process_on_button" (
	"panel_id" varchar(19),
	"trigger_custom_id" varchar(100) PRIMARY KEY NOT NULL,
	"process" jsonb[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"panel_id" varchar(19) PRIMARY KEY NOT NULL,
	"first_messages" jsonb DEFAULT '{"content":"[クローズ]ボタンを押してこのスレッドをクローズできます!","embeds":[{"description":"トラブルやBOTの不具合を報告してください!"}],"rows":{"version":1,"components":[[{"customId":"closeProcess:close:","label":"クローズ","emoji":"<:ai_chime:1465642091978690766>","type":"button","style":4,"buttonName":"クローズ"}]]}}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_info" (
	"server_id" varchar(19) NOT NULL,
	"channel_id" varchar(19) NOT NULL,
	"panel_id" varchar(19) PRIMARY KEY NOT NULL,
	"send_close_panel_timing" char(1) DEFAULT '1' NOT NULL,
	"main_panel" jsonb DEFAULT '{"content":"","embeds":[{"description":"トラブルやBOTの不具合を報告してください!"}],"rows":{"version":1,"components":[[{"customId":"ticket_start","label":"お問い合わせ作成","emoji":"<:ai_open_letter:1465990917373694126>","type":"button","style":3,"buttonName":"お問い合わせ作成"}]]}}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ticket" (
	"ticket_id" varchar(19) PRIMARY KEY NOT NULL,
	"creator_id" varchar(19) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "close_process_panel_idx" ON "close_process_on_button" USING btree ("panel_id");--> statement-breakpoint
CREATE INDEX "close_panel_panel_id_idx" ON "ticket" USING btree ("panel_id");--> statement-breakpoint
CREATE INDEX "ticket_info_panel_id_idx" ON "ticket_info" USING btree ("panel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_info_panel_id_uniq" ON "ticket_info" USING btree ("panel_id");--> statement-breakpoint
CREATE INDEX "user_ticket_ticket_idx" ON "user_ticket" USING btree ("ticket_id");