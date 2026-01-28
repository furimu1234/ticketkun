import { MakeDataStore, schema } from '@ticket/db';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { IContainer } from './types';

dotenv.config({ path: '../../.env' });

export const Container = (): IContainer => {
	const getDataStore = () => {
		const pool = new Pool({
			connectionString: process.env.PG_URL,
		});

		const client = drizzle<typeof schema>(pool, {
			schema: schema,
		});

		const dataStore = MakeDataStore(client);
		return dataStore;
	};

	// const getEditPanelStore = () => {
	// 	return editPanelMap();
	// };

	return {
		getDataStore,
	};
};

export const container: IContainer = Container();

export const botClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.GuildMember, Partials.User],
});

botClient.setMaxListeners(0);
