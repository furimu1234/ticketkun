import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export * from './funcs';
export type DBSchema = typeof schema;

export type DataBase<TResult extends PgQueryResultHKT> = PgDatabase<
	TResult,
	DBSchema
>;
export type SchemaDB = PgDatabase<PgQueryResultHKT, DBSchema>;

export const MakeDataStore = <TResult extends PgQueryResultHKT>(
	client: PgDatabase<TResult, DBSchema>,
) => {
	const run = async <T>(
		f: (db: PgDatabase<TResult, DBSchema>) => Promise<T>,
	): Promise<T> => {
		const res = await client.transaction(async (tx) => {
			const result = await f(tx);
			return result;
		});
		return res;
	};

	return {
		do: run,
	};
};

export type DataStoreInterface = ReturnType<typeof MakeDataStore>;

export { schema };
