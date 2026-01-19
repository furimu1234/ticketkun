import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { welcomeMessage } from '../schema';

export const getWelcomeMessage = async (db: SchemaDB, serverId: string) => {
	return await db.query.welcomeMessage.findFirst({
		where: eq(welcomeMessage.serverId, serverId),
	});
};
