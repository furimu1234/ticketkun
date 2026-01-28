import { messageID, SendError } from '@ticket/lib';
import type { SchemaDB } from '../client';
import { ticket } from '../schema';

export type CreateTicketInfoModel = typeof ticket.$inferInsert;

/**
 * チケット発行時に送信される最初のメッセージを登録する
 * @param db drizzle
 * @param model model
 * @returns
 */
export const createTicket = async (
	db: SchemaDB,
	model: CreateTicketInfoModel,
) => {
	const models = await db
		.insert(ticket)
		.values(model)
		.onConflictDoNothing()
		.returning({ id: ticket.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
