import { messageID, SendError } from '@ticket/lib';
import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { ticket } from '../schema';

export type UpdateTicketModel = Partial<
	Omit<
		typeof ticket.$inferSelect,
		'serverId' | 'channelId' | 'panelId' | 'createdAt' | 'updatedAt'
	>
>;

/**
 * チケット発行メッセージ・チケットクローズパネルを更新する
 * @param db drizzle
 * @param model
 * @param panelId チケットを作成したパネルのID
 * @returns
 */
export const updateTicket = async (
	db: SchemaDB,
	model: UpdateTicketModel,
	panelId: string,
) => {
	const models = await db
		.update(ticket)
		.set(model)
		.where(eq(ticket.panelId, panelId))
		.returning({ id: ticket.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
