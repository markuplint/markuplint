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
 * [RFC 9110 §5.6.6](https://www.rfc-editor.org/rfc/rfc9110#name-parameters)
 * requires the closing DQUOTE in `quoted-string`; the
 * [WHATWG MIME Sniffing](https://mimesniff.spec.whatwg.org/#parse-a-mime-type)
 * parser tolerates the missing terminator and returns a partial value (so
 * `MIMEType.parse` cannot surface this conformance error). We do the
 * structural scan ourselves and run it before invoking the parser.
 *
 * **Limitation:** the scan assumes the opening DQUOTE immediately follows
 * the `=` byte. RFC 9110 allows OWS (optional whitespace) around `=`, but
 * WHATWG MIME Sniffing's tokenizer (and every nu-validator-known input
 * today) closes that gap. If a future fixture exercises `; charset = "..."`
 * style spacing, extend this scan to skip OWS before checking for `"`.
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
		let terminated = false;
		while (i < value.length) {
			if (value[i] === '\\') {
				i += 2;
				continue;
			}
			if (value[i] === '"') {
				i++;
				terminated = true;
				break;
			}
			i++;
		}
		if (!terminated) {
			return { offset: start };
		}
	}
	return null;
}

/**
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
