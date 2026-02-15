import {
	convertMessageOptionsFromDB,
	deleteCloseProcess,
	getCloseProcess,
	updateCloseProcess,
} from '@ticket/db';
import type {
	CloseProcessStep,
	CloseProcessType,
} from '@ticket/db/dist/processHandmeid';
import {
	DISCORD_MESSAGE_LIMITS,
	Dialog,
	generateRandomString,
	messageID,
	SendError,
	selector,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	ComponentType,
	ContainerBuilder,
	Events,
	LabelBuilder,
	type Message,
	MessageFlags,
	type SendableChannels,
	type StringSelectMenuInteraction,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { container } from '../../../../../container';
import { makeEditProcess } from '../../../../../settingPanel';
import { editPanelStore } from '../../../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`edit_close_process`)) return;

	const [_, originalCustomId, stringIndex, action] =
		interaction.customId.split('-');

	const index = Number.parseInt(stringIndex);

	if (Number.isNaN(index)) return;

	if (action !== 'message') return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction, index, originalCustomId),
	);
}

const main = async (
	interaction: ButtonInteraction,
	index: number,
	originalCustomId: string,
) => {
	const interChannel = interaction.channel;
	if (!interChannel?.isSendable()) return;

	await interaction.deferUpdate();

	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	if (!interaction.channel?.isSendable()) return;

	const customId = interaction.customId.split('-')[1];

	const store = container.getDataStore();

	let model = await store.do(async (db) => await getCloseProcess(db, customId));
	if (!model) return;

	const process = model.process[index];
	if (process.name !== 'message') return;

	const previewPanel = await interChannel.send(
		convertMessageOptionsFromDB(process.message),
	);

	const message = await makeMessage(interChannel);

	let mode: 'update' | 'delete' | 'normal' = 'normal';

	while (true) {
		try {
			const newModel = await editItem(message, interaction, model, index);
			if (!newModel) return;
			mode = newModel.mode;
			if (!newModel?.value) break;
			model = newModel.value;

			const process = model.process[index];
			if (process.name !== 'message') return;

			await previewPanel.edit(convertMessageOptionsFromDB(process.message));
		} catch {
			break;
		}
	}
	if (mode === 'update') {
		await store.do(async (db) => {
			await updateCloseProcess(db, model, originalCustomId);
		});

		await makeEditProcess(originalCustomId, interaction.channel);
		try {
			await previewPanel.delete();
			await message.delete();
		} catch {}

		await sendMessageThenDelete(
			{
				sleepSecond: 15,
				content: 'DBに反映したよ!',
			},
			interaction,
		);
		return;
	}
	if (mode === 'delete') {
		await store.do(async (db) => {
			await deleteCloseProcess(db, originalCustomId);
		});

		try {
			await previewPanel.delete();
			await message.delete();
		} catch {}
		await sendMessageThenDelete(
			{
				sleepSecond: 15,
				content: '削除したよ!',
			},
			interaction,
		);
		return;
	}
};

const makeMessage = async (interChannel: SendableChannels) => {
	const containerBuilder = new ContainerBuilder();

	const row0 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'update',
			label: '変更反映',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'delete',
			label: '削除',
			style: ButtonStyle.Danger,
		}),
	);

	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'content',
			label: '付属文変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'title',
			label: 'パネルタイトル変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'desc',
			label: 'パネル本文変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'color',
			label: 'パネル枠線カラー変更',
			style: ButtonStyle.Success,
		}),
	);

	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'header',
			label: 'ヘッダー変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'footer',
			label: 'フッター変更',
			style: ButtonStyle.Success,
		}),
	);

	const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'add_field',
			label: 'フィールド追加',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_field',
			label: 'フィールド変更',
			style: ButtonStyle.Primary,
		}),
		new ButtonBuilder({
			customId: 'delete_field',
			label: 'フィールド削除',
			style: ButtonStyle.Danger,
		}),
	);

	containerBuilder.addActionRowComponents(row0, row1, row2, row3);

	return await interChannel.send({
		components: [containerBuilder],
		flags: MessageFlags.IsComponentsV2,
	});
};

