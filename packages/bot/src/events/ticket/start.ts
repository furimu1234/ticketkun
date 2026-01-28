import { getTicketInfo } from '@ticket/db';
import { wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, ChannelType, Events } from 'discord.js';

import { container } from '../../container';

export const name = Events.InteractionCreate;
export const once = false;

//スレッドでお問い合わせチケットを作成
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (interaction.customId !== `ticket_start`) return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction),
	);
}

const main = async (interaction: ButtonInteraction) => {
	const store = container.getDataStore();

	const model = await store.do(async (db) => {
		return await getTicketInfo(db, interaction.message.id);
	});

	if (!model) return;

	if (interaction.channel?.type !== ChannelType.GuildText) return;

	const thread = await interaction.channel.threads.create({
		name: `${interaction.user.displayName}-ticket`,
		invitable: false,
		type: ChannelType.PrivateThread,
	});

	await thread.members.add(interaction.user.id);
};
