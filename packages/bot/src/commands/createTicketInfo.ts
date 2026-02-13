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
								customId: `close:${panel.id}`,
								label: 'クローズ',
								emoji: '<:ai_chime:1465619293961195664>',
								type: 'button',
								style: ButtonStyle.Danger,
							},
						],
					],
				},
			},
		});

		await createCloseProcess(db, {
			panelId: panel.id,
			triggerCustomId: `closeProcess:close:${panel.id}`,
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
										customId: `closeProcess:custom_exeClose:${panel.id}`,
										label: 'CLOSE',
										emoji: '<:ai_chime:1465619293961195664>',
										style: ButtonStyle.Danger,
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
			triggerCustomId: `closeProcess:custom_exeClose:${panel.id}`,
			process: [
				{ name: 'ignoreMembers', roles: [], users: [] },
				{ name: 'closeThread', ignore: [] },
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
