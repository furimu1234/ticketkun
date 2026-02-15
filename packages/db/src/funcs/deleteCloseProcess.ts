import { messageID, SendError } from '@ticket/lib';
import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { closeProcessOnButton } from '../schema';

/**
 * 処理DBを削除する
 * @param db drizzle
 * @param customId 処理が発火するボタンのcustomId
 * @returns
 */
export const deleteCloseProcess = async (db: SchemaDB, customId: string) => {
	const models = await db
		.delete(closeProcessOnButton)
		.where(eq(closeProcessOnButton.triggerCustomId, customId))
		.returning({ id: closeProcessOnButton.triggerCustomId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
