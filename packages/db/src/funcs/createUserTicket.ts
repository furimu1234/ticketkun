import { messageID, SendError } from '@ticket/lib';
import type { SchemaDB } from '../client';
import { userTicket } from '../schema';

export type CreateUserTicketModel = typeof userTicket.$inferInsert;

/**
 * 作成されたチケットを1か月保存する
 * @param db drizzle
 * @param model model
 * @returns
 */
export const createUserTicket = async (
	db: SchemaDB,
	model: CreateUserTicketModel,
) => {
	const models = await db
		.insert(userTicket)
		.values(model)
		.onConflictDoNothing()
		.returning({ id: userTicket.ticketId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
