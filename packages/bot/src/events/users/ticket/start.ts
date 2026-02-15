import {
	convertMessageOptionsFromDB,
	createUserTicket,
	getTicket,
	getTicketInfo,
} from '@ticket/db';
import { wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, ChannelType, Events } from 'discord.js';

import { container } from '../../../container';

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

	const { infoModel, model } = await store.do(async (db) => {
		const infoModel = await getTicketInfo(db, interaction.message.id);
		const model = await getTicket(db, interaction.message.id);
		return { infoModel, model };
	});

	if (!infoModel || !model) return;

	if (interaction.channel?.type !== ChannelType.GuildText) return;

	const thread = await interaction.channel.threads.create({
		name: `${interaction.user.displayName}-ticket`,
		invitable: false,
		type: ChannelType.PrivateThread,
	});

	await thread.members.add(interaction.user.id);

	await thread.send(convertMessageOptionsFromDB(model.firstMessages));

	await store.do(async (db) => {
		await createUserTicket(db, {
			creatorId: interaction.user.id,
			ticketId: thread.id,
		});
	});
};
