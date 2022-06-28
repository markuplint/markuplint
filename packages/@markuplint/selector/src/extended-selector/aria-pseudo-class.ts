import type { SelectorResult } from '../types';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { getAccname } from '@markuplint/ml-spec';

/**
 * Version Syntax is not support yet.
 */
export function ariaPseudoClass() {
	return (content: string) =>
		(el: Element): SelectorResult => {
			const aria = ariaPseudoClassParser(content);
			switch (aria.type) {
				case 'hasName': {
					const name = getAccname(el);
					return {
						specificity: [0, 1, 0],
						matched: !!name,
					};
				}
				case 'hasNoName': {
					const name = getAccname(el);
					return {
						specificity: [0, 1, 0],
						matched: !name,
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
	const query = _query.replace(/\s+/g, '').toLowerCase();
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
