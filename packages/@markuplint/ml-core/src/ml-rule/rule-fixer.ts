import type { FixToken, IRuleFixer, TextEdit } from '@markuplint/ml-config';

/**
 * Stateless implementation of {@link IRuleFixer}.
 * Provides helper methods for building {@link TextEdit} objects
 * inside rule fix callbacks.
 */
export class RuleFixer implements IRuleFixer {
	/** @see {@link IRuleFixer.replaceText} */
	replaceText(token: FixToken, text: string): TextEdit {
		return {
			range: [token.startOffset, token.startOffset + token.raw.length],
			text,
		};
	}

	/** @see {@link IRuleFixer.replaceRange} */
	replaceRange(range: readonly [number, number], text: string): TextEdit {
		return { range, text };
	}

	/** @see {@link IRuleFixer.insertBefore} */
	insertBefore(token: Pick<FixToken, 'startOffset'>, text: string): TextEdit {
		return { range: [token.startOffset, token.startOffset], text };
	}

	/** @see {@link IRuleFixer.insertAfter} */
	insertAfter(token: FixToken, text: string): TextEdit {
		const end = token.startOffset + token.raw.length;
		return { range: [end, end], text };
	}

	/** @see {@link IRuleFixer.remove} */
	remove(token: FixToken): TextEdit {
		return {
			range: [token.startOffset, token.startOffset + token.raw.length],
			text: '',
		};
	}

	/** @see {@link IRuleFixer.removeRange} */
	removeRange(range: readonly [number, number]): TextEdit {
		return { range, text: '' };
	}
}
