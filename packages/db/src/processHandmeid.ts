import z from 'zod';
import { discordMessageSchema } from './handmeid';

// TODO: 何に使うのか忘れた
export const pushedButtonSchema = z.object({
	name: z.literal('button'),
	Id: z.string(),
	actionIndex: z.number().array(),
});

// 	メッセージを送信する
export const sendMessageSchema = z.object({
	name: z.literal('message'),
	message: discordMessageSchema,
});

// 直前の処理で送信されたメッセージを削除する
export const lastMessageDeleteSchema = z.object({
	name: z.literal('lastMessageDelete'),
	delay: z.number(),
});

// スレッドをオープンする
export const openThreadSchema = z.object({
	name: z.literal('openThread'),
	target: z.union([z.literal('same'), z.string()]).optional(),
	includeCreator: z.boolean(),
});

// スレッドをクローズする
export const closeThreadSchema = z.object({
	name: z.literal('closeThread'),
	target: z.union([z.literal('same'), z.string()]).optional(),
});
//スレッド削除
export const threadDeleteSchema = z.object({
	name: z.literal('threadDelete'),
	target: z.union([z.literal('same'), z.string()]).optional(),
});

// 除外メンバーを設定
export const ignoreMembersSchema = z.object({
	name: z.literal('ignoreMembers'),
	roles: z.string().max(19).array(),
	users: z.union([z.literal('creator'), z.string().max(19)]).array(),
});
// 含めるメンバーを設定
export const includeMembersSchema = z.object({
	name: z.literal('includeMembers'),
	roles: z.string().max(19).array(),
	users: z.union([z.literal('creator'), z.string().max(19)]).array(),
});

export type PushedButton = z.infer<typeof pushedButtonSchema>;
export type SendMessageType = z.infer<typeof sendMessageSchema>;
export type LastMessageDelete = z.infer<typeof lastMessageDeleteSchema>;
export type IgnoreMembersType = z.infer<typeof ignoreMembersSchema>;
export type IncludeMembersType = z.infer<typeof includeMembersSchema>;
export type CloseThreadType = z.infer<typeof closeThreadSchema>;
export type OpenThreadType = z.infer<typeof openThreadSchema>;
export type ThreadDeleteType = z.infer<typeof threadDeleteSchema>;

export type CloseProcessStep =
	| PushedButton
	| SendMessageType
	| IncludeMembersType
	| IgnoreMembersType
	| CloseThreadType
	| OpenThreadType
	| ThreadDeleteType
	| LastMessageDelete;

export type ProcessType = Record<number, CloseProcessStep>;

export type CloseProcessType = CloseProcessStep[];
