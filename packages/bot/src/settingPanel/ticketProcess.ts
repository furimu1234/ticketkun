import { getTicket } from '@ticket/db';
import {
	ActionRowBuilder,
	ButtonStyle,
	ContainerBuilder,
	RoleSelectMenuBuilder,
	type SendableChannels,
} from 'discord.js';
import {
	addSectionWithButtonBuilder,
	addSeparatorBuilder,
	addTextDisplayBuilder,
} from '../components/shared';
import { container } from '../container';
import { editPanelStore } from '../utils';
import { createPreviewModel } from './shared';

export const makeEditTicketProcess = async (
	panelId: string,
	editChannel: SendableChannels,
	forceUpdate: boolean = false,
	previewNewContent?: string,
) => {
	const store = container.getDataStore();

	const model = await store.do(async (db) => {
		return await getTicket(db, panelId);
	});

	if (!model) return;

	const fromDBMessageOptions = createPreviewModel(model.firstMessages);

	let previewMessage = editPanelStore.getbyPreviewMessageId(model.panelId);

	if (!previewMessage || forceUpdate) {
		previewMessage = await editChannel.send('# [プレビュー] チケット内処理');
		editPanelStore.setbyPreviewMessageId(model.panelId, previewMessage);
	} else if (previewNewContent) {
		await previewMessage.edit(previewNewContent);
	}

	let editPanel = editPanelStore.getByPanelId(model.panelId);

	if (!editPanel || forceUpdate) {
		editPanel = await editChannel.send(fromDBMessageOptions);
		editPanelStore.setByPanelId(model.panelId, editPanel);
	} else {
		await editPanel.edit({
			...fromDBMessageOptions,
		});
	}

	const containerBuilder = new ContainerBuilder();
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: '# チケット内ファーストメッセージを編集',
			buttonCustomId: 'edit_firstmessage',
			buttonLabel: '編集する',
			buttonStyle: ButtonStyle.Success,
		}),
	);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: '# クローズ処理を編集',
			buttonCustomId: 'edit_closeProcess',
			buttonLabel: '編集する',
			buttonStyle: ButtonStyle.Secondary,
		}),
	);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	containerBuilder.addTextDisplayComponents(
		addTextDisplayBuilder(
			'# クローズ時残ロール\nクローズ時に指定されたロールを持ってる人がチケットに残ります。',
		),
	);

	containerBuilder.addActionRowComponents(
		new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
			new RoleSelectMenuBuilder()
				.setCustomId('select_ignore_roles')
				.setMaxValues(1),
		),
	);
};
