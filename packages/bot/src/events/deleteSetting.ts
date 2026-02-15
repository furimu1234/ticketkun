import { deleteTicketInfo, getTicketInfo } from '@ticket/db';
import {
	confirmDialog,
	messageID,
	SendError,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import { type ButtonInteraction, ChannelType, Events } from 'discord.js';
import { makeEditMainPanel } from '../settingPanel';

import { container } from '../container';
import { editPanelStore } from '../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;

	if (interaction.customId !== 'delete_setting') return;
	await interaction.deferUpdate();
	if (!interaction.channel?.isSendable()) return;
	await wrapSendError(
		{ ephemeral: false, channel: interaction.channel },
		async () => await main(interaction),
	);
}

const main = async (interaction: ButtonInteraction) => {
	const store = container.getDataStore();
	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const interactionChannel = interaction.channel;
	if (!interactionChannel?.isSendable()) return;

	const model = await store.do(async (db) => {
		const guild = interaction.guild;

		if (!guild) return;

		const model = await getTicketInfo(db, panelId);

		if (!model) throw new SendError(messageID.E00002());

		await deleteTicketInfo(db, panelId);

		const confirm = await confirmDialog(
			interactionChannel,
			'本当にこのパネルを削除しますか？',
		);
		confirm.setOkLabel('削除');
		const isExe = await confirm.send(true);

		if (!isExe) return;

		const discordConfirm = await confirmDialog(
			interactionChannel,
			'discordのパネルも削除しますか？',
		);
		discordConfirm.setOkLabel('削除');
		const isDelete = await discordConfirm.send(false);

		if (isDelete) {
			try {
				const channel = guild.channels.cache.get(model.channelId);

				if (channel?.type !== ChannelType.GuildText) return;

				const message = await channel.messages.fetch(model.panelId);
				await message.delete();
			} catch {}
		}

		return model;
	});

	await makeEditMainPanel(
		model,
		interactionChannel,
		false,
		'15秒後に削除します！',
	).then(async () => {
		const previewMessage = editPanelStore.getbyPreviewMessageId(panelId);
		const previewPanel = editPanelStore.getByPanelId(panelId);

		await sendMessageThenDelete(
			{
				sleepSecond: 15,
				content: '設定を削除しました！',
			},
			undefined,
			interactionChannel,
		);
		if (previewMessage) {
			await previewMessage.delete();
			await previewPanel?.delete();
		}
		await interaction.deleteReply();
	});
};
