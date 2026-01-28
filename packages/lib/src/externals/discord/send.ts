import {
	type ButtonInteraction,
	type CacheType,
	type ChatInputCommandInteraction,
	type InteractionReplyOptions,
	type Message,
	type MessageCreateOptions,
	MessageFlags,
	type SendableChannels,
	type StringSelectMenuInteraction,
	TimestampStyles,
	time,
} from 'discord.js';
import { sleep } from '../../';

export const deleteMessages = async (messages: Message<false | true>[]) => {
	messages.map(async (m) => {
		await m.delete();
	});
};
type createMessageOptions = (MessageCreateOptions | InteractionReplyOptions) & {
	sleepSecond: number;
};

/**
 * メッセージ送信後、送信したメッセージを一定秒後に削除する
 * @param options 送信メッセージオプション
 * @param interaction interaction : uiやスラコマのレスポンスの場合
 * @param channel　チャンネルの場合
 */
export async function sendMessageThenDelete(
	options: createMessageOptions,
	interaction?:
		| ButtonInteraction<CacheType>
		| ChatInputCommandInteraction<CacheType>
		| StringSelectMenuInteraction,
	channel?: SendableChannels,
) {
	let message: Message | undefined;

	const future = new Date(Date.now() + options.sleepSecond * 1000);

	const futureStr = time(future, TimestampStyles.RelativeTime);

	options.content = options.content
		? `${options.content}\nこのメッセージは${futureStr}に削除されます。`
		: `このメッセージは${futureStr}後に削除されます。`;

	if (interaction) {
		let message: Message | undefined;

		try {
			const reply = await interaction.reply(options as InteractionReplyOptions);

			if (options.flags !== MessageFlags.Ephemeral) {
				message = await reply.fetch();
			}
		} catch {
			const reply = await interaction.followUp(
				options as InteractionReplyOptions,
			);
			if (options.flags !== MessageFlags.Ephemeral) {
				message = await reply.fetch();
			}
		}
	} else if (channel) {
		const reply = await channel.send(options as MessageCreateOptions);
		message = await reply.fetch();
	}

	if (message) {
		await sleep(options.sleepSecond);

		try {
			await message.delete();
		} catch {}
	}
}
