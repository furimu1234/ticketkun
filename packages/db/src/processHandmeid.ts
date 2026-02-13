import z from 'zod';
import { discordMessageSchema } from './handmeid';

export const pushedButtonSchema = z.object({
	name: z.literal('button'),
	Id: z.string(),
	actionIndex: z.number().array(),
});

export const sendMessageSchema = z.object({
	name: z.literal('message'),
	message: discordMessageSchema,
});
export const openThreadSchema = z.object({
	name: z.literal('openThread'),
	target: z.literal('same').optional(),
	parent: z.string().array().optional(),
	ignore: z.string().array().default([]),
});

export const closeThreadSchema = z.object({
	name: z.literal('closeThread'),
	target: z.literal('same').optional(),
	parent: z.string().array().optional(),
	ignore: z.string().array().default([]),
});

export const ignoreMembersSchema = z.object({
	name: z.literal('ignoreMembers'),
	roles: z.string().max(19).array(),
	users: z.union([z.literal('creator'), z.string()]).array(),
});

export type PushedButton = z.infer<typeof pushedButtonSchema>;
export type SendMessageType = z.infer<typeof sendMessageSchema>;
export type IgnoreMembersType = z.infer<typeof ignoreMembersSchema>;
export type CloseThreadType = z.infer<typeof closeThreadSchema>;
export type OpenThreadType = z.infer<typeof openThreadSchema>;

export type ProcessType = Record<
	number,
	| PushedButton
	| SendMessageType
	| IgnoreMembersType
	| CloseThreadType
	| OpenThreadType
>;

export type CloseProcessStep =
	| PushedButton
	| SendMessageType
	| IgnoreMembersType
	| CloseThreadType
	| OpenThreadType;

export type CloseProcessType = CloseProcessStep[];
