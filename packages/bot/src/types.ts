import type { DataStoreInterface } from '@ticket/db';
import type {
	Interaction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export type DataStore = unknown; // @tts/db の型があるなら差し替え可

export type IContainer = {
	getDataStore: () => DataStoreInterface;
};

export type slashCommands = RESTPostAPIChatInputApplicationCommandsJSONBody[];

export type commandExecute = (interaction: Interaction) => Promise<void>;

export type StringRecord = Record<string, string>;
export type StringArray<T> = T extends (infer U)[] ? StringArray<U>[] : never;

type PreviewEmbedField = {
	name: string;
	value: string;
	inline?: string;
};

type PreviewEmbed = {
	title?: string;
	description?: string;
	color?: string;
	fields?: PreviewEmbedField[];
	footer?: { text: string; icon_url?: string }; // icon_url は url ではないので残す
	author?: { name: string; icon_url?: string }; // 同上
};

type PreviewButtonRow = {
	type: 'button';
	style: string;
	label: string;
	emoji?: string;
	customId: string;
	disabled?: string;
	// url は除外
};

type PreviewSelectOption = {
	label: string;
	value: string;
	description?: string;
	emoji?: string;
	default?: string;
};

type PreviewStringSelectRow = {
	type: 'stringSelect';
	customId: string;
	options: PreviewSelectOption[];
	placeholder?: string;
	minValues: string;
	maxValues: string;
	required?: string;
	disabled?: string;
};

type PreviewDiscordObjSelectRow = {
	type: 'discordSelect';
	subType: 'user' | 'channel' | 'role';
	customId: string;
	defaultValues: string[]; // 元から string[]
	placeholder?: string;
	minValues: string;
	maxValues: string;
	required?: string;
	disabled?: string;
};

type PreviewRowV1 = {
	version: 1;
	components: Array<
		Array<
			PreviewButtonRow | PreviewStringSelectRow | PreviewDiscordObjSelectRow
		>
	>;
};

type PreviewTextDisplay = {
	type: 'textDisplay';
	content: string;
};

type PreviewSeparator = {
	type: 'separator';
	divider?: string;
	spacing?: string;
};

type PreviewSection = {
	type: 'section';
	textDisplay: PreviewTextDisplay;
	accessory: PreviewButtonRow;
};

type PreviewRowV2 = {
	version: 2;
	components: Array<
		| PreviewSection
		| PreviewTextDisplay
		| PreviewSeparator
		| { type: 'row'; rows: PreviewRowV1 }
	>;
};

type PreviewRows = PreviewRowV1 | PreviewRowV2;

export type PreviewDiscordMessageTemplate = {
	content?: string;
	embeds?: PreviewEmbed[];
	rows?: PreviewRows;
};
