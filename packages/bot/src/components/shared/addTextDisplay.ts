import {
	type APITextDisplayComponent,
	ComponentType,
	TextDisplayBuilder,
} from 'discord.js';

export function addTextDisplay(content: string): APITextDisplayComponent {
	return {
		content: content,
		type: ComponentType.TextDisplay,
	};
}
export function addTextDisplayBuilder(content: string): TextDisplayBuilder {
	return new TextDisplayBuilder({
		content: content,
	});
}
