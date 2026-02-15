import { getCloseProcess, updateCloseProcess } from '@ticket/db';
import type { CloseProcessStep } from '@ticket/db/dist/processHandmeid';
import { selector, sendMessageThenDelete, wrapSendError } from '@ticket/lib';
import {
	type ButtonInteraction,
	ButtonStyle,
	ComponentType,
	ContainerBuilder,
	Events,
	MessageFlags,
	roleMention,
	userMention,
} from 'discord.js';
import { addSectionWithButtonBuilder } from '../../../../../components/shared';
import { container } from '../../../../../container';
import { makeEditProcess } from '../../../../../settingPanel';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.customId) return;
	if (!interaction.customId.startsWith(`edit_close_process`)) return;

	const [_, originalCustomId, stringIndex, action] =
		interaction.customId.split('-');

	const index = Number.parseInt(stringIndex);

	if (Number.isNaN(index)) return;

	if (action !== 'includeMembers') return;

	const interChannel = interaction.channel;

	if (!interChannel?.isSendable()) return;

	await wrapSendError(
		{ ephemeral: false, channel: interChannel },
		async () => await main(interaction, originalCustomId, index),
	);
}

const main = async (
	interaction: ButtonInteraction,
	originalCustomId: string,
	index: number,
) => {
	const store = container.getDataStore();

	const guild = interaction.guild;

	if (!guild) return;

	const interChannel = interaction.channel;
	if (!interChannel?.isSendable()) return;

	await interaction.deferUpdate();

	const model = await store.do(
		async (db) => await getCloseProcess(db, originalCustomId),
	);
	if (!model) return;

	const process = model.process[index];

	if (process.name !== 'includeMembers') return;
	const containerBuilder = makeContainer(process);
	if (!containerBuilder) return;

	const message = await interChannel.send({
		components: [containerBuilder],
		flags: MessageFlags.IsComponentsV2,
	});

	while (true) {
		let reply: ButtonInteraction | undefined;

		try {
			reply = await message.awaitMessageComponent({
				componentType: ComponentType.Button,
				filter: (i) =>
					i.user.id === interaction.user.id && i.message.id === message.id,
				time: 60 * 60 * 1_000,
			});
		} catch (e) {
			console.error(e);
			break;
		}

		if (!reply) return;

		await reply.deferUpdate();

		if (reply.customId === 'edit_include_roles') {
			const select = selector(interChannel, '含めるロールを選択してください!');
			select.setMinSize(0);
			select.setMaxSize(25);
			process.roles = (await select.role(guild, process.roles)).map(
				(role) => role.id,
			);
		}
		if (reply.customId === 'edit_include_users') {
			const select = selector(interChannel, '含めるユーザを選択してください!');
			select.setMinSize(0);
			select.setMaxSize(25);
			process.users = (await select.user(guild, process.users)).map(
				(user) => user.id,
			);
		}

		if (reply.customId === 'update') break;

		const containerBuilder = makeContainer(process);
		if (!containerBuilder) return;

		await message.edit({
			components: [containerBuilder],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	await store.do(async (db) => {
		await updateCloseProcess(db, model, originalCustomId);
	});

	const roles = process.roles.map((role) => `${roleMention(role)}`).join('\n');
	const users = process.users.map((user) => `${userMention(user)}`).join('\n');

	await message.delete().catch(() => {});
	await sendMessageThenDelete(
		{
			sleepSecond: 15,
			content: `## 含めるロール一覧\n${roles}\n\n## 含めるユーザ一覧\n${users}`,
		},
		interaction,
	);

	await makeEditProcess(originalCustomId, interChannel);
};

const makeContainer = (process: CloseProcessStep) => {
	if (process.name !== 'includeMembers') return;

	const containerBuilder = new ContainerBuilder();
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## DB反映`,
			buttonLabel: '反映',
			buttonCustomId: 'update',
			buttonStyle: ButtonStyle.Success,
		}),
	);
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## 含めるロール\n${process.roles.map((role) => `- ${roleMention(role)}`).join('\n')}`,
			buttonLabel: '含めるロール変更',
			buttonCustomId: 'edit_include_roles',
			buttonStyle: ButtonStyle.Danger,
		}),
	);
	containerBuilder.addSectionComponents(
		addSectionWithButtonBuilder({
			contents: `## 含めるユーザ\n${process.users.map((user) => `- ${userMention(user)}`).join('\n')}`,
			buttonLabel: '含めるユーザ変更',
			buttonCustomId: 'edit_include_users',
			buttonStyle: ButtonStyle.Danger,
		}),
	);

	return containerBuilder;
};
