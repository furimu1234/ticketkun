import { DISCORD_MESSAGE_LIMITS } from '@ticket/lib';
import {
	type APIMessageComponentEmoji,
	type ColorResolvable,
	resolveColor,
} from 'discord.js';
import { z } from 'zod';

export const colorResolvableSchema = z.custom<ColorResolvable>(
	(val) => {
		try {
			resolveColor(val as unknown as ColorResolvable);
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'Invalid ColorResolvable' },
);

export const emojiResolvableSchema = z.custom<APIMessageComponentEmoji>(
	(val) => {
		try {
			val as unknown as APIMessageComponentEmoji;
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'Invalid ColorResolvable' },
);

export const discordMessageEmbedFieldShema = z.object({
	name: z.string().max(DISCORD_MESSAGE_LIMITS.fieldName),
	value: z.string().max(DISCORD_MESSAGE_LIMITS.fieldValue),
	inline: z.boolean().optional(),
});

export type DiscordMessageEmbedFieldType = z.infer<
	typeof discordMessageEmbedFieldShema
>;

export const discordMessageEmbedFooterSchema = z
	.object({
		text: z.string().max(DISCORD_MESSAGE_LIMITS.footerText),
		icon_url: z.url().optional(),
	})
	.optional();

export const discordMessageEmbedAuthorSchema = z
	.object({
		name: z.string().max(DISCORD_MESSAGE_LIMITS.authorName),
		icon_url: z.url().optional(),
	})
	.optional();

export const discordMessageEmbedAttachSchema = z
	.object({
		url: z.url().optional(),
	})
	.optional();

export const discordMessageEmbedSchema = z.object({
	title: z.string().max(DISCORD_MESSAGE_LIMITS.title).optional(),
	description: z.string().max(DISCORD_MESSAGE_LIMITS.description).optional(),
	color: colorResolvableSchema.optional().default('Blurple').optional(),
	fields: z
		.array(discordMessageEmbedFieldShema)
		.max(DISCORD_MESSAGE_LIMITS.fields)
		.optional(),
	footer: discordMessageEmbedFooterSchema,
	author: discordMessageEmbedAuthorSchema,
	image: discordMessageEmbedAttachSchema,
	thumbnail: discordMessageEmbedAttachSchema,
	video: discordMessageEmbedAttachSchema,
});

export type DiscordMessageEmbedType = z.infer<typeof discordMessageEmbedSchema>;

export const discordMessageButtonRowSchema = z.object({
	type: z.literal('button'),
	style: z.union([
		z.literal(1),
		z.literal(2),
		z.literal(3),
		z.literal(4),
		z.literal(5),
	]),
	label: z.string().max(DISCORD_MESSAGE_LIMITS.buttonLabel),
	emoji: z.string().optional(),
	customId: z.string().max(DISCORD_MESSAGE_LIMITS.buttonCustomId).min(1),
	url: z.string().max(DISCORD_MESSAGE_LIMITS.buttonUrl).optional(),
	disabled: z.boolean().optional(),
});

export const discordMessageSelectOptionSchema = z.object({
	label: z.string().max(DISCORD_MESSAGE_LIMITS.buttonLabel),
	value: z.string().max(DISCORD_MESSAGE_LIMITS.buttonLabel),
	description: z
		.string()
		.max(DISCORD_MESSAGE_LIMITS.selectDescription)
		.optional(),
	emoji: emojiResolvableSchema.optional(),
	//このオプションをdefaultとして設定するか
	default: z.boolean().optional(),
});

//StringSelect Schema
export const discordMessageStringSelectRowSchema = z.object({
	type: z.literal('stringSelect'),
	customId: z.string().max(DISCORD_MESSAGE_LIMITS.buttonCustomId).min(1),
	options: z
		.array(discordMessageSelectOptionSchema)
		.max(DISCORD_MESSAGE_LIMITS.selectOptions),
	placeholder: z
		.string()
		.max(DISCORD_MESSAGE_LIMITS.selectPlaceholder)
		.optional(),
	minValues: z.number().min(0).max(DISCORD_MESSAGE_LIMITS.selectminValues),
	maxValues: z.number().min(0).max(DISCORD_MESSAGE_LIMITS.selectmaxValues),
	required: z.boolean().optional(),
	disabled: z.boolean().optional(),
});

//discordObjSelect Schema
export const discordMessagediscordObjSelectRowSchema = z.object({
	type: z.literal('discordSelect'),
	subType: z.union([
		z.literal('user'),
		z.literal('channel'),
		z.literal('role'),
	]),
	customId: z.string().max(DISCORD_MESSAGE_LIMITS.buttonCustomId).min(1),
	defaultValues: z.array(z.string()),
	placeholder: z
		.string()
		.max(DISCORD_MESSAGE_LIMITS.selectPlaceholder)
		.optional(),
	minValues: z.number().min(0).max(DISCORD_MESSAGE_LIMITS.selectminValues),
	maxValues: z.number().min(0).max(DISCORD_MESSAGE_LIMITS.selectmaxValues),
	required: z.boolean().optional(),
	disabled: z.boolean().optional(),
});

export const discordMessageRowv1Schema = z.object({
	version: z.literal(1),
	components: z
		.array(
			z
				.array(
					z.union([
						discordMessageButtonRowSchema,
						discordMessageStringSelectRowSchema,
						discordMessagediscordObjSelectRowSchema,
					]),
				)
				.max(5),
		)
		.max(5),
});

export const discordMessageTextDisplaySchema = z.object({
	type: z.literal('textDisplay'),
	content: z.string().max(DISCORD_MESSAGE_LIMITS.textDisplay),
});

export const discordMessageThumbnailSchema = z.object({
	type: z.literal('thumbnail'),
	media: discordMessageEmbedAttachSchema,
	spoiler: z.boolean().optional(),
});

export const discordMessageMediaGallerySchema = z.object({
	type: z.literal('mediaGallery'),
	items: z.array(
		z.object({
			media: discordMessageEmbedAttachSchema,
			description: z
				.string()
				.max(DISCORD_MESSAGE_LIMITS.mediaGalleryDescription),
			spoiler: z.boolean().optional(),
		}),
	),
});

export const discordMessageFileSchema = z.object({
	type: z.literal('file'),
	file: discordMessageEmbedAttachSchema,
	spoiler: z.boolean().optional(),
	name: z.string().max(DISCORD_MESSAGE_LIMITS.fileName).optional(),
	size: z.number().optional(),
});

export const discordMessageSeparatorSchema = z.object({
	type: z.literal('separator'),
	divider: z.boolean().optional(),
	spacing: z.union([z.literal(1), z.literal(2)]).optional(),
});

export const discordMessageSectionSchema = z.object({
	type: z.literal('section'),
	textDisplay: discordMessageTextDisplaySchema,
	accessory: z.union([
		discordMessageButtonRowSchema,
		discordMessageThumbnailSchema,
	]),
});

export const discordMessageRowV2Schema = z.object({
	version: z.literal(2),
	components: z.array(
		z.union([
			discordMessageSectionSchema,
			discordMessageTextDisplaySchema,
			discordMessageMediaGallerySchema,
			discordMessageFileSchema,
			discordMessageSeparatorSchema,
			z.object({ type: z.literal('row'), rows: discordMessageRowv1Schema }),
		]),
	),
});

export const discordMessageRowSchema = z.union([
	discordMessageRowv1Schema,
	discordMessageRowV2Schema,
]);

export type DiscordMessageRowType = z.infer<typeof discordMessageRowSchema>;

export const discordMessageSchema = z.object({
	content: z.string().max(2000).optional(),
	embeds: discordMessageEmbedSchema.array().max(10).optional(),
	rows: discordMessageRowSchema.optional(),
});

export type DiscordMessageTemplate = z.infer<typeof discordMessageSchema>;

// export type DiscordMessageTemplate = {
// 	content?: string;
// 	embeds?: DiscordMessageEmbedType[];
// 	rows?: DiscordMessageRowType;
// };
