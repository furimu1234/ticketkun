import { messageID, SendError } from '@ticket/lib';
import type { SchemaDB } from '../client';
import { ticketInfo } from '../schema';

export type CreateTicketInfoModel = typeof ticketInfo.$inferInsert;

/**
 * チケット作成DBを登録する
 * @param db drizzle
 * @param model model
 * @returns
 */
export const createTicketInfo = async (
	db: SchemaDB,
	model: CreateTicketInfoModel,
) => {
	const models = await db
		.insert(ticketInfo)
		.values(model)
		.onConflictDoNothing()
		.returning({ id: ticketInfo.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
