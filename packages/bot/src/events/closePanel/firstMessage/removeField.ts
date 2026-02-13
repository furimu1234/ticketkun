import { getTicket, updateTicket } from '@ticket/db';
import {
	confirmDialog,
	messageID,
	SendError,
	selector,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { container } from '../../../container';
import { makeEditCloseFirstMessage } from '../../../settingPanel';
import { editPanelStore } from '../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (interaction.customId !== `close_delete_field`) return;

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

	await store.do(async (db) => {
		const model = await getTicket(db, panelId);

		if (!model) throw new SendError(messageID.E00001());

		const embeds = model.firstMessages.embeds;
		if (!embeds) throw new SendError(messageID.E00001());
		const fields = embeds[0].fields;
		if (!fields) throw new SendError(messageID.E00001());

		const selection = await selectField(model, interaction, true);
		if (!selection) throw new SendError(messageID.E00001());

		await selection.deferUpdate();
		await selection.deleteReply();

		const selectedValues = selection.values;

		embeds[0].fields = fields?.filter(
			(field) => field.name !== selectedValues[0],
		);

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

export const selectField = async (
	model: Awaited<ReturnType<typeof getTicket>>,
	interaction: ButtonInteraction,
	isDelete: boolean,
) => {
	const embeds = model?.firstMessages.embeds;
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
