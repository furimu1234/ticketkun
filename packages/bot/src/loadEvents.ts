import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// CJS なら require をそのまま使える（TS でもOK）

async function getAllEventFiles(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			const subFiles = await getAllEventFiles(fullPath);
			files.push(...subFiles);
			continue;
		}

		// dist では .js だけを対象にする（.ts / .d.ts / .map を除外）
		if (entry.isFile() && entry.name.endsWith('.js')) {
			files.push(fullPath); // ここは絶対パスになる
		}
	}

	return files;
}

export async function loadEvents(
	client: import('discord.js').Client,
	dir: string,
) {
	const files = await getAllEventFiles(dir);

	for (const absPath of files) {
		// ここで file URL に変換しない！ CJS の require はパス文字列を取る
		// const filePath = path.resolve(dir, absPath); // ← absPath はもう絶対パス。二重解決しない
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const eventModule = require(absPath);
			const { name, once, execute } = eventModule;

			if (!name || !execute) continue;

			console.log('LOAD EVENT | FILE: ', absPath, ' | EVENT NAME: ', name);

			if (once) {
				client.once(name, (...args) => execute(...args));
			} else {
				client.on(name, (...args) => execute(...args));
			}
		} catch (e) {
			console.error('FAILED TO LOAD EVENT:', absPath, e);
		}
	}
}
