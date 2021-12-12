import type { CustomSyntaxChecker } from '../types';

// @ts-ignore
import MIMEType from 'whatwg-mimetype';

import { matched, unmatched } from '../match-result';
import { Token } from '../token';

const expects = (withoutParameters: boolean) => [
	{
		type: 'format' as const,
		value: withoutParameters ? 'MIME Type with no parameters' : 'MIME Type',
	},
];

/**
 * MIME Type
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
	const mimeType = MIMEType.parse(value);
	if (mimeType) {
		if (value.toLowerCase() === mimeType.essence) {
			return matched();
		}
		if (!withoutParameters && mimeType.parameters.size) {
			return matched();
		}
		const extraToken = value.slice(mimeType.essence.length);
		return new Token(extraToken, mimeType.essence.length, value).unmatched({
			reason: 'extra-token',
			expects: expects(withoutParameters),
			candicate: mimeType.essence,
		});
	}
	return unmatched(value, 'syntax-error', { expects: expects(withoutParameters) });
};
