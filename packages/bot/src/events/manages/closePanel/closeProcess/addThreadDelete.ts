import { getCloseProcess, updateCloseProcess } from '@ticket/db';
import { wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { container } from '../../../../container';
import { makeEditProcess } from '../../../../settingPanel';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`edit_close_process`)) return;

	const [_, originalCustomId, action] = interaction.customId.split('-');

	if (action !== 'add_thread_delete') return;

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

	model.process.push({
		name: 'threadDelete',
		target: 'same',
	});

	await store.do(async (db) => {
		await updateCloseProcess(db, model, originalCustomId);
	});

	await makeEditProcess(originalCustomId, interChannel);
};
