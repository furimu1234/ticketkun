import * as path from 'node:path';

import {
	type DiscordMessageEmbedType,
	getTicketInfo,
	updateTicketInfo,
} from '@ticket/db';
import {
	confirmDialog,
	Dialog,
	generateRandomString,
	messageID,
	SendError,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import {
	type ButtonInteraction,
	Events,
	LabelBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';

import { makeEditClosePanel } from '../../commands/createTicketInfo';
import { container } from '../../container';
import { editPanelStore } from '../../utils';

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

	const store = container.getDataStore();
	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const model = await store.do(async (db) => {
		const model = await getTicketInfo(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		const dialog = Dialog();

		const newContentCustomId = generateRandomString();

		const label = new LabelBuilder()
			.setLabel('新しい付属文を入力してください!')
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId(newContentCustomId)
					.setValue(model.firstMessages.content ?? '')
					.setMaxLength(2000)
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(false),
			);

		const modalR = await dialog.modal(interaction, {
			customId: generateRandomString(),
			fields: [
				{
					type: 'label',
					builder: label,
				},
			],
			title: '付属文入力画面',
		});

		model.firstMessages.content = modalR.getTextInputValue(newContentCustomId);
		checkPanelName(model.firstMessages.content, model.firstMessages.embeds);

		if (model.firstMessages.rows?.version === 2) {
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
				model.firstMessages.rows.version = newVersion;
			}
		}

		await updateTicketInfo(db, model, panelId);
		return model;
	});

	if (!interaction.channel?.isSendable()) return;

	await makeEditClosePanel(model, interaction.channel);

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content: '次クローズパネルが作成されたときから反映されます！',
		},
		interaction,
	);
};

export const checkPanelName = (
	content?: string,
	embeds: DiscordMessageEmbedType[] = [],
) => {
	if (!content && embeds.length !== 0 && !embeds[0].title) {
		throw new SendError(messageID.E00005());
	}

	return true;
};
