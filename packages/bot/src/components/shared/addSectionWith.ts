import { ButtonBuilder, ButtonStyle, SectionBuilder } from 'discord.js';
import { addTextDisplayBuilder } from './addTextDisplay';

interface sectionWithButtonType {
	contents: string[];
	buttonCustomId: string;
	buttonLabel: string;
	buttonStyle?: ButtonStyle;
	buttonDisable?: boolean;
}

export function addSectionWithTextBuilder({
	contents,
}: Pick<sectionWithButtonType, 'contents'>) {
	return new SectionBuilder().addTextDisplayComponents(
		contents.map((x) => addTextDisplayBuilder(x)),
	);
}

export function addSectionWithButtonBuilder({
	contents,
	buttonCustomId,
	buttonLabel,
	buttonStyle = ButtonStyle.Secondary,
	buttonDisable = false,
}: sectionWithButtonType) {
	return new SectionBuilder()
		.addTextDisplayComponents(addTextDisplayBuilder(contents.join('\n')))
		.setButtonAccessory(
			new ButtonBuilder()
				.setCustomId(buttonCustomId)
				.setLabel(buttonLabel)
				.setStyle(buttonStyle)
				.setDisabled(buttonDisable),
		);
}
