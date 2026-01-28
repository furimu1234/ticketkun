import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { ticket } from '../schema';

/**
 * チケット発行時に取得するパネル・クローズ処理を取得
 * @param db drizzle
 * @param panelId チケットを作成するパネルのID
 * @returns
 */
export const getTicket = async (db: SchemaDB, panelId: string) => {
	return await db.query.ticket.findFirst({
		where: eq(ticket.panelId, panelId),
	});
};
