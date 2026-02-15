import { getTicket } from '@ticket/db';
import { messageID, SendError, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { container } from '../../../../../../container';
import { makeEditFirstMessagesButton } from '../../../../../../settingPanel';
import { editPanelStore } from '../../../../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`editFirstMessagesComponent-`)) return;

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

	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const targetCustomId = interaction.customId.split('-')[1];

	const { component: targetComponent } = await getTargetButtonComponent(
		targetCustomId,
		panelId,
	);
	if (!targetComponent) return;

	await makeEditFirstMessagesButton(targetCustomId, targetComponent, panelId);
};

export const getTargetButtonComponent = async (
	targetCustomId: string,
	panelId: string,
) => {
	const store = container.getDataStore();

	const model = await store.do(async (db) => {
		const model = await getTicket(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		return model;
	});

	const rowsModel = model.firstMessages.rows;

	if (!rowsModel) return { component: undefined };

	let row = 0;
	let col = 0;
	let isBreaked = false;

	if (rowsModel.version === 2) return { component: undefined };

	for (const rows of rowsModel?.components ?? []) {
		for (const component of rows) {
			if (component.customId === targetCustomId) {
				isBreaked = true;
				break;
			}
			col += 1;
		}
		//対象のcomponentが居る位置

		if (!isBreaked) {
			row += 1;
			col = 0;
		}
	}

	return {
		row,
		col,
		model,
		component: rowsModel?.components
			.flat()
			.filter((component) => component.type === 'button')
			.find((component) => component.customId === targetCustomId),
	};
};
