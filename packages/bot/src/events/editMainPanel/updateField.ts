import { getTicketInfo, updateTicketInfo } from '@ticket/db';
import {
	confirmDialog,
	messageID,
	SendError,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';

import { makeEditMainPanel } from '../../commands/createTicketInfo';
import { container } from '../../container';
import { editPanelStore } from '../../utils';
import { addField } from './addField';
import { selectField } from './removeField';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (interaction.customId !== `edit_field`) return;

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

	const store = container.getDataStore();
	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const model = await store.do(async (db) => {
		const model = await getTicketInfo(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		if (!model.mainPanel.embeds) return;
		const embeds = model.mainPanel.embeds;
		if (!embeds || embeds[0].fields === undefined)
			throw new SendError(messageID.E00001());

		const selection = await selectField(model, interaction, false);
		if (!selection) throw new SendError(messageID.E00001());

		const selectedValues = selection.values;

		const oldField = embeds[0].fields?.find(
			(field) => field.name === selectedValues[0],
		);

		const newField = await addField(model, selection, oldField);
		await selection.deleteReply();

		if (!newField) {
			throw new SendError(messageID.E00001());
		}

		embeds[0].fields = embeds[0].fields.map((field) => {
			if (field.name !== oldField?.name) return field;

			return newField;
		});

		if (model.mainPanel.rows?.version === 2) {
			const confirm = confirmDialog(
				interChannel,
				'現在パネルバージョンが2になってますが、1に変更しないと設定した付属文が反映されません。1に変更しますか？\n設定だけ登録して2のままにしますか?',
			);

			confirm.setOkLabel('1に変更する');
			confirm.setNoLabel('2に変更する');

			const isChangeV = await confirm.send(false);

			if (isChangeV) {
				const newVersion = 1;
				//@ts-expect-error
				model.mainPanel.rows.version = newVersion;
			}
		}

		await updateTicketInfo(db, model, panelId);
		return model;
	});

	if (!interaction.channel?.isSendable()) return;

	await makeEditMainPanel(model, interaction.channel);

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content: '[適用]ボタン押下後、メインパネルに適用されます！',
		},
		interaction,
	);
};
