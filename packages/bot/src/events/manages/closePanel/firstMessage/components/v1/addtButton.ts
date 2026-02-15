import {
	type DiscordMessageButtonRow,
	getTicket,
	updateTicket,
} from '@ticket/db';
import {
	Dialog,
	generateRandomString,
	messageID,
	SendError,
	wrapSendError,
} from '@ticket/lib';
import {
	type ButtonInteraction,
	ButtonStyle,
	Events,
	LabelBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { container } from '../../../../../../container';
import { makeEditFirstMessagesButton } from '../../../../../../settingPanel';
import { editPanelStore } from '../../../../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (interaction.customId !== `addFirstMessagesButton`) return;

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

	const buttonName = await inputButtonName(interaction);

	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const { model, newComponent } = await createButtonComponent(
		panelId,
		buttonName,
	);

	if (!newComponent) return;

	const store = container.getDataStore();

	await store.do(async (db) => {
		await updateTicket(db, model, panelId);
	});

	await makeEditFirstMessagesButton('', newComponent, panelId);
};

export const inputButtonName = async (interaction: ButtonInteraction) => {
	const dialog = Dialog();

	const newContentCustomId = generateRandomString();

	const text = new TextDisplayBuilder({
		content:
			'# ボタン名を入力してください。\n処理とボタンを紐づけるときに処理名=ボタン名となります！',
	});

	const label = new LabelBuilder()
		.setLabel('ボタンの名前を入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newContentCustomId)
				.setMaxLength(200)
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false),
		);

	const modalR = await dialog.modal(interaction, {
		customId: generateRandomString(),
		fields: [
			{
				type: 'text',
				builder: text,
			},
			{
				type: 'label',
				builder: label,
			},
		],
		title: 'ボタン名入力画面',
	});

	return modalR.getTextInputValue(newContentCustomId);
};

export const createButtonComponent = async (
	panelId: string,
	buttonName: string,
) => {
	const store = container.getDataStore();

	const model = await store.do(async (db) => {
		const model = await getTicket(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		return model;
	});

	const rowsModel = model.firstMessages.rows;

	if (!rowsModel) return { model, newComponent: undefined };

	if (rowsModel.version === 2) return { model, newComponent: undefined };

	for (const rows of rowsModel?.components ?? []) {
		if (rows.length >= 5) continue;

		const newComponent: DiscordMessageButtonRow = {
			type: 'button',
			customId: `closeProcess:${buttonName}:${panelId}`,
			label: buttonName,
			style: ButtonStyle.Success,
			buttonName: buttonName,
		};

		rows.push(newComponent);
		return { model, newComponent };
	}

	throw new SendError(messageID.E00006());
};
