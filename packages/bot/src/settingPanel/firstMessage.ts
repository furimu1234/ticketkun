import { getTicket, getTicketInfo } from '@ticket/db';
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

export const makeEditCloseFirstMessage = async (
	panelId: string,
	editChannel: SendableChannels,
	forceUpdate: boolean = false,
	previewNewContent?: string,
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
