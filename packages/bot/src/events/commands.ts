import { Events, type Interaction } from 'discord.js';
import { commandsCollection } from '../commands/main';
import { container } from '../container';

export const name = Events.InteractionCreate;
export const once = false;
export async function execute(interaction: Interaction): Promise<void> {
	if (!container.current) return;

	if (!interaction.isChatInputCommand()) return;

	const commandExecute = commandsCollection.get(interaction.commandName);

	if (!commandExecute) {
		console.error(`${interaction.commandName} is not found Execute`);
		return;
	}

	try {
		await commandExecute(interaction);
	} catch (e) {
		console.log(e);
	}
}
