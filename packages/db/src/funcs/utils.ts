// biome-ignore-all lint/suspicious/noExplicitAny: generated code uses any
import {
	ActionRowBuilder,
	type APIActionRowComponent,
	type APIChannelSelectComponent,
	type APIComponentInMessageActionRow,
	type APIContainerComponent,
	type APIFileComponent,
	type APIMediaGalleryComponent,
	type APIMessageComponentEmoji,
	type APIRoleSelectComponent,
	type APISectionComponent,
	type APISeparatorComponent,
	type APIStringSelectComponent,
	type APITextDisplayComponent,
	type APIThumbnailComponent,
	type APIUserSelectComponent,
	ButtonBuilder,
	type ButtonComponent,
	ChannelSelectMenuBuilder,
	ComponentType,
	ContainerBuilder,
	EmbedBuilder,
	FileBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	type Message,
	type MessageActionRowComponentBuilder,
	RoleSelectMenuBuilder,
	SectionBuilder,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	UserSelectMenuBuilder,
} from 'discord.js';
import type {
	DiscordMessageEmbedType,
	DiscordMessageRowType,
	DiscordMessageTemplate,
} from '../handmeid';

export const convertMessageOptionsFromDB = (
	dbModel: DiscordMessageTemplate,
) => {
	const obj: {
		content: string | undefined;
		embeds: EmbedBuilder[] | undefined;
		components:
			| ContainerBuilder[]
			| ActionRowBuilder<MessageActionRowComponentBuilder>[]
			| undefined;
	} = {
		content: undefined,
		embeds: undefined,
		components: undefined,
	};

	Object.keys(dbModel).forEach((key) => {
		if (key === 'content') {
			obj.content = dbModel.content;
		}
		if (key === 'embeds') {
			const embeds: EmbedBuilder[] = [];

			dbModel.embeds?.forEach((embedobj) => {
				embeds.push(buildEmbed(embedobj));
			});

			obj.embeds = embeds;
		}

		if (key === 'rows' && dbModel.rows)
			obj.components = buildComponent(dbModel.rows);
	});

	return obj;
};

const buildEmbed = (obj: DiscordMessageEmbedType) => {
	const embed = new EmbedBuilder();

	if (obj.title) {
		embed.setTitle(obj.title);
	}

	if (obj.description) embed.setDescription(obj.description);
	if (obj.color) embed.setColor(obj.color);
	if (obj.fields && obj.fields.length > 0) {
		embed.setFields(obj.fields);
	}

	if (obj.footer) embed.setFooter(obj.footer);
	if (obj.author) embed.setAuthor(obj.author);
	if (!!obj.image && obj.image.url) embed.setImage(obj.image.url);
	if (!!obj.thumbnail && obj.thumbnail.url)
		embed.setThumbnail(obj.thumbnail.url);
	return embed;
};

