import { createCloseProcess, getTicket } from '@ticket/db';
import { messageID, SendError, selector, wrapSendError } from '@ticket/lib';
import { type ButtonInteraction, Events } from 'discord.js';
import { container } from '../../../../container';
import { makeEditProcess } from '../../../../settingPanel';
import { editPanelStore } from '../../../../utils';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (interaction.customId !== 'closeProcess-addProcess') return;

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

	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	if (!interaction.channel?.isSendable()) return;

	const store = container.getDataStore();

	const model = await store.do(async (db) => await getTicket(db, panelId));
	const version = model?.firstMessages.rows?.version;

	if (version === 2) return;
	if (!model || !model.firstMessages.rows) return;

	const select = selector(
		interChannel,
		'処理に紐づけるボタンを選択してください!\nそのボタンが押されたときに処理が発火されます!',
	);
	select.setMinSize(1);
	select.setMaxSize(1);

	const selectResults = await select.string(
		'処理に紐づけるボタンを選択してください!',
		model.firstMessages.rows.components.flat().flatMap((col) => {
			if (col.type !== 'button') return [];

			return [
				{
					name: col.buttonName ?? col.label,
					value: col.buttonName ?? col.label,
				},
			];
		}),
	);

	const result = selectResults[0];

	const customId = `closeProcess:${result}:${panelId}`;

	await store.do(async (db) => {
		await createCloseProcess(db, {
			triggerCustomId: customId,
			panelId: panelId,
			process: [{ name: 'message', message: { content: '新しい処理だよ!' } }],
		});
	});

	await makeEditProcess(customId, interaction.channel);
};
