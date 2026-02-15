import { updateTicket } from '@ticket/db';
import {
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
import { container } from '../../../../../../container';
import { makeEditFirstMessagesButton } from '../../../../../../settingPanel';
import { editPanelStore } from '../../../../../../utils';
import { getTargetButtonComponent } from './editButton';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith('editFirstMessagesEmoji')) return;

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
	const { col, row, model, component } = await getTargetButtonComponent(
		targetCustomId,
		panelId,
	);

	if (!component) return;

	if (model?.firstMessages.rows?.version === 2) return;
	const button = model?.firstMessages.rows?.components[row][col];
	if (button?.type !== 'button') return;

	const dialog = Dialog();

	const customId0 = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しい絵文字を入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(customId0)
				.setValue(component?.emoji ?? '')
				.setMaxLength(DISCORD_MESSAGE_LIMITS.buttonLabel)
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(true),
		);

	const modalR = await dialog.modal(interaction, {
		customId: generateRandomString(),
		fields: [
			{
				type: 'label',
				builder: label,
			},
		],
		title: '絵文字入力画面',
	});

	if (!interaction.channel?.isSendable()) return;

	button.emoji = modalR.getTextInputValue(customId0).trim();

	if (button.emoji.startsWith(':') && button.emoji.endsWith(':')) {
		throw new SendError(
			'Discordでコピペできる`:sparkles:`のような入力は使えません!\nカスタム絵文字のIDか絵文字そのものを入力してください',
		);
	}

	const store = container.getDataStore();
	await store.do(async (db) => {
		await updateTicket(db, model, panelId);
	});

	await makeEditFirstMessagesButton(targetCustomId, component, panelId);

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content:
				'[メインパネルに変更]->[パネル適用]ボタン押下後、メインパネルに適用されます！',
		},
		interaction,
	);
};
