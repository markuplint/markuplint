import type { SelectorResult } from '../types';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { getComputedRole, getAccname } from '@markuplint/ml-spec';

const roleIsRegxp = /^roleis/gi;

export function ariaPseudoClass(specs: MLMLSpec) {
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
				case 'roleIs': {
					const computed = getComputedRole(specs, el, aria.version ?? '1.2');
					return {
						specificity: [0, 1, 0],
						matched: computed.role?.name === aria.role,
					};
				}
			}
		};
}

function ariaPseudoClassParser(syntax: string):
	| {
			type: 'hasName' | 'hasNoName';
			version?: ARIAVersion;
	  }
	| {
			type: 'roleIs';
			role: string;
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

	if (roleIsRegxp.test(query)) {
		const role = query.replace(roleIsRegxp, '');
		if (!role) {
			throw new SyntaxError(`Unsupported syntax: ${syntax}`);
		}
		return {
			type: 'roleIs',
			role,
			version,
		};
	}

	throw new SyntaxError(`Unsupported syntax: ${syntax}`);
}