const buildComponentV1 = (
	obj: DiscordMessageRowType,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] => {
	const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
	if (obj.version === 1) {
		let columns: MessageActionRowComponentBuilder[] = [];

		obj.components.forEach((v1rows) => {
			v1rows.forEach((v1row) => {
				if (v1row.type === 'button') {
					const button = new ButtonBuilder();
					button.setCustomId(v1row.customId);
					button.setLabel(v1row.label);
					button.setStyle(v1row.style);

					if (v1row.emoji) {
						button.setEmoji(v1row.emoji);
					}

					if (v1row.disabled) {
						button.setDisabled(v1row.disabled);
					}

					columns.push(button);
				} else if (v1row.type === 'stringSelect') {
					const component = new StringSelectMenuBuilder();
					component.setCustomId(v1row.customId);
					component.setOptions(v1row.options);
					component.setMaxValues(v1row.maxValues);
					component.setMinValues(v1row.minValues);

					if (v1row.placeholder) component.setPlaceholder(v1row.placeholder);
					if (v1row.required) component.setRequired(v1row.required);
					if (v1row.disabled) component.setDisabled(v1row.disabled);
					columns.push(component);
				} else if (v1row.type === 'discordSelect') {
					if (v1row.subType === 'user') {
						const component = new UserSelectMenuBuilder();
						component.setCustomId(v1row.customId);
						component.setDefaultUsers(v1row.defaultValues);
						component.setMaxValues(v1row.maxValues);
						component.setMinValues(v1row.minValues);

						if (v1row.placeholder) component.setPlaceholder(v1row.placeholder);
						if (v1row.required) component.setRequired(v1row.required);
						if (v1row.disabled) component.setDisabled(v1row.disabled);

						columns.push(component);
					} else if (v1row.subType === 'channel') {
						const component = new ChannelSelectMenuBuilder();
						component.setCustomId(v1row.customId);
						component.setDefaultChannels(v1row.defaultValues);
						component.setMaxValues(v1row.maxValues);
						component.setMinValues(v1row.minValues);

						if (v1row.placeholder) component.setPlaceholder(v1row.placeholder);
						if (v1row.required) component.setRequired(v1row.required);
						if (v1row.disabled) component.setDisabled(v1row.disabled);

						columns.push(component);
					} else if (v1row.subType === 'role') {
						const component = new RoleSelectMenuBuilder();
						component.setCustomId(v1row.customId);
						component.setDefaultRoles(v1row.defaultValues);
						component.setMaxValues(v1row.maxValues);
						component.setMinValues(v1row.minValues);

						if (v1row.placeholder) component.setPlaceholder(v1row.placeholder);
						if (v1row.required) component.setRequired(v1row.required);
						if (v1row.disabled) component.setDisabled(v1row.disabled);
						columns.push(component);
					}
				}

				if (columns.length === 5) {
					const row =
						new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
							columns,
						);

					rows.push(row);
					columns = [];
				}
			});

			const row =
				new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
					columns,
				);

			rows.push(row);
			columns = [];
		});
	}

	return rows;
};

const buildComponentV2 = (obj: DiscordMessageRowType): ContainerBuilder => {
	const container = new ContainerBuilder();
	if (obj.version === 2) {
		obj.components.forEach((v2obj) => {
			if (v2obj.type === 'section') {
				const sectionBuilder = new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder({ content: v2obj.textDisplay.content }),
				);

				if (v2obj.accessory.type === 'button') {
					const button = new ButtonBuilder();
					button.setCustomId(v2obj.accessory.customId);
					button.setLabel(v2obj.accessory.label);
					button.setStyle(v2obj.accessory.style);

					if (v2obj.accessory.emoji) {
						button.setEmoji(v2obj.accessory.emoji);
					}

					if (v2obj.accessory.disabled) {
						button.setDisabled(v2obj.accessory.disabled);
					}

					sectionBuilder.setButtonAccessory(button);
				} else if (
					v2obj.accessory.type === 'thumbnail' &&
					v2obj.accessory.media
				) {
					if (v2obj.accessory.media?.url !== undefined) {
						const url = v2obj.accessory.media.url ?? 'https://discord.com';

						const mediaBuilder = new ThumbnailBuilder({
							media: { url: url },
						});
						mediaBuilder.setSpoiler(v2obj.accessory.spoiler);

						sectionBuilder.setThumbnailAccessory(mediaBuilder);
					}
				}

				container.addSectionComponents(sectionBuilder);
			} else if (v2obj.type === 'textDisplay') {
				container.addTextDisplayComponents(
					new TextDisplayBuilder({ content: v2obj.content }),
				);
			} else if (v2obj.type === 'file') {
				const file = new FileBuilder();
				file.setSpoiler(v2obj.spoiler);

				if (v2obj.file && !!v2obj.file.url) file.setURL(v2obj.file.url);

				container.addFileComponents(file);
			} else if (v2obj.type === 'separator') {
				const separator = new SeparatorBuilder();
				separator.setDivider(v2obj.divider);

				if (v2obj.spacing) separator.setSpacing(v2obj.spacing);
				container.addSeparatorComponents(separator);
			} else if (v2obj.type === 'mediaGallery') {
				const media = new MediaGalleryBuilder();
				const itemBuilders = v2obj.items.flatMap((item) => {
					if (item.media?.url)
						return [
							new MediaGalleryItemBuilder({
								media: { url: item.media?.url ?? 'https://dicord.com' },
							}),
						];

					return [];
				});

				media.addItems(itemBuilders);
			} else if (v2obj.type === 'row') {
				container.addActionRowComponents(buildComponentV1(v2obj.rows));
			}
		});
	}

	return container;
};