/**
 * embedの内容を変更する
 * @param reply 変更対象
 * @param interaction 大元のinteraction
 * @param model db model
 * @param index メッセージが含まれてるsprocessのindex
 * @returns
 */
const editEmbedItem = async (
	reply: ButtonInteraction,
	interaction: ButtonInteraction,
	model: Awaited<ReturnType<typeof getCloseProcess>>,
	index: number,
): Promise<CloseProcessStep | undefined> => {
	if (!model) return;

	const oldItem = model.process[index];

	if (oldItem.name !== 'message') return;

	if (!oldItem.message.embeds) {
		oldItem.message.embeds = [{}];
	}
	if (oldItem.message.embeds.length === 0) {
		oldItem.message.embeds = [{}];
	}

	if (reply.customId === 'title') {
		const title = await inputTitle(
			interaction,
			oldItem.message.embeds[0].title,
		);

		model.process[index] = {
			name: 'message',
			message: {
				...oldItem.message,
				embeds: [
					{
						title: title,
						...oldItem.message.embeds[0],
					},
				],
			},
		};
	} else if (reply.customId === 'desc') {
		const desc = await inputDesc(reply, oldItem.message.embeds[0].description);

		model.process[index] = {
			name: 'message',
			message: {
				...oldItem.message,
				embeds: [
					{
						description: desc,
						...oldItem.message.embeds[0],
					},
				],
			},
		};
	} else if (reply.customId === 'header') {
		const header = await inputHeader(
			reply,
			oldItem.message.embeds[0].author?.name,
			oldItem.message.embeds[0].author?.icon_url,
			oldItem.message.embeds[0].thumbnail?.url,
		);
		model.process[index] = {
			name: 'message',
			message: {
				...oldItem.message,
				embeds: [
					{
						author: {
							name: header.authorName,
							icon_url: header.mininiIcon,
						},
						thumbnail: {
							url: header.thumbnail,
						},
						...oldItem.message.embeds[0],
					},
				],
			},
		};
	} else if (reply.customId === 'footer') {
		const footer = await inputFooter(
			reply,
			oldItem.message.embeds[0].footer?.text,
		);

		model.process[index] = {
			name: 'message',
			message: {
				...oldItem.message,
				embeds: [
					{
						footer: { text: footer },
						...oldItem.message.embeds[0],
					},
				],
			},
		};
	} else if (reply.customId === 'add_field') {
		const field = await addField(reply);

		if (model.process[index].name === 'message') {
			const embeds = model.process[index].message.embeds;

			if (embeds) {
				if (!embeds[0].fields) {
					embeds[0].fields = [];
				}
				embeds[0].fields.push(field);
			}
		}
	} else if (reply.customId === 'remove_field') {
		const selection = await selectFieldToInteraction(
			model.process[index],
			interaction,
			true,
		);

		if (!selection) return;
		await selection.deferUpdate();
		await selection.deleteReply();
		const selectedValue = selection.values[0];

		if (model.process[index].name === 'message') {
			const embeds = model.process[index].message.embeds;

			if (embeds) {
				if (!embeds[0].fields) return;
				embeds[0].fields = embeds[0].fields.filter(
					(field) => field.name !== selectedValue,
				);
			}
		}
	} else if (reply.customId === 'update_field') {
		const selection = await selectFieldToInteraction(
			model.process[index],
			interaction,
			true,
		);

		if (!selection) return;
		await selection.deferUpdate();
		await selection.deleteReply();

		const selectedValue = selection.values[0];

		if (model.process[index].name === 'message') {
			const embeds = model.process[index].message.embeds;

			if (embeds) {
				const selectedField = embeds[0].fields?.find(
					(field) => field.name !== selectedValue,
				);
				if (!selectedField) return;

				const updatedField = await updateField(
					selection,
					selectedField.name,
					selectedField.value,
					selectedField.inline,
				);

				embeds[0].fields = embeds[0].fields?.map((field) => {
					if (field.name !== selectedField.name) return field;

					return updatedField;
				});
			}
		}
	}

	return oldItem;
};

