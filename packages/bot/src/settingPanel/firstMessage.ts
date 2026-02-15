import {
	type DiscordMessageButtonRow,
	getTicket,
	getTicketInfo,
} from '@ticket/db';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	type SendableChannels,
	TextDisplayBuilder,
} from 'discord.js';
import {
	addSectionWithButtonBuilder,
	addSeparatorBuilder,
	addTextDisplayBuilder,
} from '../components/shared';
import { container } from '../container';
import { editPanelStore } from '../utils';
import { styleToJp } from './mainPanel';
import { createPreviewModel } from './shared';

export const makeEditCloseFirstMessage = async (
	panelId: string,
	editChannel: SendableChannels,
	forceUpdate: boolean = false,
	previewNewContent?: string,
	isShowEmoji: boolean = true,
) => {
	const store = container.getDataStore();

	const { model, mainModel } = await store.do(async (db) => {
		const model = await getTicket(db, panelId);
		const mainModel = await getTicketInfo(db, panelId);

		return { model, mainModel };
	});
	if (!model || !mainModel) return;

	const fromDBMessageOptions = createPreviewModel(model.firstMessages);

	let previewMessage = editPanelStore.getbyPreviewMessageId(model.panelId);

	if (!previewMessage || forceUpdate) {
		previewMessage = await editChannel.send('# [プレビュー] ファーストパネル');
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

	containerBuilder.addTextDisplayComponents(
		addTextDisplayBuilder(
			`# お問い合わせメニュー\nURL: https://discord.com/channels/${mainModel.serverId}/${mainModel.channelId}/${mainModel.panelId}`,
		),
	);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	containerBuilder.addTextDisplayComponents(
		new TextDisplayBuilder({
			content: '# パネル内容変更メニュー\n現在のパネルバージョン: 1',
		}),
	);

	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'edit_first_message_content',
			label: '付属文変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_first_message_title',
			label: 'パネルタイトル変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_first_message_desc',
			label: 'パネル本文変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_first_message_color',
			label: 'パネル枠線カラー変更',
			style: ButtonStyle.Success,
		}),
	);

	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'edit_first_message_header',
			label: 'ヘッダー変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_first_message_footer',
			label: 'フッター変更',
			style: ButtonStyle.Success,
		}),
	);

	const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'add_first_message_field',
			label: 'フィールド追加',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_first_message_field',
			label: 'フィールド変更',
			style: ButtonStyle.Primary,
		}),
		new ButtonBuilder({
			customId: 'delete_first_message_field',
			label: 'フィールド削除',
			style: ButtonStyle.Danger,
		}),
	);

	containerBuilder.addActionRowComponents(row1, row2, row3);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: '# ボタン追加・変更・削除メニュー',
			buttonCustomId: `addFirstMessagesButton`,
			buttonLabel: 'ボタン追加',
			buttonStyle: ButtonStyle.Primary,
		}),
	);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	if (model.firstMessages.rows?.version === 1) {
		for (const components of model.firstMessages.rows.components) {
			const row = new ActionRowBuilder<ButtonBuilder>();

			for (const component of components) {
				if (component.type === 'button') {
					const button = new ButtonBuilder({
						label: `${component.label}を編集`,
						customId: `editFirstMessagesComponent-${component.customId}-${model.panelId}`,
						style: component.style,
					});

					if (isShowEmoji && component.emoji) {
						button.setEmoji(component.emoji);
					}

					row.addComponents(button);
				}
			}
			containerBuilder.addActionRowComponents(row);
		}
	}

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

export const makeEditFirstMessagesButton = async (
	targetCustomId: string,
	targetComponent: DiscordMessageButtonRow,
	panelId: string,
) => {
	const containerBuilder = new ContainerBuilder();

	containerBuilder.addActionRowComponents(
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `editToFirstMessages-${targetCustomId}-${panelId}`,
				label: 'メインパネルに変更',
				style: ButtonStyle.Primary,
			}),

			new ButtonBuilder({
				customId: `deleteFirstMessagesButton-${targetCustomId}-${panelId}`,
				label: 'ボタン削除',
				style: ButtonStyle.Danger,
			}),
		),
	);

	//TODO:
	// ボタン削除時の処理(メインパネルも)

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## ラベル変更\n- ${targetComponent.label}`,
			buttonLabel: 'ラベル変更',
			buttonCustomId: `editFirstMessagesLabel-${targetCustomId}-${panelId}`,
		}),
	);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## 色変更\n- ${styleToJp(targetComponent.style)}`,
			buttonLabel: '	色変更',
			buttonCustomId: `editFirstMessagesColor-${targetCustomId}-${panelId}`,
		}),
	);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## 絵文字変更\n- ${targetComponent.emoji ?? '絵文字なし'}`,
			buttonLabel: '絵文字変更',
			buttonCustomId: `editFirstMessagesEmoji-${targetCustomId}-${panelId}`,
		}),
	);

	const panel = editPanelStore.getbyEditPanelId(panelId);

	await panel?.edit({
		components: [containerBuilder],
		flags: MessageFlags.IsComponentsV2,
	});
};
