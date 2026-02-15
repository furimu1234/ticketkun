import { getCloseProcess, updateCloseProcess } from '@ticket/db';
import { selector, sendMessageThenDelete, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { container } from '../../../../container';
import { makeEditProcess } from '../../../../settingPanel';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`edit_close_process`)) return;

	const [_, originalCustomId, action] = interaction.customId.split('-');

	if (action !== 'sort') return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction, originalCustomId),
	);
}

const main = async (
	interaction: ButtonInteraction,
	originalCustomId: string,
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
	const select1 = selector(
		interChannel,
		'1つ目の順番を変更する処理を変更してください!',
	);

	select1.setMinSize(1);
	select1.setMaxSize(1);
	const target1 = await select1.string(
		'順番を変更する処理を変更してください!',
		model.process.map((process, i) => ({
			name: process.name,
			value: i.toString(),
		})),
	);
	const idxA = Number.parseInt(target1[0]);

	const select2 = selector(
		interChannel,
		'2つ目の順番を変更する処理を変更してください!',
	);

	select2.setMinSize(1);
	select2.setMaxSize(1);
	const target2 = await select2.string(
		'順番を変更する処理を変更してください!',
		model.process.flatMap((process, i) => {
			return [{ name: process.name, value: i.toString() }];
		}),
	);
	const idxB = Number.parseInt(target2[0]);

	if (idxA === -1 || idxB === -1) {
		await sendMessageThenDelete(
			{ sleepSecond: 10, content: '選択した処理が見つかりませんでした。' },
			interaction,
		);
		return;
	}

	// swap
	[model.process[idxA], model.process[idxB]] = [
		model.process[idxB],
		model.process[idxA],
	];

	await store.do(async (db) => {
		await updateCloseProcess(db, model, originalCustomId);
	});

	await makeEditProcess(originalCustomId, interChannel);
};
