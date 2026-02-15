import { type DiscordMessageButtonRow, getTicketInfo } from '@ticket/db';
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
import { createPreviewModel } from './shared';
export const makeEditMainPanel = async (
	oldmodel: Awaited<ReturnType<typeof getTicketInfo>>,
	editChannel: SendableChannels,
	forceUpdate: boolean = false,
	previewNewContent?: string,
	isShowEmoji: boolean = true,
) => {
	if (!oldmodel) return;

	const store = container.getDataStore();

	const model = await store.do(
		async (db) => await getTicketInfo(db, oldmodel.panelId),
	);
	if (!model) return;

	const fromDBMessageOptions = createPreviewModel(model.mainPanel);

	let previewMessage = editPanelStore.getbyPreviewMessageId(model.panelId);

	if (!previewMessage || forceUpdate) {
		previewMessage = await editChannel.send('# [プレビュー] メインパネル');
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

	const row0 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'edit_mainpanel',
			label: 'パネル適用',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'delete_setting',
			label: 'この設定を削除',
			style: ButtonStyle.Danger,
		}),
	);
	containerBuilder.addActionRowComponents(row0);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	containerBuilder.addTextDisplayComponents(
		addTextDisplayBuilder(
			`# お問い合わせメニュー\nURL: https://discord.com/channels/${model.serverId}/${model.channelId}/${model.panelId}`,
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
			customId: 'edit_content',
			label: '付属文変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_title',
			label: 'パネルタイトル変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_desc',
			label: 'パネル本文変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_color',
			label: 'パネル枠線カラー変更',
			style: ButtonStyle.Success,
		}),
	);

	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'edit_header',
			label: 'ヘッダー変更',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_footer',
			label: 'フッター変更',
			style: ButtonStyle.Success,
		}),
	);

	const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder({
			customId: 'add_field',
			label: 'フィールド追加',
			style: ButtonStyle.Success,
		}),
		new ButtonBuilder({
			customId: 'edit_field',
			label: 'フィールド変更',
			style: ButtonStyle.Primary,
		}),
		new ButtonBuilder({
			customId: 'delete_field',
			label: 'フィールド削除',
			style: ButtonStyle.Danger,
		}),
	);

	containerBuilder.addActionRowComponents(row1, row2, row3);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	containerBuilder.addTextDisplayComponents(
		addTextDisplayBuilder('# ボタン変更メニュー'),
	);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	if (model.mainPanel.rows?.version === 1) {
		for (const components of model.mainPanel.rows.components) {
			const row = new ActionRowBuilder<ButtonBuilder>();

			for (const component of components) {
				if (component.type === 'button') {
					const button = new ButtonBuilder({
						label: `${component.label}を編集`,
						customId: `editMainPanelComponent-${component.customId}-${model.panelId}`,
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

	try {
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
	} catch (e) {
		const s = e instanceof Error ? (e.stack ?? e.message) : JSON.stringify(e);
		if (s.includes('COMPONENT_INVALID_EMOJI') || s.includes('Invalid emoji')) {
			await previewMessage.delete().catch(() => null);
			await editPanel.delete().catch(() => null);

			await makeEditMainPanel(
				oldmodel,
				editChannel,
				forceUpdate,
				previewNewContent,
				false,
			);
			return;
		}
	}
};

export const makeEditMainPanelButton = async (
	targetCustomId: string,
	targetComponent: DiscordMessageButtonRow,
	panelId: string,
) => {
	const containerBuilder = new ContainerBuilder();

	containerBuilder.addActionRowComponents(
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder({
				customId: `editToMainPanel-${targetCustomId}-${panelId}`,
				label: 'メインパネルに変更',
				style: ButtonStyle.Primary,
			}),
		),
	);

	containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## ラベル変更\n- ${targetComponent.label}`,
			buttonLabel: 'ラベル変更',
			buttonCustomId: `editMainPanelLabel-${targetCustomId}-${panelId}`,
		}),
	);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## 色変更\n- ${styleToJp(targetComponent.style)}`,
			buttonLabel: '	色変更',
			buttonCustomId: `editMainPanelColor-${targetCustomId}-${panelId}`,
		}),
	);
	containerBuilder.addSeparatorComponents(addSeparatorBuilder());

	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## 絵文字変更\n- ${targetComponent.emoji}`,
			buttonLabel: '絵文字変更',
			buttonCustomId: `editMainPanelEmoji-${targetCustomId}-${panelId}`,
		}),
	);

	const panel = editPanelStore.getbyEditPanelId(panelId);

	await panel?.edit({
		components: [containerBuilder],
		flags: MessageFlags.IsComponentsV2,
	});
};

export const styleToJp = (style: ButtonStyle) => {
	switch (style) {
		case ButtonStyle.Primary:
			return '青色';
		case ButtonStyle.Danger:
			return '赤色';
		case ButtonStyle.Secondary:
			return '灰色';
		case ButtonStyle.Success:
			return '緑色';
	}

	return '不明な色';
};
