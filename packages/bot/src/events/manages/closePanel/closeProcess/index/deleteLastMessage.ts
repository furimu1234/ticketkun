import { getCloseProcess, updateCloseProcess } from '@ticket/db';
import { messageID, SendError, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
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

	if (action !== 'lastMessageDelete') return;

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

	if (process.name !== 'lastMessageDelete') return;

	const botMessage = await interChannel.send('秒数を指定してください!');

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

	const delayOrUndefined = reply.first();

	if (!delayOrUndefined) return;

	const delay = delayOrUndefined.content.trim();

	if (delay === 'キャンセル') return;

	await botMessage.delete().catch(() => null);

	if (Number.isNaN(delay))
		throw new SendError(messageID.E00007('数字のみを入力してください'));

	process.delay = Number.parseInt(delay);

	await store.do(async (db) => {
		await updateCloseProcess(db, model, originalCustomId);
	});

	await makeEditProcess(originalCustomId, interChannel);
};
