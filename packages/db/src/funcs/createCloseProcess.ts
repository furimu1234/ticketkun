import { messageID, SendError } from '@ticket/lib';
import type { SchemaDB } from '../client';
import { closeProcessOnButton } from '../schema';

export type CreateCloseProcessModel = typeof closeProcessOnButton.$inferInsert;

/**
 * チケットクローズ処理を登録する
 * @param db drizzle
 * @param model model
 * @returns
 */
export const createCloseProcess = async (
	db: SchemaDB,
	model: CreateCloseProcessModel,
) => {
	const models = await db
		.insert(closeProcessOnButton)
		.values(model)
		.onConflictDoNothing()
		.returning({ id: closeProcessOnButton.panelId });

	if (models.length !== 1) {
		throw new SendError(messageID.E00001());
	}

	return true;
};
