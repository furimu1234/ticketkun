import { ButtonStyle } from 'discord.js';
import {
	char,
	index,
	jsonb,
	pgTable,
	timestamp,
	uniqueIndex,
	varchar,
} from 'drizzle-orm/pg-core';
import type { DiscordMessageTemplate } from './handmeid';
import type { CloseProcessType } from './processHandmeid';

/**
 * 1: first(最初のみ)
 * 2: remind
 */
export type ClosePanelSendTimingType = '1' | '2';

export const ticketInfo = pgTable(
	'ticket_info',
	{
		serverId: varchar('server_id', { length: 19 }).notNull(),
		channelId: varchar('channel_id', { length: 19 }).notNull(),
		panelId: varchar('panel_id', { length: 19 }).primaryKey(),

		closePanelSendTiming: char('send_close_panel_timing', { length: 1 })
			.notNull()
			.default('1')
			.$type<ClosePanelSendTimingType>(),

		mainPanel: jsonb('main_panel')
			.$type<DiscordMessageTemplate>()
			.notNull()
			.default({
				content: '',
				embeds: [
					{
						description: 'トラブルやBOTの不具合を報告してください!',
					},
				],
				rows: {
					version: 1,
					components: [
						[
							{
								customId: 'ticket_start',
								label: 'お問い合わせ作成',
								emoji: '<:ai_open_letter:1465990917373694126>',
								type: 'button',
								style: ButtonStyle.Success,
								buttonName: 'お問い合わせ作成',
							},
						],
					],
				},
			}),

		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('ticket_info_panel_id_idx').on(table.panelId),
		uniqueIndex('ticket_info_panel_id_uniq').on(table.panelId), // 1対1を担保
	],
);

export const ticket = pgTable(
	'ticket',
	{
		panelId: varchar('panel_id', { length: 19 }).primaryKey(),
		firstMessages: jsonb('first_messages')
			.$type<DiscordMessageTemplate>()
			.notNull()
			.default({
				content: '[クローズ]ボタンを押してこのスレッドをクローズできます!',
				embeds: [
					{
						description: 'トラブルやBOTの不具合を報告してください!',
					},
				],
				rows: {
					version: 1,
					components: [
						[
							{
								customId: 'closeProcess:close:',
								label: 'クローズ',
								emoji: '<:ai_chime:1465642091978690766>',
								type: 'button',
								style: ButtonStyle.Danger,
								buttonName: 'クローズ',
							},
						],
					],
				},
			}),

		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index('close_panel_panel_id_idx').on(table.panelId)],
);

export const closeProcessOnButton = pgTable(
	'close_process_on_button',
	{
		//processName: text().notNull(),
		panelId: varchar('panel_id', { length: 19 }),
		//closeProcess:任意の文字列:panelId
		triggerCustomId: varchar('trigger_custom_id', { length: 100 })
			.notNull()
			.primaryKey(),
		process: jsonb('process').array().notNull().$type<CloseProcessType>(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index('close_process_panel_idx').on(table.panelId)],
);

export const userTicket = pgTable(
	'user_ticket',
	{
		ticketId: varchar('ticket_id', { length: 19 }).primaryKey(),
		creatorId: varchar('creator_id', { length: 19 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index('user_ticket_ticket_idx').on(table.ticketId)],
);
