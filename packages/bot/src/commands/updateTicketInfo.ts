import { getTicketInfo, getTicketInfos } from '@ticket/db';
import { messageID, SendError, selector } from '@ticket/lib';
import {
	ChannelType,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandChannelOption,
	SlashCommandStringOption,
} from 'discord.js';
import { container } from '../container';
import { makeEditMainPanel, makeEditTicketProcess } from '../settingPanel';

export const data = new SlashCommandBuilder()
	.setName('お問い合わせ設定変更')
	.setDescription('既存パネルの設定を変更します');

data.addChannelOption(
	new SlashCommandChannelOption()
		.addChannelTypes(ChannelType.GuildText)
		.setName('パネル作成チャンネル')
		.setDescription('パネルを作成したチャンネルを指定してください')
		.setRequired(true),
);
data.addStringOption(
	new SlashCommandStringOption()
		.addChoices([
			{ name: 'メインパネルを編集する', value: 'main' },
			{ name: 'チケット内処理を編集する', value: 'close' },
		])
		.setName('編集するパネルの種類')
		.setDescription('編集するパネルの種類を選択してください。')
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
	const targetPanelType = interaction.options.getString('編集するパネルの種類');

	const targetChannel = guild.channels.cache
		.filter((x) => x.type === ChannelType.GuildText)
		.get(targetChannelId ?? '');

	if (!targetChannel?.isSendable()) return;

	const models = await store.do(async (db) => {
		const models = await getTicketInfos(db, targetChannel.id);

		if (!models || models.length === 0) throw new SendError(messageID.E00001());

		return models;
	});

	if (!interaction.channel?.isSendable()) return;

	const select = selector(interaction.channel, 'どのパネルを作成しますか？');
	const values = await select.string(
		'設定を変更するパネルタイトルを選択してください!',
		models.flatMap((x) => {
			const message = x.mainPanel;
			let name = 'エラーパネル';
			if (!message.embeds) return [];

			const title = message.embeds[0].title ?? '';
			const description = message.embeds[0].description ?? '';
			const content = message.content ?? '';

			if (title.length > 0) {
				name = title;
			} else if (content.length > 0) {
				name = content;
			} else if (description.length > 0) {
				name = description;
			}

			if (message.rows?.version === 1) {
				if (message.embeds) {
					return [
						{
							name: name,
							value: x.panelId,
						},
					];
				}
			} else if (message.rows?.version === 2) {
				if (message.rows.components.length > 0) {
					const component = message.rows.components[0];

					if (component.type === 'textDisplay') {
						return [{ name: component.content, value: x.panelId }];
					} else if (component.type === 'section') {
						return [{ name: component.textDisplay.content, value: x.panelId }];
					}
				}
			}

			return [];
		}),
	);

	if (values.length === 0) throw new SendError(messageID.E00001());

	const model = await store.do(async (db) => {
		const model = await getTicketInfo(db, values[0]);

		if (!model) throw new SendError(messageID.E00001());

		return model;
	});

	if (targetPanelType === 'close') {
		await makeEditTicketProcess(model.panelId, interaction.channel, true);
	} else {
		await makeEditMainPanel(model, interaction.channel, true);
	}

	await interaction.editReply('設定パネルを作成しました！');
}