const buildComponent = (
	obj: DiscordMessageRowType,
):
	| ContainerBuilder[]
	| ActionRowBuilder<MessageActionRowComponentBuilder>[] => {
	if (obj.version === 1) {
		return buildComponentV1(obj);
	} else {
		return [buildComponentV2(obj)];
	}
};

// From Discord

/**
 * Discordの絵文字オブジェクト(APIMessageComponentEmoji) → DB保存用の string
 * - Unicode絵文字: emoji.name（例: "😀"）
 * - カスタム絵文字: <a:name:id> / <:name:id>
 */
function emojiToString(
	emoji: APIMessageComponentEmoji | null | undefined,
): string | undefined {
	if (!emoji) return undefined;
	if (emoji.id) {
		const prefix = emoji.animated ? 'a' : '';
		const name = emoji.name ?? 'emoji';
		return `<${prefix}:${name}:${emoji.id}>`;
	}
	// Unicode絵文字は name に入る（通常）
	return emoji.name ?? undefined;
}

function embedToDB(embed: any): DiscordMessageEmbedType {
	// discord.js Embed は toJSON() で APIEmbed 相当を得られる
	const e = typeof embed?.toJSON === 'function' ? embed.toJSON() : embed;

	return {
		title: e.title ?? undefined,
		description: e.description ?? undefined,
		color: e.color ?? undefined,
		fields:
			Array.isArray(e.fields) && e.fields.length
				? e.fields.map((f: any) => ({
						name: f.name,
						value: f.value,
						inline: f.inline ?? undefined,
					}))
				: undefined,
		footer: e.footer
			? {
					text: e.footer.text,
					icon_url: e.footer.icon_url ?? undefined,
				}
			: undefined,
		author: e.author
			? {
					name: e.author.name,
					icon_url: e.author.icon_url ?? undefined,
				}
			: undefined,
		image: e.image?.url ? { url: e.image.url } : undefined,
		thumbnail: e.thumbnail?.url ? { url: e.thumbnail.url } : undefined,
		video: e.video?.url ? { url: e.video.url } : undefined,
	};
}

/**
 * ActionRow(API) → v1 row items(あなたの union) に変換
 */