/**
 * メッセージの内容をメモリ上で更新する
 * @param message 編集パネルのメッセージ
 * @param interaction　大元のinteraction
 * @param model db model
 * @param index processのindex
 * @returns mode: dbに反映/削除するか、次の項目をメモリ上で編集するか。value: 編集後のモデル
 */
const editItem = async (
	message: Message,
	interaction: ButtonInteraction,
	model: Awaited<ReturnType<typeof getCloseProcess>>,
	index: number,
): Promise<
	| {
			mode: 'update' | 'delete' | 'normal';
			value: Awaited<ReturnType<typeof getCloseProcess>>;
	  }
	| undefined
> => {
	if (!model) return;
	//編集対象のボタンが押されるまで待機
	//1時間押されなかったら例外
	const reply = await message.awaitMessageComponent({
		componentType: ComponentType.Button,
		filter: (i) =>
			i.user.id === interaction.user.id && i.message.id === message.id,
		time: 60 * 60 * 1000,
	});

	//db反映
	if (reply.customId === 'update') {
		await reply.deferUpdate();

		return { mode: 'update', value: undefined };
	}
	//削除
	if (reply.customId === 'delete') {
		await reply.deferUpdate();
		return { mode: 'delete', value: undefined };
	}

	let oldItem: CloseProcessStep | undefined = model.process[index];

	if (oldItem.name !== 'message') return;

	if (reply.customId === 'content') {
		const content = await inputContent(reply, oldItem.message.content);

		model.process[index] = {
			name: 'message',
			message: { ...oldItem.message, content: content },
		};
	} else {
		oldItem = await editEmbedItem(reply, interaction, model, index);
	}

	return { mode: 'normal', value: model };
};

export const inputContent = async (
	interaction: ButtonInteraction,
	content?: string,
) => {
	const dialog = Dialog();

	const newContentCustomId = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しい付属文を入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newContentCustomId)
				.setValue(content ?? '')
				.setMaxLength(DISCORD_MESSAGE_LIMITS.content)
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

	return modalR.getTextInputValue(newContentCustomId);
};
export const inputTitle = async (
	interaction: ButtonInteraction,
	title?: string,
) => {
	const dialog = Dialog();

	const newCustomId = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しいタイトルを入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newCustomId)
				.setValue(title ?? '')
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

	return modalR.getTextInputValue(newCustomId);
};

export const inputDesc = async (
	interaction: ButtonInteraction,
	item?: string,
) => {
	const dialog = Dialog();

	const newCustomId = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しい本文を入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newCustomId)
				.setValue(item ?? '')
				.setMaxLength(DISCORD_MESSAGE_LIMITS.description)
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
		title: '本文入力画面',
	});

	return modalR.getTextInputValue(newCustomId);
};

export const inputHeader = async (
	interaction: ButtonInteraction,
	authorName?: string,
	iconUrl?: string,
	thumbnail?: string,
) => {
	const dialog = Dialog();

	const newItemCustomId = generateRandomString();
	const newMinIconItemCustomId = generateRandomString();
	const newIconItemCustomId = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しいヘッダー内容を入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newItemCustomId)
				.setValue(authorName ?? '')
				.setMaxLength(DISCORD_MESSAGE_LIMITS.authorName)
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false),
		);

	const minIcon = new TextDisplayBuilder({
		content:
			'# 小アイコン\n小アイコンを表示する場合画像のURLを入力してください。',
	});

	const minIconLabel = new LabelBuilder()
		.setLabel('小アイコンを入力してください')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newMinIconItemCustomId)
				.setValue(iconUrl ?? '')

				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false),
		);

	const icon = new TextDisplayBuilder({
		content: '# アイコン\nアイコンを表示する場合画像のURLを入力してください。',
	});

	const iconLabel = new LabelBuilder()
		.setLabel('アイコンを入力してください')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(newIconItemCustomId)
				.setValue(thumbnail ?? '')

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
			{ type: 'text', builder: minIcon },
			{ type: 'label', builder: minIconLabel },
			{ type: 'text', builder: icon },
			{ type: 'label', builder: iconLabel },
		],
		title: 'ヘッター入力画面',
	});

	return {
		authorName: modalR.getTextInputValue(newItemCustomId),
		mininiIcon: modalR.getTextInputValue(newMinIconItemCustomId),
		thumbnail: modalR.getTextInputValue(newIconItemCustomId),
	};
};

