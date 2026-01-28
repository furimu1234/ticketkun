import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CacheType,
	ComponentType,
	type MessageActionRowComponentBuilder,
	type SendableChannels,
} from 'discord.js';
import { sleep } from '.';
import { generateRandomString } from './random';

export const confirmDialog = (
	sendableChannel: SendableChannels,
	question: string,
) => {
	const okCustomId = generateRandomString();
	const noCustomId = generateRandomString();

	let okStyle = ButtonStyle.Success;
	let noStyle = ButtonStyle.Danger;
	let okLabel = '続行';
	let noLabel = 'キャンセル';
	let cancelMessage = 'キャンセルしました。処理を中断します。';

	const setOkStyle = (style: ButtonStyle) => {
		okStyle = style;
	};

	const setNoStyle = (style: ButtonStyle) => {
		noStyle = style;
	};

	const setOkLabel = (label: string) => {
		okLabel = label;
	};
	const setNoLabel = (label: string) => {
		noLabel = label;
	};
	const setCancelMessage = (message: string) => {
		cancelMessage = message;
	};

	const send = async (isCancel: boolean) => {
		const panel = await sendableChannel.send({
			content: `${question}\n3分経過すると処理が中断します。`,
			components: [
				new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(okCustomId)
						.setLabel(okLabel)
						.setStyle(okStyle),
					new ButtonBuilder()
						.setCustomId(noCustomId)
						.setLabel(noLabel)
						.setStyle(noStyle),
				),
			],
		});
		const reply = await panel.fetch();

		let pushedButtonPanelType: ButtonInteraction<CacheType> | undefined;

		try {
			pushedButtonPanelType = await reply.awaitMessageComponent({
				componentType: ComponentType.Button,
				time: 3 * 60 * 1000,
			});
			await pushedButtonPanelType.deferUpdate();
			await pushedButtonPanelType.deleteReply();
		} catch {
			return false;
		}

		if (!pushedButtonPanelType) {
			const message = await sendableChannel.send({
				content: '3分間経過しました。処理を中断します。',
			});
			await sleep(15);
			await message.delete();
			return false;
		}

		if (isCancel && pushedButtonPanelType.customId === noCustomId) {
			const message = await sendableChannel.send({
				content: cancelMessage,
			});
			sleep(15).then(async () => await message.delete());
			return false;
		}

		return pushedButtonPanelType.customId === okCustomId;
	};

	return {
		setCancelMessage,
		setOkLabel,
		setOkStyle,
		setNoLabel,
		setNoStyle,
		send,
	};
};
