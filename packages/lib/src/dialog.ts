import {
	type Interaction,
	InteractionType,
	type LabelBuilder,
	ModalBuilder,
	type ModalSubmitFields,
	type TextDisplayBuilder,
} from 'discord.js';

type ModalField =
	| { type: 'label'; builder: LabelBuilder }
	| { type: 'text'; builder: TextDisplayBuilder };

interface ModalProp {
	customId: string;
	title: string;
	fields: ModalField[]; // 順番を保持したまま混在できる
}

export const Dialog = () => {
	const modal = async (interaction: Interaction, options: ModalProp) => {
		if (
			interaction.type === InteractionType.ApplicationCommandAutocomplete ||
			interaction.type === InteractionType.ModalSubmit
		) {
			return {} as ModalSubmitFields;
		}

		const modalBuilder = new ModalBuilder()
			.setTitle(options.title)
			.setCustomId(options.customId);

		for (const f of options.fields) {
			if (f.type === 'label') {
				modalBuilder.addLabelComponents([f.builder]);
			} else {
				modalBuilder.addTextDisplayComponents([f.builder]);
			}
		}

		await interaction.showModal(modalBuilder);

		const submitted = await interaction.awaitModalSubmit({
			filter: (x) => x.customId === options.customId,
			time: 2147483647, // 32bit max
		});

		try {
			await submitted.deferUpdate();
		} catch {
			return {} as ModalSubmitFields;
		}

		return submitted.fields;
	};

	return { modal };
};