export const inputFooter = async (
	interaction: ButtonInteraction,
	item?: string,
) => {
	const dialog = Dialog();

	const customId = generateRandomString();

	const label = new LabelBuilder()
		.setLabel('新しいフッターテキストを入力してください!')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId(customId)
				.setValue(item ?? '')
				.setMaxLength(DISCORD_MESSAGE_LIMITS.footerText)
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
		title: 'フッターテキスト入力画面',
	});

	return modalR.getTextInputValue(customId);
};

export const addField = async (interaction: ButtonInteraction) => {
	const dialog = Dialog();

	const newNameCustomId = generateRandomString();
	const newValueCustomId = generateRandomString();
	const newInlineCustomId = generateRandomString();

	const prefix = '追加';

	const nameInput = new TextInputBuilder()
		.setCustomId(newNameCustomId)
		.setPlaceholder('フィールド名を入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldName)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

	const fieldName = new LabelBuilder()
		.setLabel(`${prefix}するフィールドの名前を入力してください!`)
		.setTextInputComponent(nameInput);

	const valueInput = new TextInputBuilder()
		.setCustomId(newValueCustomId)
		.setPlaceholder('フィールドの値を入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldValue)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

	const fieldValue = new LabelBuilder()
		.setLabel('追加するフィールドの値を入力してください!')
		.setTextInputComponent(valueInput);

	const inlineInput = new TextInputBuilder()
		.setCustomId(newInlineCustomId)
		.setPlaceholder('改行する場合はオン、しない場合はオフを入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldValue)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false);

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

export const selectFieldToInteraction = async (
	process: CloseProcessType[number],
	interaction: ButtonInteraction,
	isDelete: boolean,
) => {
	if (process.name !== 'message') return;

	const embeds = process.message.embeds;
	if (!embeds) return;

	const embed = embeds[0];

	const interChannel = interaction.channel;
	if (!interChannel?.isSendable()) return;

	if (embed.fields) {
		const select = selector(
			interChannel,
			`どのフィールドを${isDelete ? '削除' : '更新'}しますか？`,
		);
		const selection = await select.stringToInteraction(
			`${isDelete ? '削除' : '更新'}するフィールド名を選択してください!`,
			embed.fields?.map((x) => {
				return {
					name: x.name,
					value: x.name,
				};
			}),
		);

		if (!selection) throw new SendError(messageID.E00001());
		return selection;
	}
	return;
};

export const updateField = async (
	interaction: StringSelectMenuInteraction,
	name: string,
	value: string,
	inline?: boolean,
) => {
	const dialog = Dialog();

	const newNameCustomId = generateRandomString();
	const newValueCustomId = generateRandomString();
	const newInlineCustomId = generateRandomString();

	const prefix = '追加';

	const nameInput = new TextInputBuilder()
		.setCustomId(newNameCustomId)
		.setPlaceholder('フィールド名を入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldName)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false)
		.setValue(name);

	const fieldName = new LabelBuilder()
		.setLabel(`${prefix}するフィールドの名前を入力してください!`)
		.setTextInputComponent(nameInput);

	const valueInput = new TextInputBuilder()
		.setCustomId(newValueCustomId)
		.setPlaceholder('フィールドの値を入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldValue)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false)
		.setValue(value);

	const fieldValue = new LabelBuilder()
		.setLabel('追加するフィールドの値を入力してください!')
		.setTextInputComponent(valueInput);

	const inlineInput = new TextInputBuilder()
		.setCustomId(newInlineCustomId)
		.setPlaceholder('改行する場合はオン、しない場合はオフを入力してください')
		.setMaxLength(DISCORD_MESSAGE_LIMITS.fieldValue)
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(false)
		.setValue(inline ? ' オン' : 'オフ');

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
