import {
	convertMessageOptionsFromDB,
	createTicketInfo,
	getTicketInfo,
} from '@ticket/db';
import type { DiscordMessageTemplate } from '@ticket/db/dist/handmeid';
import { messageID, SendError } from '@ticket/lib';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	type ChatInputCommandInteraction,
	ContainerBuilder,
	MessageFlags,
	resolveColor,
	type SendableChannels,
	SlashCommandBuilder,
	SlashCommandChannelOption,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
} from 'discord.js';
import {
	addSectionWithButtonBuilder,
	addSeparatorBuilder,
	addTextDisplayBuilder,
} from '../components/shared';
import { container } from '../container';
import { editPanelStore } from '../utils';
export const data = new SlashCommandBuilder()
	.setName('お問い合わせ作成')
	.setDescription('お問い合わせパネルを作成します');

data.addChannelOption(
	new SlashCommandChannelOption()
		.addChannelTypes(ChannelType.GuildText)
		.setName('パネル作成チャンネル')
		.setDescription('パネルを作成するチャンネルを指定してください')
		.setRequired(true),
);

export async function execute(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply();

	const store = container.getDataStore();

	const guild = interaction.guild;

	if (!guild) return;

	const targetChannelId = interaction.options.getChannel(
		'パネル作成チャンネル',
	)?.id;

	const targetChannel = guild.channels.cache
		.filter((x) => x.type === ChannelType.GuildText)
		.get(targetChannelId ?? '');

	if (!targetChannel?.isSendable()) return;

	let panel = await targetChannel.send({
		content: 'ここにパネルを作成する',
	});

	const model = await store.do(async (db) => {
		await createTicketInfo(db, {
			channelId: panel.channelId,
			panelId: panel.id,
			serverId: guild.id,
		});

		const model = await getTicketInfo(db, panel.id);
		if (!model) throw new SendError(messageID.E00001());

		const fromDBMessageOptions = convertMessageOptionsFromDB(model.mainPanel);
		panel = await panel.edit(fromDBMessageOptions);

		return model;
	});

	await interaction.followUp({
		content: 'お問い合わせパネルを作成しました',
	});

	if (!interaction.channel?.isSendable()) return;

	await makeEditMainPanel(model, interaction.channel, true);
}

