import {
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	MessageFlags,
	type SendableChannels,
	type StringSelectMenuInteraction,
} from 'discord.js';
import { SendError } from './errors';
import { sendMessageThenDelete } from './externals/discord/send';

export const wrapSendError = async (
	sendErrorOptions: {
		ephemeral: boolean;
		channel?: SendableChannels;
		interaction?:
			| ChatInputCommandInteraction
			| ButtonInteraction
			| StringSelectMenuInteraction;
	},
	fn: () => Promise<void>,
) => {
	try {
		await fn();
	} catch (e) {
		console.log(e);
		if (e instanceof SendError) {
			const content = e.isZod ? JSON.parse(e.message)[0].message : e.message;

			await sendMessageThenDelete(
				{
					content: content,
					sleepSecond: 60,
					flags:
						sendErrorOptions.ephemeral === true
							? MessageFlags.Ephemeral
							: MessageFlags.SuppressNotifications,
				},
				sendErrorOptions.interaction,
				sendErrorOptions.channel,
			);
		} else console.log(e);
	}
};

export const wrap = (
	ephemeral: boolean,
	channel?: SendableChannels,
	interaction?:
		| ChatInputCommandInteraction
		| ButtonInteraction
		| StringSelectMenuInteraction,
) => {
	const sendError = async (fn: () => Promise<void>) => {
		try {
			await fn();
		} catch (e) {
			if (e instanceof SendError) {
				const content = e.isZod ? JSON.parse(e.message)[0].message : e.message;

				await sendMessageThenDelete(
					{
						content: content,
						sleepSecond: 60,
						flags:
							ephemeral === true
								? MessageFlags.Ephemeral
								: MessageFlags.SuppressNotifications,
					},
					interaction,
					channel,
				);
			} else console.log(e);
		}
	};

	return {
		sendToDiscordError: sendError,
	};
};
