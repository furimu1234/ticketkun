import { messageID, SendError } from '@ticket/lib';
import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { ticketInfo } from '../schema';

/**
 * チケット作成DBを更新する
 * @param db drizzle
 * @param model
 * @param panelId チケットを作成したパネルのID
 * @returns
 */
export const deleteTicketInfo = async (db: SchemaDB, panelId: string) => {
	const models = await db
		.delete(ticketInfo)
		.where(eq(ticketInfo.panelId, panelId))
		.returning({ id: ticketInfo.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
