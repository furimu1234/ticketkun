CREATE TABLE "ticket" (
	"panel_id" varchar(19) PRIMARY KEY NOT NULL,
	"first_messages" jsonb DEFAULT '{"content":"[クローズ]ボタンを押してこのスレッドをクローズできます!","embeds":[{"description":"トラブルやBOTの不具合を報告してください!"}],"rows":{"version":1,"components":[[{"customId":"close","label":"クローズ","emoji":"<:ai_chime:1465619293961195664>","type":"button","style":4}]]}}'::jsonb NOT NULL,
	"process" jsonb DEFAULT '{"1":{"name":"button","Id":"close","actionIndex":[2]},"2":{"name":"message","message":{"content":"クローズしますか？","rows":{"version":1,"components":[[{"type":"button","customId":"custom_exeClose","label":"CLOSE","emoji":"<:ai_chime:1465619293961195664>","style":4}]]}}},"3":{"name":"button","Id":"custom_exeClose","actionIndex":[4,5,6]},"4":{"name":"ignoreMembers","roles":[],"users":[]},"5":{"name":"closeThread","ignore":[]},"6":{"name":"message","message":{"content":"クローズしました!","rows":{"version":1,"components":[[{"type":"button","label":"再OPEN","customId":"custom_reopen","style":3,"emoji":"<:ai_open_letter:1465990917373694126>"}]]}}}}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_info" (
	"server_id" varchar(19) NOT NULL,
	"channel_id" varchar(19) NOT NULL,
	"panel_id" varchar(19) PRIMARY KEY NOT NULL,
	"send_close_panel_timing" char(1) DEFAULT '1' NOT NULL,
	"main_panel" jsonb DEFAULT '{"content":"[クローズ]ボタンを押してこのスレッドをクローズできます!","embeds":[{"description":"トラブルやBOTの不具合を報告してください!"}],"rows":{"version":1,"components":[[{"customId":"ticket_start","label":"お問い合わせ作成","emoji":"<:ai_open_letter:1465990917373694126>","type":"button","style":3}]]}}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "close_panel_panel_id_idx" ON "ticket" USING btree ("panel_id");--> statement-breakpoint
CREATE INDEX "ticket_info_panel_id_idx" ON "ticket_info" USING btree ("panel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_info_panel_id_uniq" ON "ticket_info" USING btree ("panel_id");