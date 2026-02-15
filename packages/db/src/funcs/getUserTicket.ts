import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { userTicket } from '../schema';

/**
 * ユーザが作成したチケットを取得する
 * @param db drizzle
 * @param ticketId チケットID
 * @returns
 */
export const getUserTicket = async (db: SchemaDB, ticketId: string) => {
	return await db.query.userTicket.findFirst({
		where: eq(userTicket.ticketId, ticketId),
	});
};
