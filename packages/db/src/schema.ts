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
import type { ProcessType } from './processHandmeid';

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
								customId: 'ticket_start',
								label: 'お問い合わせ作成',
								emoji: '<:ai_open_letter:1465990917373694126>',
								type: 'button',
								style: ButtonStyle.Success,
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
								customId: 'close',
								label: 'クローズ',
								emoji: '<:ai_chime:1465619293961195664>',
								type: 'button',
								style: ButtonStyle.Danger,
							},
						],
					],
				},
			}),

		process: jsonb('process')
			.notNull()
			.$type<ProcessType>()
			.default({
				1: { name: 'button', Id: 'close', actionIndex: [2] },
				2: {
					name: 'message',
					message: {
						content: 'クローズしますか？',
						rows: {
							version: 1,
							components: [
								[
									{
										type: 'button',
										customId: 'custom_exeClose',
										label: 'CLOSE',
										emoji: '<:ai_chime:1465619293961195664>',
										style: ButtonStyle.Danger,
									},
								],
							],
						},
					},
				},
				3: { name: 'button', Id: 'custom_exeClose', actionIndex: [4, 5, 6] },
				4: { name: 'ignoreMembers', roles: [], users: [] },
				5: { name: 'closeThread', ignore: [] },
				6: {
					name: 'message',
					message: {
						content: 'クローズしました!',
						rows: {
							version: 1,
							components: [
								[
									{
										type: 'button',
										label: '再OPEN',
										customId: 'custom_reopen',
										style: ButtonStyle.Success,
										emoji: '<:ai_open_letter:1465990917373694126>',
									},
								],
							],
						},
					},
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
