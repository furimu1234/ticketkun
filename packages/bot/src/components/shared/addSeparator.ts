import { SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

interface SeparatorType {
	isDivider?: boolean;
	spaceSize?: SeparatorSpacingSize;
}

export function addSeparatorBuilder(options?: SeparatorType): SeparatorBuilder {
	const { isDivider = true, spaceSize = SeparatorSpacingSize.Large } =
		options ?? {};

	return new SeparatorBuilder().setDivider(isDivider).setSpacing(spaceSize);
}
