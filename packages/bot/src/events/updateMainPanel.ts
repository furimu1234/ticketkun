import { convertMessageOptionsFromDB, getTicketInfo } from '@ticket/db';
import { messageID, SendError, sleep, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, ChannelType, Events } from 'discord.js';

import { container } from '../container';
import { editPanelStore } from '../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (interaction.customId !== 'edit_mainpanel') return;
	await interaction.deferUpdate();
	if (!interaction.channel?.isSendable()) return;
	await wrapSendError(
		{ ephemeral: false, channel: interaction.channel },
		async () => await main(interaction),
	);
}

const main = async (interaction: ButtonInteraction) => {
	const store = container.getDataStore();
	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const interactionChannel = interaction.channel;
	if (!interactionChannel?.isSendable()) return;

	const result = await store.do(async (db) => {
		const guild = interaction.guild;

		if (!guild) return;

		const model = await getTicketInfo(db, panelId);

		if (!model) throw new SendError(messageID.E00002());

		const channel = guild.channels.cache.get(model.channelId);
		if (channel?.type !== ChannelType.GuildText) return;

		try {
			await channel.messages
				.fetch(model.panelId)
				.then((m) => m.edit(convertMessageOptionsFromDB(model.mainPanel)));
		} catch {
			return false;
		}
		return true;
	});

	if (result) {
		const react = await interaction.message.react('✅');
		await sleep(10);
		await react.remove();
	}
};
