import { relations } from 'drizzle-orm';
import {
	boolean,
	char,
	index,
	integer,
	jsonb,
	pgSchema,
	serial,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

const dbSchema = pgSchema('build_example');

export const welcomeMessage = dbSchema.table(
	'welcome_message',
	{
		serverId: varchar('server_id', { length: 19 }).primaryKey(),
		message: text(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index('welcome_message_server_id').on(table.serverId)],
);
