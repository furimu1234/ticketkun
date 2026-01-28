import type { Guild, User } from 'discord.js';

export const getMemberByUser = async (guild: Guild, user: User) => {
	if (guild.members.cache.size === 1) {
		await guild.members.fetch();
	}
	return guild.members.cache.get(user.id);
};

export const getMemberById = async (guild: Guild, id: string) => {
	if (guild.members.cache.size === 1) {
		await guild.members.fetch();
	}
	return guild.members.cache.get(id);
};
