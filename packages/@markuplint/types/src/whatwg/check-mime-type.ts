import type { CustomSyntaxChecker } from '../types.js';

// @ts-ignore -- whatwg-mimetype v5 has no type definitions
import { MIMEType } from 'whatwg-mimetype';

import { matched, unmatched } from '../match-result.js';
import { Token } from '../token/index.js';

const expects = (withoutParameters: boolean) => [
	{
		type: 'format' as const,
		value: withoutParameters ? 'MIME Type with no parameters' : 'MIME Type',
	},
];

/**
 * Locates the start position of a parameter whose quoted-string value is
 * unterminated (no closing DQUOTE before end-of-string), or `null` when every
 * quoted-string is properly closed.
 *
 * RFC 9110 §5.6.6 requires the closing DQUOTE in `quoted-string`; the WHATWG
 * MIME Sniffing parser tolerates the missing terminator and returns a partial
 * value (so `MIMEType.parse` cannot surface this conformance error). We do
 * the structural scan ourselves and run it before invoking the parser.
 *
 * @param value Raw attribute value to scan.
 * @returns The offset of the opening DQUOTE of the unterminated parameter, or `null`.
 */
function findUnterminatedQuotedString(value: string): { readonly offset: number } | null {
	for (let i = 0; i < value.length; ) {
		if (value[i] !== ';') {
			i++;
			continue;
		}
		i++;
		while (i < value.length && value[i] !== '=' && value[i] !== ';') i++;
		if (i >= value.length || value[i] === ';') continue;
		i++;
		if (i >= value.length || value[i] !== '"') continue;
		const start = i;
		i++;
		while (i < value.length) {
			if (value[i] === '\\') {
				i += 2;
				continue;
			}
			if (value[i] === '"') {
				i++;
				break;
			}
			i++;
		}
		if (i > value.length || (i === value.length && value[i - 1] !== '"')) {
			return { offset: start };
		}
	}
	return null;
}

/**
 * Validates a MIME type string according to the WHATWG MIME Sniffing specification.
 *
 * Optionally restricts to MIME types with no parameters.
 *
 * @see https://mimesniff.spec.whatwg.org/#valid-mime-type
 */
export const checkMIMEType: CustomSyntaxChecker<{
	/**
	 * @see https://mimesniff.spec.whatwg.org/#valid-mime-type-with-no-parameters
	 */
	withoutParameters?: boolean;
}> = options => value => {
	const withoutParameters = options?.withoutParameters ?? false;
	if (!value) {
		return unmatched(value, 'empty-token', { expects: expects(withoutParameters) });
	}
	const unterminated = findUnterminatedQuotedString(value);
	if (unterminated) {
		return new Token(value.slice(unterminated.offset), unterminated.offset, value).unmatched({
			reason: 'syntax-error',
			expects: expects(withoutParameters),
		});
	}
	const mimeType = MIMEType.parse(value);
	if (mimeType) {
		if (value.toLowerCase() === mimeType.essence) {
			return matched();
		}
		if (!withoutParameters && mimeType.parameters.size > 0) {
			return matched();
		}
		const extraToken = value.slice(mimeType.essence.length);
		return new Token(extraToken, mimeType.essence.length, value).unmatched({
			reason: 'extra-token',
			expects: expects(withoutParameters),
			candidate: mimeType.essence,
		});
	}
	return unmatched(value, 'syntax-error', { expects: expects(withoutParameters) });
};
