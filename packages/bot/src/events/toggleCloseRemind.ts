import { getTicketInfo, updateTicketInfo } from '@ticket/db';
import { messageID, SendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';

import { container } from '../container';
import { makeEditMainPanel } from '../settingPanel';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (!interaction.customId.startsWith('toggle_close_remind')) return;
	await interaction.deferUpdate();

	const store = container.getDataStore();
	const panelId = interaction.customId.split(':')[1];

	const model = await store.do(async (db) => {
		const model = await getTicketInfo(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		const newRemind = model.closePanelSendTiming === '1' ? '2' : '1';
		model.closePanelSendTiming = newRemind;

		await updateTicketInfo(db, model, panelId);
		return model;
	});

	if (!interaction.channel?.isSendable()) return;

	await makeEditMainPanel(model, interaction.channel);
}
