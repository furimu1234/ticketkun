import { REST, Routes, type User } from 'discord.js';
import type { slashCommands } from '../types';
import { getEnv } from './env';

export async function slashCommandRegister(
	clientUser: User,
	commands: slashCommands,
) {
	const rest = new REST().setToken(getEnv('TOKEN'));
	await rest.put(Routes.applicationCommands(clientUser.id), {
		body: commands,
	});
}
