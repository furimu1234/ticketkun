import type { DiscordMessageTemplate } from '@ticket/db';
import { resolveColor } from 'discord.js';

interface previewEmbedType {
	title: string;
	description: string;
	color: number | undefined;
	fields: { name: string; value: string; inline: boolean | undefined }[];
	footer: { text: string };
	author: { name: string };
}

interface previewType {
	content: string;
	embeds: previewEmbedType[];
}

export const createPreviewModel = (dbModel: DiscordMessageTemplate) => {
	const addMenu = (name: string, str?: string) => {
		return `\`[${name}] |\` ${typeof str === 'string' ? str : '空白'}`;
	};

	const model: previewType = {
		content: addMenu('付属文', dbModel.content),
		embeds: [],
	};

	if (dbModel.embeds) {
		model.embeds = dbModel.embeds.map((embed) => {
			return {
				title: addMenu('タイトル', embed.title),
				description: addMenu('本文', embed.description),
				color: resolveColor(embed.color ?? 'Blurple'),
				fields:
					embed.fields?.map((field) => {
						return {
							name: addMenu('フィールド名', field.name),
							value: addMenu('フィールド値', field.value),
							inline: field.inline ?? true,
						};
					}) ?? [],
				footer: {
					text: addMenu('フッター', embed.footer?.text),
				},
				author: {
					name: addMenu('ヘッダー', embed.author?.name),
				},
			};
		});
	}

	return model;
};
