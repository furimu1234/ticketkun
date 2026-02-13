import * as path from 'node:path';
import { messageID, SendError, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { makeEditCloseFirstMessage } from '../../../settingPanel';
import { editPanelStore } from '../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	const fileName = path.basename(__filename, path.extname(__filename));
	if (interaction.customId !== `edit_close_${fileName}`) return;

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

	await makeEditCloseFirstMessage(panelId, interaction.channel);
};
