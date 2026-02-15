import {
	convertMessageOptionsFromDB,
	createCloseProcess,
	createTicket,
	createTicketInfo,
	getTicketInfo,
} from '@ticket/db';
import { messageID, SendError } from '@ticket/lib';
import {
	ButtonStyle,
	ChannelType,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandChannelOption,
} from 'discord.js';
import { container } from '../container';
import { makeEditMainPanel } from '../settingPanel';
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

		await createTicket(db, {
			panelId: panel.id,
			firstMessages: {
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
								customId: `closeProcess:クローズ確認:${panel.id}`,
								label: 'クローズ',
								emoji: '<:ai_chime:1465642091978690766>',
								type: 'button',
								style: ButtonStyle.Danger,
								buttonName: 'クローズ確認',
							},
						],
					],
				},
			},
		});

		await createCloseProcess(db, {
			panelId: panel.id,
			triggerCustomId: `closeProcess:クローズ確認:${panel.id}`,
			process: [
				{
					name: 'message',
					message: {
						content: 'クローズしますか？',
						rows: {
							version: 1,
							components: [
								[
									{
										type: 'button',
										customId: `closeProcess:チケットクローズ:${panel.id}`,
										label: '本当にクローズ',
										emoji: '<:ai_chime:1465642091978690766>',
										style: ButtonStyle.Danger,
										buttonName: 'チケットクローズ',
									},
								],
							],
						},
					},
				},
			],
		});

		await createCloseProcess(db, {
			panelId: panel.id,
			triggerCustomId: `closeProcess:チケットクローズ:${panel.id}`,
			process: [
				{ name: 'ignoreMembers', roles: [], users: [] },
				{ name: 'closeThread', target: 'same' },
				{
					name: 'message',
					message: {
						content: 'クローズしました!',
						rows: {
							version: 1,
							components: [
								[
									{
										type: 'button',
										label: '再オープン',
										customId: `closeProcess:再オープン:${panel.id}`,
										style: ButtonStyle.Success,
										emoji: '<:letterReOpen:1472078075738067149>',
										buttonName: '再オープン',
									},
								],
							],
						},
					},
				},
			],
		});

		await createCloseProcess(db, {
			panelId: panel.id,
			triggerCustomId: `closeProcess:再オープン:${panel.id}`,
			process: [
				{ name: 'includeMembers', roles: [], users: [] },
				{ name: 'openThread', target: 'same' },
				{
					name: 'message',
					message: {
						content: '再オープンしました!',
					},
				},
			],
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
