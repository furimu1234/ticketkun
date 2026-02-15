import { updateTicketInfo } from '@ticket/db';
import {
	messageID,
	SendError,
	selector,
	sendMessageThenDelete,
	wrapSendError,
} from '@ticket/lib';
import { type ButtonInteraction, ButtonStyle, Events } from 'discord.js';
import { container } from '../../../../../container';
import { makeEditMainPanelButton } from '../../../../../settingPanel';
import { editPanelStore } from '../../../../../utils';
import { getTargetButtonComponent } from './editButton';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith('editMainPanelColor-')) return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;
	await interaction.deferUpdate();

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction),
	);
}

const main = async (interaction: ButtonInteraction) => {
	const interChannel = interaction.channel;
	if (!interChannel?.isSendable()) return;

	const panelId = editPanelStore.getEditPanelIdToPanelId(
		interaction.message.id,
	);
	if (!panelId) throw new SendError(messageID.E00003());

	const targetCustomId = interaction.customId.split('-')[1];
	const { col, row, model, component } = await getTargetButtonComponent(
		targetCustomId,
		panelId,
	);

	if (!component) return;

	if (model?.mainPanel.rows?.version === 2) return;
	const button = model?.mainPanel.rows?.components[row][col];
	if (button?.type !== 'button') return;

	const select = selector(interChannel, 'ボタンの色を選んでください!');
	const result = await select.string(
		'ボタンの色を選んでね!',
		['青色', '赤色', '緑色', '灰色'].map((colorString) => ({
			name: colorString,
			value: colorString,
		})),
	);

	button.style = styleToDiscord(result[0]);

	const store = container.getDataStore();
	await store.do(async (db) => {
		await updateTicketInfo(db, model, panelId);
	});

	await makeEditMainPanelButton(targetCustomId, component, panelId);

	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content:
				'[メインパネルに変更]->[パネル適用]ボタン押下後、メインパネルに適用されます！',
		},
		interaction,
	);
};

export const styleToDiscord = (styleJp: string) => {
	switch (styleJp) {
		case '青色':
			return ButtonStyle.Primary;
		case '赤色':
			return ButtonStyle.Danger;
		case '緑色':
			return ButtonStyle.Success;
		case '灰色':
			return ButtonStyle.Secondary;
	}

	return ButtonStyle.Secondary;
};
