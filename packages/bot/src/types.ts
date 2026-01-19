import type { DataStoreInterface } from '@example_build/db';
import type {
	Interaction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export type DataStore = unknown; // @tts/db の型があるなら差し替え可

export type IContainer = {
	getDataStore: () => DataStoreInterface;
};

export type ContainerRef = { current: IContainer | undefined };
export type slashCommands = RESTPostAPIChatInputApplicationCommandsJSONBody[];

export type commandExecute = (interaction: Interaction) => Promise<void>;
