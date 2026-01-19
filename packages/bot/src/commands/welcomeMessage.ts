import { getWelcomeMessage } from '@example_build/db';

import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { container } from '../container';
export const data = new SlashCommandBuilder()
	.setName('ようこそメッセージ確認')
	.setDescription('設定済みの読み込みメッセージを確認します');

export async function execute(interaction: CommandInteraction) {
	if (!container.current) return;

	await interaction.deferReply();

	const store = container.current.getDataStore();

	const guild = interaction.guild;

	if (!guild) return;

	const model = await store.do(async (db) => {
		return await getWelcomeMessage(db, guild.id);
	});

	await interaction.followUp(
		`${model?.message || '設定データが見つかりませんでした'}`,
	);
}
