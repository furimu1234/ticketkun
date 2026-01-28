export class SendError extends Error {
	public readonly userMessage: string;
	public readonly isZod: boolean;

	constructor(
		userMessage: string,
		isZod: boolean = false,
		options?: ErrorOptions,
	) {
		super(userMessage, options);
		this.name = 'SendError';
		this.userMessage = userMessage;
		this.isZod = isZod;
	}
}
