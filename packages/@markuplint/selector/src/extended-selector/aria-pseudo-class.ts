import type { SelectorResult } from '../types';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { getAccname } from '@markuplint/ml-spec';

/**
 * Version Syntax is not support yet.
 */
export function ariaPseudoClass() {
	return (content: string) =>
		(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: Element,
		): SelectorResult => {
			const aria = ariaPseudoClassParser(content);
			const name = getAccname(el);
			switch (aria.type) {
				case 'hasName': {
					if (name) {
						return {
							specificity: [0, 1, 0],
							matched: true,
							nodes: [el],
							has: [],
						};
					}
					return {
						specificity: [0, 1, 0],
						matched: false,
					};
				}
				case 'hasNoName': {
					if (!name) {
						return {
							specificity: [0, 1, 0],
							matched: true,
							nodes: [el],
							has: [],
						};
					}
					return {
						specificity: [0, 1, 0],
						matched: false,
					};
				}
			}
		};
}

function ariaPseudoClassParser(syntax: string): {
	type: 'hasName' | 'hasNoName';
	version?: ARIAVersion;
} {
	const [_query, _version] = syntax.split('|');
	const query = _query?.replace(/\s+/g, '').toLowerCase();
	const version = _version === '1.1' ? '1.1' : '1.2';

	switch (query) {
		case 'hasname': {
			return {
				type: 'hasName',
				version,
			};
		}
		case 'hasnoname': {
			return {
				type: 'hasNoName',
				version,
			};
		}
	}

	throw new SyntaxError(`Unsupported syntax: ${syntax}`);
}
