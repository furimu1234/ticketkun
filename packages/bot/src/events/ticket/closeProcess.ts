import { convertMessageOptionsFromDB, getTicket } from '@ticket/db';
import { wrapSendError } from '@ticket/lib';
import {
	type ButtonInteraction,
	Events,
	type Guild,
	type ThreadChannel,
} from 'discord.js';
import { container } from '../../container';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: ButtonInteraction): Promise<void> {
	const customId = interaction.customId;
	if (!customId) return;

	if (!customId.startsWith('closeProcess:')) return;

	await interaction.deferUpdate();

	await wrapSendError({ ephemeral: false, interaction }, () =>
		main(interaction),
	);
}

const main = async (interaction: ButtonInteraction): Promise<void> => {
	const thread = getThreadChannel(interaction);
	const guild = interaction.guild;
	if (!thread || !guild) return;

	const panelId = extractPanelId(interaction.customId);
	if (!panelId) return;

	const store = container.getDataStore();
	const model = await store.do((db) => getTicket(db, panelId));
	if (!model?.process) return;

	let ignoreMembers: string[] = [];
	let ignoreRoles: string[] = [];

	// process の順序に意味がある可能性があるので直列処理
	for (const [, step] of Object.entries(model.process)) {
		switch (step.name) {
			case 'message': {
				const message = convertMessageOptionsFromDB(step.message);
				if (!thread.isSendable()) break;
				await thread.send(message);
				break;
			}

			case 'ignoreMembers': {
				ignoreMembers = step.users ?? [];
				ignoreRoles = step.roles ?? [];
				break;
			}

			case 'closeThread': {
				await removeMembersFromThread(
					thread,
					guild,
					ignoreMembers,
					ignoreRoles,
				);
				await thread.setArchived(true);
				break;
			}

			default:
				// 未対応のステップは無視（必要ならログ）
				break;
		}
	}
};

function extractPanelId(customId: string): string | null {
	const parts = customId.split(':');
	const id = parts.length ? parts[parts.length - 1] : undefined;
	return id && id.length > 0 ? id : null;
}

function getThreadChannel(
	interaction: ButtonInteraction,
): ThreadChannel | null {
	const ch = interaction.channel;
	return ch?.isThread() ? ch : null;
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
