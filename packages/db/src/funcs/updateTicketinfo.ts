import { messageID, SendError } from '@ticket/lib';
import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { ticketInfo } from '../schema';

export type UpdateTicketInfoModel = Partial<
	Omit<
		typeof ticketInfo.$inferSelect,
		'serverId' | 'channelId' | 'panelId' | 'createdAt' | 'updatedAt'
	>
>;

/**
 * チケット作成DBを更新する
 * @param db drizzle
 * @param model
 * @param panelId チケットを作成したパネルのID
 * @returns
 */
export const updateTicketInfo = async (
	db: SchemaDB,
	model: UpdateTicketInfoModel,
	panelId: string,
) => {
	const models = await db
		.update(ticketInfo)
		.set(model)
		.where(eq(ticketInfo.panelId, panelId))
		.returning({ id: ticketInfo.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
