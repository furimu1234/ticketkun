import { getCloseProcess, updateCloseProcess } from '@ticket/db';
import {
	confirmDialog,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import {
	type ButtonInteraction,
	ButtonStyle,
	channelMention,
	Events,
	type Message,
} from 'discord.js';
import { container } from '../../../../../container';
import { makeEditProcess } from '../../../../../settingPanel';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`edit_close_process`)) return;

	const [_, originalCustomId, stringIndex, action] =
		interaction.customId.split('-');

	const index = Number.parseInt(stringIndex);

	if (Number.isNaN(index)) return;

	if (action !== 'closeThread') return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction, originalCustomId, index),
	);
}

const main = async (
	interaction: ButtonInteraction,
	originalCustomId: string,
	index: number,
) => {
	const store = container.getDataStore();

	const guild = interaction.guild;

	if (!guild) return;

	const interChannel = interaction.channel;
	if (!interChannel?.isSendable()) return;

	await interaction.deferUpdate();

	const model = await store.do(
		async (db) => await getCloseProcess(db, originalCustomId),
	);
	if (!model) return;

	const process = model.process[index];

	if (process.name !== 'closeThread') return;

	const nowChannel = process.target;

	const stringNowChannel =
		nowChannel === 'same' ? '同じスレッド' : channelMention(nowChannel ?? '');

	const confirm = confirmDialog(
		interChannel,
		`前後の処理を処理が行われてるスレッドで実行しますか？指定したスレッドで実行しますか？\n「指定したスレッド」で「キャンセル」と入力するとキャンセルします\n- 現在のスレッド: ${stringNowChannel}`,
	);

	confirm.setOkLabel('同じスレッド');
	confirm.setNoLabel('指定したスレッド');
	confirm.setNoStyle(ButtonStyle.Primary);
	const result = await confirm.send(false);

	let channel: string = 'same';
	let botMessage: Message | undefined;

	if (!result) {
		botMessage = await interChannel.send(
			'メインパネルがあるチャンネル内のスレッドIDを入力してください!',
		);

		const reply = await interChannel.awaitMessages({
			filter: (m) => {
				if (m.author.id !== interaction.user.id) return false;
				const content = m.content.trim();
				if (content.toLowerCase() === 'キャンセル') return true;
				return /^\d+$/.test(content);
			},
			max: 1,
			time: 60_000,
			errors: ['time'],
		});

		const channelOrUndefined = reply.first();

		if (!channelOrUndefined) return;

		channel = channelOrUndefined.content.trim();
	}

	if (channel === 'キャンセル') return;

	if (botMessage) await botMessage.delete();

	process.target = channel;

	await store.do(async (db) => {
		await updateCloseProcess(db, model, originalCustomId);
	});

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content: `${channel === 'same' ? '同じスレッド' : `スレッドID: ${channel}`}に設定したよ`,
		},
		interaction,
	);

	await makeEditProcess(originalCustomId, interChannel);
};
