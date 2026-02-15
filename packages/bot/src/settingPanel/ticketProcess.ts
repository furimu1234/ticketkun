import {
	getCloseProcess,
	getCloseProcessFromPanelId,
	getTicket,
} from '@ticket/db';
import type { CloseProcessStep } from '@ticket/db/dist/processHandmeid';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	type SendableChannels,
} from 'discord.js';
import {
	addSectionWithButtonBuilder,
	addSeparatorBuilder,
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

	const settingPanel = editPanelStore.getbyEditPanelId(model.panelId);

	if (!settingPanel || forceUpdate) {
		const settingPanel = await editChannel.send({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
		editPanelStore.setEditPanelIdToPanelId(settingPanel.id, model.panelId);
		editPanelStore.setbyEditPanelId(model.panelId, settingPanel);
	} else {
		await settingPanel.edit({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
	}
};

export const makeEditCloseProcessList = async (
	panelId: string,
	editChannel: SendableChannels,
) => {
	const store = container.getDataStore();

	const models = await store.do(
		async (db) => await getCloseProcessFromPanelId(db, panelId),
	);
	if (!models || models.length === 0) return;

	const containerBuilder = new ContainerBuilder();
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'closeProcess-addProcess',
			label: '処理を追加する',
			style: ButtonStyle.Success,
		}),
	);
	containerBuilder.addActionRowComponents(row);

	models.forEach((model) => {
		const triggerName = model.triggerCustomId.split(':')[1];

		const jpProcessList = model.process
			.map((process) => {
				return `- ${processNameToJp(process.name)}`;
			})
			.join('\n');

		containerBuilder.addSectionComponents(
			addSectionWithButtonBuilder({
				contents: `# ${triggerName}を編集する\n\n### 処理一覧\n${jpProcessList}`,
				buttonCustomId: `edit_close_process_list-${model.triggerCustomId}`,
				buttonLabel: '処理を編集する',
			}),
		);
		containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	});

	const settingPanel = editPanelStore.getbyEditPanelId(models[0].panelId ?? '');

	if (!settingPanel) {
		const settingPanel = await editChannel.send({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
		editPanelStore.setEditPanelIdToPanelId(
			settingPanel.id,
			models[0].panelId ?? '',
		);
		editPanelStore.setbyEditPanelId(models[0].panelId ?? '', settingPanel);
	} else {
		await settingPanel.edit({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
	}
};

const processNameToJp = (processName: CloseProcessStep['name']) => {
	switch (processName) {
		case 'message': {
			return 'メッセージ送信';
		}
		case 'lastMessageDelete': {
			return '直前のメッセージを削除';
		}
		case 'openThread': {
			return 'スレッドを再オープンする';
		}
		case 'closeThread': {
			return 'スレッドをクローズする';
		}
		case 'ignoreMembers': {
			return '除外メンバー・ロール追加';
		}
		case 'includeMembers': {
			return '含めるメンバー・ロール追加';
		}
		case 'threadDelete': {
			return 'スレッド削除追加';
		}
	}
};

export type CloseProcessAction =
	| 'add_message'
	| 'add_delete_last_message'
	| 'add_ignore_members'
	| 'add_include_members'
	| 'add_open_thread'
	| 'add_close_thread'
	| 'delete'
	| 'add_thread_delete';

export const makeAddProcessRow = (
	originalCustomId: string,
	prefix: string = 'edit',
	endJP: string = '追加',
) => {
	return [
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_message`,
				label: `メッセージ送信${endJP}`,
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_ignore_members`,
				label: `除外メンバー・ロール${endJP}`,
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_include_members`,
				label: `含めるメンバー・ロール${endJP}`,
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_open_thread`,
				label: `スレッドを再オープン${endJP}`,
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_close_thread`,
				label: `スレッドをクローズ${endJP}`,
				style: ButtonStyle.Success,
			}),
		),
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_thread_delete`,
				label: `スレッド削除${endJP}`,
				style: ButtonStyle.Success,
			}),
			new ButtonBuilder({
				customId: `${prefix}_close_process-${originalCustomId}-add_delete_last_message`,
				label: `直前のメッセージ削除${endJP}`,
				style: ButtonStyle.Success,
			}),
		),
	];
};

export const makeEditProcess = async (
	originalCustomId: string,
	editChannel: SendableChannels,
) => {
	const store = container.getDataStore();

	const model = await store.do(
		async (db) => await getCloseProcess(db, originalCustomId),
	);
	if (!model) return;

	const containerBuilder = new ContainerBuilder();
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: '- 処理追加\n - 処理並び替え(処理Aと処理Bの順番を入れ替える)',
			buttonCustomId: `edit_close_process-${originalCustomId}-sort`,
			buttonLabel: '処理並び替え',
			buttonStyle: ButtonStyle.Primary,
		}),
	);

	const row0 = makeAddProcessRow(originalCustomId);
	containerBuilder.addActionRowComponents(row0);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	model.process.forEach((process, i) => {
		let content = `## ${processNameToJp(process.name)}を変更する\n`;

		switch (process.name) {
			case 'message': {
				content +=
					'該当スレッドでメッセージを送信します。他の処理が影響することはありません。';
				break;
			}
			case 'lastMessageDelete': {
				content += `直前の処理で送信したメッセージを削除します。直前の処理から何秒遅延して削除するかのみ指定できます。\n- ${process.delay}`;
				break;
			}
			case 'ignoreMembers': {
				content +=
					'スレッドクローズ時にスレッドから除外するメンバーを設定します。';
				break;
			}
			case 'includeMembers': {
				content +=
					'スレッド再オープン時にスレッドに含めるメンバーを設定します。';

				break;
			}
			case 'openThread': {
				content += 'スレッドを再オープンします。';

				break;
			}
			case 'closeThread': {
				content += 'スレッドをクローズします。';
				break;
			}
			case 'threadDelete': {
				content += 'スレッドを削除します。';
				break;
			}

			case 'button': {
				content += '処理を発火させるボタンのみを設定します。';
				break;
			}
		}

		containerBuilder.addSectionComponents(
			addSectionWithButtonBuilder({
				contents: content,
				buttonCustomId: `edit_close_process-${originalCustomId}-${i}-${process.name}`,
				buttonLabel: '処理を変更する',
			}),
		);
		containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	});

	const settingPanel = editPanelStore.getbyEditPanelId(model.panelId ?? '');

	if (!settingPanel) {
		const settingPanel = await editChannel.send({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
		editPanelStore.setEditPanelIdToPanelId(
			settingPanel.id,
			model.panelId ?? '',
		);
		editPanelStore.setbyEditPanelId(model.panelId ?? '', settingPanel);
	} else {
		await settingPanel.edit({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
	}
};
