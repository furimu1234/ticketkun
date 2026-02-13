import { getTicketInfo } from '@ticket/db';
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
		addTextDisplayBuilder('# ボタン追加・変更・削除メニュー'),
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
