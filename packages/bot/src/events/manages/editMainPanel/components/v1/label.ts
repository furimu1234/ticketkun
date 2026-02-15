import { updateTicketInfo } from '@ticket/db';
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
import { container } from '../../../../../container';
import { makeEditMainPanelButton } from '../../../../../settingPanel';
import { editPanelStore } from '../../../../../utils';
import { getTargetButtonComponent } from './editButton';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith('editMainPanelLabel')) return;

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

	if (model?.mainPanel.rows?.version === 2) return;
	const button = model?.mainPanel.rows?.components[row][col];
	if (button?.type !== 'button') return;

	const dialog = Dialog();

	const customId0 = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しいラベルを入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(customId0)
				.setValue(component?.label ?? '')
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
		title: 'ラベル入力画面',
	});

	if (!interaction.channel?.isSendable()) return;

	button.label = modalR.getTextInputValue(customId0);

	const store = container.getDataStore();
	await store.do(async (db) => {
		await updateTicketInfo(db, model, panelId);
	});

	await makeEditMainPanelButton(targetCustomId, component, panelId);

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content:
				'[メインパネルに変更]->[パネル適用]ボタン押下後、メインパネルに適用されます！',
		},
		interaction,
	);
};
