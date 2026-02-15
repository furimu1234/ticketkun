import { messageID, SendError, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { makeEditProcess } from '../../../../settingPanel';
import { editPanelStore } from '../../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`edit_close_process_list`)) return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction),
	);
}

const main = async (interaction: ButtonInteraction) => {
	const interChannel = interaction.channel;
	if (!interChannel?.isSendable()) return;

	await interaction.deferUpdate();

	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	if (!interaction.channel?.isSendable()) return;

	const originalCustomId = interaction.customId.split('-')[1];

	await makeEditProcess(originalCustomId, interaction.channel);
};
