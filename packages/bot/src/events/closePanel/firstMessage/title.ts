import * as path from 'node:path';
import { getTicket, updateTicket } from '@ticket/db';
import {
	confirmDialog,
	DISCORD_MESSAGE_LIMITS,
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
import { container } from '../../../container';
import { makeEditCloseFirstMessage } from '../../../settingPanel';
import { editPanelStore } from '../../../utils';
import { checkPanelName } from './content';

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

	await store.do(async (db) => {
		const model = await getTicket(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		const dialog = Dialog();

		const newItemCustomId = generateRandomString();

		if (!model.firstMessages.embeds) return;

		const label = new LabelBuilder()
			.setLabel('新しいタイトルを入力してください!')
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId(newItemCustomId)
					.setValue(model.firstMessages.embeds[0].title ?? '')
					.setMaxLength(DISCORD_MESSAGE_LIMITS.title)
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
			title: 'タイトル入力画面',
		});

		model.firstMessages.embeds[0].title =
			modalR.getTextInputValue(newItemCustomId);

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

		await updateTicket(db, model, panelId);
		return model;
	});

	if (!interaction.channel?.isSendable()) return;

	await makeEditCloseFirstMessage(panelId, interaction.channel);

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content: '次クローズパネルが作成されたときから反映されます！',
		},
		interaction,
	);
};
