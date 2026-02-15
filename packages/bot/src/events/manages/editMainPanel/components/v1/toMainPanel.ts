import { messageID, SendError, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { makeEditMainPanel } from '../../../../../settingPanel';
import { editPanelStore } from '../../../../../utils';
import { getTargetButtonComponent } from './editButton';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith('editToMainPanel-')) return;

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

	const targetCustomId = interaction.customId.split('-')[1];
	const { model } = await getTargetButtonComponent(targetCustomId, panelId);

	await makeEditMainPanel(model, interChannel);
};
