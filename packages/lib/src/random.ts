/**
 * ランダムなspeaker idを取得する(voice vox only)
 * @param maxSize
 * @returns
 */
export const getRandomSpeakerId = (maxSize = 98): number => {
	return Math.floor(Math.random() * maxSize);
};

/**
 * min ~ maxの間の整数値をランダムに取得
 * @param min 最小値
 * @param max 最大値
 * @returns
 */
export const getRandomInRange = (min: number, max: number): number => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * min ~ maxの間の小数値をランダムに取得
 * @param min 最小値
 * @param max 最大値
 * @returns
 */
export const getRandomDoubleInRange = (min: number, max: number): number => {
	return Math.round(Math.random() * (max - min) + min * 100) / 100;
};

/**
 * 指定長のランダム文字列を生成する
 * @param length 生成する文字数（デフォルトは 10）
 */
export const generateRandomString = (length = 10): string => {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + // 大文字
		'abcdefghijklmnopqrstuvwxyz' + // 小文字
		'0123456789'; // 数字
	let result = '';
	for (let i = 0; i < length; i++) {
		// Math.random() 版（シンプルだが暗号論的には弱い）
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};