export const makeEditClosePanel = async (
	model: Awaited<ReturnType<typeof getTicketInfo>>,
	editChannel: SendableChannels,
	forceUpdate: boolean = false,
	previewNewContent?: string,
) => {
	if (!model) return;

	const fromDBMessageOptions = createPreviewModel(model.firstMessages);

	let previewMessage = editPanelStore.getbyPreviewMessageId(model.panelId);

	if (!previewMessage || forceUpdate) {
		previewMessage = await editChannel.send('# [プレビュー] チケット内パネル');
		editPanelStore.setbyPreviewMessageId(model.panelId, previewMessage);
	} else if (previewNewContent) {
		await previewMessage.edit(previewNewContent);
	}

	let editPanel = editPanelStore.getByPanelId(model.panelId);

	if (!editPanel || forceUpdate) {
		editPanel = await editChannel.send(fromDBMessageOptions);
		editPanelStore.setByPanelId(model.panelId, editPanel);
	} else {
		await editPanel.edit({
			...fromDBMessageOptions,
		});
	}

	const containerBuilder = new ContainerBuilder();

	if (model.firstMessages.rows?.version === 1) {
		containerBuilder.addTextDisplayComponents(
			addTextDisplayBuilder(
				`# お問い合わせメニュー\nURL: https://discord.com/channels/${model.serverId}/${model.channelId}/${model.panelId}`,
			),
		);
		containerBuilder.addSeparatorComponents(addSeparatorBuilder());
		containerBuilder.addSectionComponents(
			addSectionWithButtonBuilder({
				contents: [
					'クローズリマインド',
					'オンにすると、ユーザーがメッセージを送信するたびに毎回クローズパネルを送信します',
					'オフにすると、最初のパネルでクローズが押された場合だけクローズします',
				],
				buttonCustomId: `toggle_close_remind:${model.panelId}`,
				buttonLabel: `クローズリマインドを:${model.closePanelSendTiming === '1' ? 'オフへ' : 'オンへ'}`,
				buttonStyle: ButtonStyle.Success,
			}),
		);

		containerBuilder.addTextDisplayComponents(
			new TextDisplayBuilder({
				content: '# パネル内容変更メニュー\n現在のパネルバージョン: 1',
			}),
		);

		const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'edit_close_content',
				label: '付属文変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_close_title',
				label: 'パネルタイトル変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_close_desc',
				label: 'パネル本文変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_close_color',
				label: 'パネル枠線カラー変更',
				style: ButtonStyle.Success,
			}),
		);

		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'edit_close_header',
				label: 'ヘッダー変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_close_footer',
				label: 'フッター変更',
				style: ButtonStyle.Success,
			}),
		);

		const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'close_add_field',
				label: 'フィールド追加',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'close_edit_field',
				label: 'フィールド変更',
				style: ButtonStyle.Primary,
			}),
			new ButtonBuilder({
				customId: 'close_delete_field',
				label: 'フィールド削除',
				style: ButtonStyle.Danger,
			}),
		);

		containerBuilder.addActionRowComponents(row1, row2, row3);

		containerBuilder.addSeparatorComponents(addSeparatorBuilder());
		containerBuilder.addTextDisplayComponents(
			addTextDisplayBuilder('# ボタン追加・変更・削除メニュー'),
		);

		const labels = model.firstMessages.rows.components.flatMap((rows) => {
			return rows.flatMap((row) => {
				if (row.type !== 'button') return [];
				return row.label;
			});
		});

		containerBuilder.addActionRowComponents(
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.addOptions(
						labels.map((x) =>
							new StringSelectMenuOptionBuilder().setLabel(x).setValue(x),
						),
					)
					.setCustomId(`edit_close_button:${model.panelId}`),
			),
		);
	}

	const settingPanel = editPanelStore.getbyEditPanelId(model.panelId);

	if (!settingPanel || forceUpdate) {
		const settingPanel = await editChannel.send({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
		editPanelStore.setEditPanelIdToPanelId(settingPanel.id, model.panelId);
		editPanelStore.setbyEditPanelId(model.panelId, settingPanel);
	} else {
		await settingPanel.edit({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
	}
};

export const makeEditMainPanel = async (
	oldmodel: Awaited<ReturnType<typeof getTicketInfo>>,
	editChannel: SendableChannels,
	forceUpdate: boolean = false,
	previewNewContent?: string,
) => {
	if (!oldmodel) return;

	const store = container.getDataStore();

	const model = await store.do(
		async (db) => await getTicketInfo(db, oldmodel.panelId),
	);
	if (!model) return;

	const fromDBMessageOptions = createPreviewModel(model.mainPanel);

	let previewMessage = editPanelStore.getbyPreviewMessageId(model.panelId);

	if (!previewMessage || forceUpdate) {
		previewMessage = await editChannel.send('# [プレビュー] メインパネル');
		editPanelStore.setbyPreviewMessageId(model.panelId, previewMessage);
	} else if (previewNewContent) {
		await previewMessage.edit(previewNewContent);
	}

	let editPanel = editPanelStore.getByPanelId(model.panelId);

	if (!editPanel || forceUpdate) {
		editPanel = await editChannel.send(fromDBMessageOptions);
		editPanelStore.setByPanelId(model.panelId, editPanel);
	} else {
		await editPanel.edit({
			...fromDBMessageOptions,
		});
	}

	const containerBuilder = new ContainerBuilder();

	if (model.firstMessages.rows?.version === 1) {
		const row0 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'edit_mainpanel',
				label: 'パネル適用',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'delete_setting',
				label: 'この設定を削除',
				style: ButtonStyle.Danger,
			}),
		);
		containerBuilder.addActionRowComponents(row0);
		containerBuilder.addSeparatorComponents(addSeparatorBuilder());

		containerBuilder.addTextDisplayComponents(
			addTextDisplayBuilder(
				`# お問い合わせメニュー\nURL: https://discord.com/channels/${model.serverId}/${model.channelId}/${model.panelId}`,
			),
		);
		containerBuilder.addSeparatorComponents(addSeparatorBuilder());

		containerBuilder.addTextDisplayComponents(
			new TextDisplayBuilder({
				content: '# パネル内容変更メニュー\n現在のパネルバージョン: 1',
			}),
		);

		const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'edit_content',
				label: '付属文変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_title',
				label: 'パネルタイトル変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_desc',
				label: 'パネル本文変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_color',
				label: 'パネル枠線カラー変更',
				style: ButtonStyle.Success,
			}),
		);

		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'edit_header',
				label: 'ヘッダー変更',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_footer',
				label: 'フッター変更',
				style: ButtonStyle.Success,
			}),
		);

		const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: 'add_field',
				label: 'フィールド追加',
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: 'edit_field',
				label: 'フィールド変更',
				style: ButtonStyle.Primary,
			}),
			new ButtonBuilder({
				customId: 'delete_field',
				label: 'フィールド削除',
				style: ButtonStyle.Danger,
			}),
		);

		containerBuilder.addActionRowComponents(row1, row2, row3);

		containerBuilder.addSeparatorComponents(addSeparatorBuilder());
		containerBuilder.addTextDisplayComponents(
			addTextDisplayBuilder('# ボタン追加・変更・削除メニュー'),
		);

		const labels = model.firstMessages.rows.components.flatMap((rows) => {
			return rows.flatMap((row) => {
				if (row.type !== 'button') return [];
				return row.label;
			});
		});

		containerBuilder.addActionRowComponents(
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.addOptions(
						labels.map((x) =>
							new StringSelectMenuOptionBuilder().setLabel(x).setValue(x),
						),
					)
					.setCustomId(`edit_button:${model.panelId}`),
			),
		);
	}

	const settingPanel = editPanelStore.getbyEditPanelId(model.panelId);

	if (!settingPanel || forceUpdate) {
		const settingPanel = await editChannel.send({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
		editPanelStore.setEditPanelIdToPanelId(settingPanel.id, model.panelId);
		editPanelStore.setbyEditPanelId(model.panelId, settingPanel);
	} else {
		await settingPanel.edit({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
	}
};

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

const createPreviewModel = (dbModel: DiscordMessageTemplate) => {
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
