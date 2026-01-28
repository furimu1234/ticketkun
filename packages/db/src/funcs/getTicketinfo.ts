import { asc, eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { ticketInfo } from '../schema';

/**
 * チケット作成DBを取得する
 * @param db drizzle
 * @param panelId チケットを作成するパネルのID
 * @returns
 */
export const getTicketInfo = async (db: SchemaDB, panelId: string) => {
	return await db.query.ticketInfo.findFirst({
		where: eq(ticketInfo.panelId, panelId),
	});
};

/**
 * 指定したチャンネルに登録されてるパネル一覧を取得する
 * @param db drizzle
 * @param channelId パネルを作成したチャンネルのID
 * @returns
 */
export const getTicketInfos = async (db: SchemaDB, channelId: string) => {
	return await db.query.ticketInfo.findMany({
		where: eq(ticketInfo.channelId, channelId),
		orderBy: asc(ticketInfo.panelId),
	});
};
