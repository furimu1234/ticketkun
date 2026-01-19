import * as path from 'node:path';
import { schema } from '@example_build/db';
import { type Client, Events } from 'discord.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { loadCommands } from './commands/main';
import { botClient, Container, container } from './container';
import { loadEvents } from './loadEvents';
import { getEnv } from './utils/env';
import { slashCommandRegister } from './utils/registerCommands';

loadEvents(botClient, path.resolve(path.dirname(__filename), './events'));

// 最小の ready ログだけ
botClient.once(Events.ClientReady, async (c) => {
	console.log(`✅ Logged in as ${c.user.tag}`);

	const commands = await loadCommands();

	if (!botClient.user) return;

	slashCommandRegister(botClient.user, commands);
});

// 起動に十分な最小構築
container.current = Container();

export const runClient = async (client: Client) => {
	const pool = new Pool({
		connectionString: process.env.PG_URL,
	});

	const db = drizzle<typeof schema>(pool, {
		schema: schema,
	});

	await migrate(db, {
		migrationsFolder: path.resolve(
			path.dirname(__filename),
			'../../db/drizzle',
		),
		migrationsSchema: path.resolve(path.dirname(__filename), '../../db/schema'),
	});
	client.login(getEnv('TOKEN')).catch((e) => {
		console.error('❌ Login failed:', e);
		process.exit(1);
	});
};

runClient(botClient);
