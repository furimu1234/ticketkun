import {
	type DiscordMessageEmbedFieldType,
	type DiscordMessageEmbedType,
	getTicketInfo,
	updateTicketInfo,
} from '@ticket/db';
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
	type StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';

import { container } from '../../../container';
import { editPanelStore } from '../../../utils';
import { makeEditMainPanel } from '../../../settingPanel';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (interaction.customId !== `add_field`) return;

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

		const newItem = await addField(model, interaction);
		if (!newItem) throw new SendError(messageID.E00001());
		let embeds = model.mainPanel.embeds;

		if (!embeds) {
			embeds = [{ fields: [] }] as DiscordMessageEmbedType[];
		}

		if (!embeds[0].fields) {
			embeds[0].fields = [];
		}

		if (embeds[0].fields !== undefined) {
			embeds[0].fields.push(newItem);
		}

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

	await makeEditMainPanel(model, interaction.channel, true);
	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content: '[適用]ボタン押下後、メインパネルに適用されます！',
		},
		interaction,
	);
};

export const addField = async (
	model: Awaited<ReturnType<typeof getTicketInfo>>,
	interaction: ButtonInteraction | StringSelectMenuInteraction,
	oldItem?: DiscordMessageEmbedFieldType,
) => {
	if (!model) return;

	const dialog = Dialog();

	const newNameCustomId = generateRandomString();
	const newValueCustomId = generateRandomString();
	const newInlineCustomId = generateRandomString();

	if (!model.mainPanel.embeds) return;

	const prefix = oldItem ? '追加' : '編集';

	let item;

	if (oldItem) {
		item = model.mainPanel.embeds[0].fields?.find(
			(field) => field.name === oldItem.name,
		);
	}

	const nameInput = new TextInputBuilder()
		.setCustomId(newNameCustomId)
		.setPlaceholder('フィールド名を入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldName)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

	if (item) {
		nameInput.setValue(item.name);
	}

	const fieldName = new LabelBuilder()
		.setLabel(`${prefix}するフィールドの名前を入力してください!`)
		.setTextInputComponent(nameInput);

	const valueInput = new TextInputBuilder()
		.setCustomId(newValueCustomId)
		.setPlaceholder('フィールドの値を入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldValue)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

	if (item) {
		valueInput.setValue(item.value);
	}

	const fieldValue = new LabelBuilder()
		.setLabel('追加するフィールドの値を入力してください!')
		.setTextInputComponent(valueInput);

	const inlineInput = new TextInputBuilder()
		.setCustomId(newInlineCustomId)
		.setPlaceholder('改行する場合はオン、しない場合はオフを入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldValue)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

	if (item) {
		inlineInput.setValue(item.inline ? 'オン' : 'オフ');
	}

	const fieldInline = new LabelBuilder()
		.setLabel('追加するフィールドの改行[オン/オフ]を入力してください!')
		.setTextInputComponent(inlineInput);

	const modalR = await dialog.modal(interaction, {
		customId: generateRandomString(),
		fields: [
			{
				type: 'label',
				builder: fieldName,
			},
			{
				type: 'label',
				builder: fieldValue,
			},
			{
				type: 'label',
				builder: fieldInline,
			},
		],
		title: 'フィールド追加画面',
	});

	return {
		name: modalR.getTextInputValue(newNameCustomId),
		value: modalR.getTextInputValue(newValueCustomId),
		inline: modalR.getTextInputValue(newInlineCustomId) === 'オン',
	};
};
