import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

function findUpEnv(startDir: string): string | null {
	let dir = startDir;
	for (let i = 0; i < 20; i++) {
		// 念のため 20
		const candidate = path.join(dir, '.env');
		if (fs.existsSync(candidate)) return candidate;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

const cwd = process.cwd();
const envPath = findUpEnv(cwd);

// 診断ログ（必ず一度出す）
console.log('[env] cwd:', cwd);
console.log('[env] envPath:', envPath);

if (envPath) {
	const raw = fs.readFileSync(envPath, 'utf8');
	console.log(
		'[env] .env first lines:\n' + raw.split('\n').slice(0, 5).join('\n'),
	);
}

const result = dotenv.config(envPath ? { path: envPath } : undefined);
console.log(
	'[env] dotenv.error:',
	result.error ? String(result.error) : 'none',
);
console.log('[env] TOKEN present after dotenv:', Boolean(process.env.TOKEN));

export const getEnv = (name: string): string => {
	const value = process.env[name];
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`環境変数が見つかりませんでした:${name}`);
	}
	return value;
};
