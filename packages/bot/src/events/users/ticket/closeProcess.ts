import {
	convertMessageOptionsFromDB,
	getCloseProcess,
	getUserTicket,
} from '@ticket/db';
import {
	messageID,
	sendMessageThenDelete,
	sleep,
	wrapSendError,
} from '@ticket/lib';
import {
	type ButtonInteraction,
	ChannelType,
	Events,
	type Guild,
	type Message,
	type PrivateThreadChannel,
	roleMention,
	type ThreadChannel,
	userMention,
} from 'discord.js';
import { container } from '../../../container';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: ButtonInteraction): Promise<void> {
	const customId = interaction.customId;
	if (!customId) return;
	if (!customId.startsWith('closeProcess:')) return;

	await interaction.deferUpdate();

	await wrapSendError({ ephemeral: false, interaction }, () =>
		main(interaction, customId),
	);
}

const main = async (
	interaction: ButtonInteraction,
	customId: string,
): Promise<void> => {
	let thread = getThreadChannel(interaction);
	const guild = interaction.guild;
	if (!thread || !guild) return;

	//customIdからメインパネルのIDを取得
	const panelId = extractPanelId(customId);
	if (!panelId) return;

	const store = container.getDataStore();
	const { closeProcessModel, userTicketModel } = await store.do(async (db) => {
		const closeProcessModel = await getCloseProcess(db, customId);
		const userTicketModel = await getUserTicket(db, thread?.id ?? '');

		return { closeProcessModel, userTicketModel };
	});
	if (!closeProcessModel?.process || !userTicketModel) return;

	let ignoreMembers: string[] = [];
	let ignoreRoles: string[] = [];
	let includeMembers: string[] = [];
	let includeRoles: string[] = [];
	let lastMessage: Message | undefined;

	for (const [, step] of Object.entries(closeProcessModel.process)) {
		switch (step.name) {
			case 'message': {
				const message = convertMessageOptionsFromDB(step.message);
				if (!thread?.isSendable()) break;
				lastMessage = await thread.send(message);
				break;
			}

			case 'ignoreMembers': {
				ignoreMembers = step.users.map((x) => {
					if (x === 'creator') return userTicketModel.creatorId;
					else return x;
				});
				ignoreRoles = step.roles ?? [];
				break;
			}
			case 'includeMembers': {
				includeMembers = step.users.map((x) => {
					if (x === 'creator') return userTicketModel.creatorId;
					else return x;
				});
				includeRoles = step.roles ?? [];
				break;
			}

			case 'closeThread': {
				if (step.target !== 'same') {
					thread =
						thread?.parent?.threads.cache
							.filter((c) => c.type === ChannelType.PrivateThread)
							.get(step.target ?? '') ?? null;
				}

				if (!thread) break;

				await removeMembersFromThread(
					thread,
					guild,
					ignoreMembers,
					ignoreRoles,
				);
				await thread.setArchived(true);
				break;
			}

			case 'openThread': {
				if (step.target !== 'same') {
					thread =
						thread?.parent?.threads.cache
							.filter((c) => c.type === ChannelType.PrivateThread)
							.get(step.target ?? '') ?? null;
				}

				if (!thread) break;

				if (step.target === 'same') {
					//同じスレッドが対象の時
				} else {
					if (!thread.parent) return;
					const targetThread = thread.parent.threads.cache.get(
						step.target ?? '',
					);
					if (targetThread?.type !== ChannelType.PrivateThread) return;
					thread = targetThread;
				}

				//チケットを再オープンするときにチケット作成者を含めるか
				if (step.includeCreator) {
					const userTicketModel = await store.do(
						async (db) => await getUserTicket(db, thread?.id ?? ''),
					);

					if (userTicketModel) {
						await thread.members.add(userTicketModel.creatorId);
					}
				}

				await thread.setArchived(false);
				await sendThreadMember(thread, includeRoles, includeMembers);
				break;
			}
			case 'threadDelete': {
				if (step.target !== 'same') {
					thread =
						thread?.parent?.threads.cache
							.filter((c) => c.type === ChannelType.PrivateThread)
							.get(step.target ?? '') ?? null;
				}

				if (!thread) break;

				await thread.delete();
				break;
			}

			case 'lastMessageDelete': {
				const delayDelete = async () => {
					if (!lastMessage) return;
					await sleep(step.delay);
					await lastMessage.delete().catch(async (e) => {
						const s =
							e instanceof Error ? (e.stack ?? e.message) : JSON.stringify(e);
						if (s.includes('Thread is archived')) {
							await sendMessageThenDelete(
								{
									sleepSecond: 15,
									content: messageID.E00008(),
								},
								interaction,
							);
						}
					});
				};

				delayDelete();

				break;
			}

			default:
				break;
		}
	}
};

const sendThreadMember = async (
	thread: PrivateThreadChannel,
	roleIds: string[],
	userIds: string[],
) => {
	let content = '';

	for (const roleId of roleIds) {
		if (content.length > 1950) {
			await thread.send(content);
			content = '';
		}

		content += `${roleMention(roleId)}, `;
	}
	if (content.length !== 0) {
		await thread.send(content);
	}

	for (const userId of userIds) {
		if (content.length > 1950) {
			await thread.send(content);
			content = '';
		}

		content += `${userMention(userId)}, `;
	}

	if (content.length !== 0) {
		await thread.send(content);
	}
};

function extractPanelId(customId: string): string | null {
	if (!customId.startsWith('closeProcess')) return null;

	const parts = customId.split(':');
	const id = parts.length ? parts[parts.length - 1] : undefined;
	return id && id.length > 0 ? id : null;
}

function getThreadChannel(
	interaction: ButtonInteraction,
): PrivateThreadChannel | null {
	const ch = interaction.channel;

	return ch?.type === ChannelType.PrivateThread ? ch : null;
}

async function removeMembersFromThread(
	thread: ThreadChannel,
	guild: Guild,
	ignoreMembers: readonly string[],
	ignoreRoles: readonly string[],
): Promise<void> {
	// 必要なら thread.members.fetch() でメンバー一覧を最新化
	// await thread.members.fetch().catch(() => undefined);

	for (const [, threadMember] of thread.members.cache) {
		const userId = threadMember.id;

		if (ignoreMembers.includes(userId)) continue;

		// cache → fetch の順に取得（fetch失敗はスキップ）
		const guildMember =
			guild.members.cache.get(userId) ??
			(await guild.members.fetch(userId).catch(() => null));

		if (!guildMember) continue;

		const hasIgnoredRole = ignoreRoles.some((roleId) =>
			guildMember.roles.cache.has(roleId),
		);
		if (hasIgnoredRole) continue;

		await threadMember.remove();
	}
}
