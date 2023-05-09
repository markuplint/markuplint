export class InvalidSelectorError extends Error {
	name = 'InvalidSelectorError';
	selector: string;
	constructor(selector: string, message?: string) {
		super(message ?? `Invalid selector: "${selector}"`);
		this.selector = selector;
	}
}
