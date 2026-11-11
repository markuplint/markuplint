/**
 * Error thrown when a CSS selector string is the fault of the user's configuration: it cannot be
 * parsed, it uses syntax the selector engine does not support (a nesting selector, the column
 * combinator, a pseudo-class that is not matched), or an extended pseudo-class
 * (`:model()`, `:aria()`, `:role()`, `:display-size()`) has an argument it does not accept.
 *
 * It is thrown when the selector is created, not when it meets an element.
 */
export class InvalidSelectorError extends Error {
	name = 'InvalidSelectorError';

	/**
	 * The text that caused this error: the whole selector for a selector that cannot be parsed or
	 * has an unsupported combinator or pseudo-class, and the pseudo-class itself
	 * (`:aria(foo)`) for an argument that is not accepted.
	 */
	selector: string;

	/**
	 * @param selector - The text that caused this error (see {@link InvalidSelectorError.selector})
	 * @param message - An optional custom error message
	 */
	constructor(selector: string, message?: string) {
		super(message ?? `Invalid selector: "${selector}"`);
		this.selector = selector;
	}
}