function actionRowToV1RowItems(row: any) {
	// ActionRow の JSON はこれ
	const r = (
		typeof row?.toJSON === 'function' ? row.toJSON() : row
	) as APIActionRowComponent<APIComponentInMessageActionRow>;

	// 行の中身は APIMessageActionRowComponent[] であるべき
	const components = (r.components ?? []) as APIComponentInMessageActionRow[];

	return components
		.map((c) => {
			switch (c.type) {
				case ComponentType.Button: {
					const b = c as ButtonComponent;
					return {
						type: 'button' as const,
						style: b.style,
						label: b.label ?? '',
						customId: b.customId ?? '',
						url: b.url ?? undefined,
						emoji: emojiToString(
							b.emoji as APIMessageComponentEmoji | undefined,
						),
						disabled: b.disabled ?? undefined,
					};
				}

				case ComponentType.StringSelect: {
					const s = c as APIStringSelectComponent;
					const minValues = s.min_values ?? 0;
					return {
						type: 'stringSelect' as const,
						customId: s.custom_id ?? '',
						options: (s.options ?? []).map((o) => ({
							label: o.label,
							value: o.value,
							description: o.description ?? undefined,
							emoji:
								(o.emoji as APIMessageComponentEmoji | undefined) ?? undefined,
							default: o.default ?? undefined,
						})),
						placeholder: s.placeholder ?? undefined,
						minValues,
						maxValues: s.max_values ?? 1,
						required: minValues >= 1 ? true : undefined,
						disabled: s.disabled ?? undefined,
					};
				}

				case ComponentType.UserSelect: {
					const s = c as APIUserSelectComponent;
					const minValues = s.min_values ?? 0;
					const defaultValues = (s.default_values ?? [])
						.filter((dv) => dv.type === 'user')
						.map((dv) => dv.id);

					return {
						type: 'discordSelect' as const,
						subType: 'user' as const,
						customId: s.custom_id ?? '',
						defaultValues,
						placeholder: s.placeholder ?? undefined,
						minValues,
						maxValues: s.max_values ?? 1,
						required: minValues >= 1 ? true : undefined,
						disabled: s.disabled ?? undefined,
					};
				}

				case ComponentType.ChannelSelect: {
					const s = c as APIChannelSelectComponent;
					const minValues = s.min_values ?? 0;
					const defaultValues = (s.default_values ?? [])
						.filter((dv) => dv.type === 'channel')
						.map((dv) => dv.id);

					return {
						type: 'discordSelect' as const,
						subType: 'channel' as const,
						customId: s.custom_id ?? '',
						defaultValues,
						placeholder: s.placeholder ?? undefined,
						minValues,
						maxValues: s.max_values ?? 1,
						required: minValues >= 1 ? true : undefined,
						disabled: s.disabled ?? undefined,
					};
				}

				case ComponentType.RoleSelect: {
					const s = c as APIRoleSelectComponent;
					const minValues = s.min_values ?? 0;
					const defaultValues = (s.default_values ?? [])
						.filter((dv) => dv.type === 'role')
						.map((dv) => dv.id);

					return {
						type: 'discordSelect' as const,
						subType: 'role' as const,
						customId: s.custom_id ?? '',
						defaultValues,
						placeholder: s.placeholder ?? undefined,
						minValues,
						maxValues: s.max_values ?? 1,
						required: minValues >= 1 ? true : undefined,
						disabled: s.disabled ?? undefined,
					};
				}

				default:
					return null;
			}
		})
		.filter(Boolean);
}
/**
 * message.components (ActionRow) → rows(v1)
 */
function messageComponentsToV1(message: Message): DiscordMessageRowType {
	// message.components は ActionRow の配列
	const rows = (message.components ?? []).map((row) =>
		actionRowToV1RowItems(row),
	);

	// あなたのスキーマは components: array<array<...>> なので、そのまま入れる
	return {
		version: 1 as const,
		components: rows as any,
	};
}

/**
 * Container(V2) 内部コンポーネント(API) → handmeid の v2 component union に変換
 */
