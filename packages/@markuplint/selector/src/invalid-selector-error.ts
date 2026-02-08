/**
 * Error thrown when a CSS selector string cannot be parsed.
 */
export class InvalidSelectorError extends Error {
	name = 'InvalidSelectorError';

	/** The invalid selector string that caused this error */
	selector: string;

	/**
	 * @param selector - The invalid selector string
	 * @param message - An optional custom error message
	 */
	constructor(selector: string, message?: string) {
		super(message ?? `Invalid selector: "${selector}"`);
		this.selector = selector;
	}
}
