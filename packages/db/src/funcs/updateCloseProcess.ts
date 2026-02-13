import { messageID, SendError } from '@ticket/lib';
import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { closeProcessOnButton } from '../schema';

export type UpdateCloseProcessModel = Partial<
	Omit<
		typeof closeProcessOnButton.$inferSelect,
		'serverId' | 'channelId' | 'panelId' | 'createdAt' | 'updatedAt'
	>
>;

/**
 * クローズ処理を更新する
 * @param db drizzle
 * @param model
 * @param panelId チケットを作成したパネルのID
 * @returns
 */
export const updateCloseProcess = async (
	db: SchemaDB,
	model: UpdateCloseProcessModel,
	customId: string,
) => {
	const models = await db
		.update(closeProcessOnButton)
		.set(model)
		.where(eq(closeProcessOnButton.triggerCustomId, customId))
		.returning({ id: closeProcessOnButton.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