function containerToV2(container: any) {
	const c =
		typeof container?.toJSON === 'function' ? container.toJSON() : container;
	const api = c as APIContainerComponent;

	const out: any[] = [];

	for (const child of api.components ?? []) {
		switch (child.type) {
			case ComponentType.Section: {
				const sec = child as APISectionComponent;

				// TextDisplay は本来複数持てるが、あなたのスキーマは1つだけなので先頭を採用
				const firstText = (sec.components ?? []).find(
					(x) => x.type === ComponentType.TextDisplay,
				) as APITextDisplayComponent | undefined;

				const accessory = sec.accessory;

				if (!firstText || !accessory) break;

				// 文字数制限(あなたのスキーマ max100)に合わせて安全に短縮
				const content = (firstText.content ?? '').slice(0, 100);

				if (accessory.type === ComponentType.Button) {
					const b = accessory as ButtonComponent;
					out.push({
						type: 'section',
						textDisplay: { type: 'textDisplay', content },
						accessory: {
							type: 'button',
							style: b.style,
							label: b.label ?? '',
							emoji: emojiToString(
								b.emoji as APIMessageComponentEmoji | undefined,
							),
							customId: b.customId ?? '',
							url: b.url ?? undefined,
							disabled: b.disabled ?? undefined,
						},
					});
				} else if (accessory.type === ComponentType.Thumbnail) {
					const t = accessory as APIThumbnailComponent;
					out.push({
						type: 'section',
						textDisplay: { type: 'textDisplay', content },
						accessory: {
							type: 'thumbnail',
							media: t.media?.url ? { url: t.media.url } : undefined,
							spoiler: t.spoiler ?? undefined,
						},
					});
				}
				break;
			}

			case ComponentType.TextDisplay: {
				const td = child as APITextDisplayComponent;
				out.push({
					type: 'textDisplay',
					content: (td.content ?? '').slice(0, 100),
				});
				break;
			}

			case ComponentType.MediaGallery: {
				const mg = child as APIMediaGalleryComponent;
				out.push({
					type: 'mediaGallery',
					items: (mg.items ?? []).map((it) => ({
						media: it.media?.url ? { url: it.media.url } : undefined,
						description: (it.description ?? '').slice(0, 1024),
						spoiler: it.spoiler ?? undefined,
					})),
				});
				break;
			}

			case ComponentType.File: {
				const f = child as APIFileComponent;
				out.push({
					type: 'file',
					file: f.file?.url ? { url: f.file.url } : undefined,
					spoiler: f.spoiler ?? undefined,
					name: new Date().toTimeString(),
				});
				break;
			}

			case ComponentType.Separator: {
				const s = child as APISeparatorComponent;
				out.push({
					type: 'separator',
					divider: s.divider ?? undefined,
					spacing: s.spacing ?? undefined,
				});
				break;
			}

			case ComponentType.ActionRow: {
				// V2コンテナ内の ActionRow は「row」ラッパーで保持し、rows に v1 を入れる
				const v1 = {
					version: 1 as const,
					components: [actionRowToV1RowItems(child)] as any,
				};

				out.push({
					type: 'row',
					rows: v1,
				});
				break;
			}

			default:
				// 未対応のタイプは落とす
				break;
		}
	}

	return out;
}

/**
 * message.components → rows(v2)
 */
function messageComponentsToV2(message: Message): DiscordMessageRowType {
	const top = (message.components ?? []).map((x) =>
		typeof x?.toJSON === 'function' ? x.toJSON() : x,
	);

	// top-level に Container がある前提で v2 化
	const containers = top.filter(
		(c: any) => c.type === ComponentType.Container,
	) as APIContainerComponent[];

	const v2Components: any[] = [];
	for (const c of containers) {
		// container そのものは handmeid では表現してないので、
		// 「container 内の子要素」をフラットに v2.components に並べる設計にしています。
		// （handmeid の v2 schema は container の入れ子を持たないため）
		v2Components.push(...containerToV2(c));
	}

	// もし container が無いのに v2 に来た場合は空配列
	return {
		version: 2 as const,
		components: v2Components,
	};
}

function detectRowsVersion(message: Message): 1 | 2 {
	const top = message.components ?? [];
	const hasContainer = top.some(
		(c: any) => (c.type ?? c?.toJSON?.().type) === ComponentType.Container,
	);
	return hasContainer ? 2 : 1;
}

/**
 * これが本体：Discord Message → DB template
 */
export function convertTemplateFromDiscordMessage(
	message: Message,
): DiscordMessageTemplate {
	const template: DiscordMessageTemplate = {};

	// content
	if (message.content?.length) template.content = message.content;

	// embeds
	if (message.embeds?.length) {
		template.embeds = message.embeds.map((e) => embedToDB(e));
	}

	// rows/components
	if (message.components?.length) {
		const v = detectRowsVersion(message);
		template.rows =
			v === 1 ? messageComponentsToV1(message) : messageComponentsToV2(message);
	}

	return template;
}
