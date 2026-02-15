import { asc, eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { closeProcessOnButton } from '../schema';

/**
 * クローズ処理を取得する
 * @param db drizzle
 * @param panelId チケットを作成するパネルのID
 * @returns
 */
export const getCloseProcess = async (db: SchemaDB, customId: string) => {
	return await db.query.closeProcessOnButton.findFirst({
		where: eq(closeProcessOnButton.triggerCustomId, customId),
	});
};
/**
 * クローズ処理を複数取得する
 * @param db drizzle
 * @param panelId チケットを作成するパネルのID
 * @returns
 */
export const getCloseProcessFromPanelId = async (
	db: SchemaDB,
	panelId: string,
) => {
	return await db.query.closeProcessOnButton.findMany({
		where: eq(closeProcessOnButton.panelId, panelId),
		orderBy: asc(closeProcessOnButton.createdAt),
	});
};
