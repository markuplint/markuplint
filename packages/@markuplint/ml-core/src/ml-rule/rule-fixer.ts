import type { IRuleFixer, TextEdit } from '@markuplint/ml-config';

/**
 * Stateless implementation of {@link IRuleFixer}.
 * Provides helper methods for building {@link TextEdit} objects
 * inside rule fix callbacks.
 */
export class RuleFixer implements IRuleFixer {
	replaceText(token: { readonly startOffset: number; readonly raw: string }, text: string): TextEdit {
		return {
			range: [token.startOffset, token.startOffset + token.raw.length],
			text,
		};
	}

	replaceRange(range: readonly [number, number], text: string): TextEdit {
		return { range, text };
	}

	insertBefore(token: { readonly startOffset: number }, text: string): TextEdit {
		return { range: [token.startOffset, token.startOffset], text };
	}

	insertAfter(token: { readonly startOffset: number; readonly raw: string }, text: string): TextEdit {
		const end = token.startOffset + token.raw.length;
		return { range: [end, end], text };
	}

	remove(token: { readonly startOffset: number; readonly raw: string }): TextEdit {
		return {
			range: [token.startOffset, token.startOffset + token.raw.length],
			text: '',
		};
	}

	removeRange(range: readonly [number, number]): TextEdit {
		return { range, text: '' };
	}
}
