import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env' });
export const getEnv = (name: string): string => {
	const value = process.env[name];

	if (typeof value !== 'string')
		throw new Error(`環境変数が見つかりませんでした:${name}`);

	return value;
};
