import type { MLElement } from '../node/element.js';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { getAccname as get, getComputedRole } from '@markuplint/ml-spec';

import { log } from '../../debug.js';

const accnameLog = log.extend('accname');

export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
): string {
	let accname = safeGet(el);
	if (accname) {
		return accname;
	}
	accname = getAccnameFromPretender(el);
	if (accname) {
		return accname;
	}
	if (isHidden(el)) {
		return '';
	}
	if (isFromContent(el, version)) {
		return Array.from(el.childNodes)
			.map(child => {
				if (child.is(child.ELEMENT_NODE)) {
					return getAccname(child, version);
				}
				if (child.is(child.TEXT_NODE)) {
					return child.textContent ?? '';
				}
				return '';
			})
			.join('');
	}
	return '';
}

function safeGet(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
) {
	try {
		const name = get(el);
		return name;
	} catch (err) {
		accnameLog('Raw: %s', el.raw);
		accnameLog('Error: %O', err);
		return '';
	}
}

function getAccnameFromPretender(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
) {
	if (el.pretenderContext?.type === 'pretender' && el.pretenderContext.aria?.name != null) {
		if (typeof el.pretenderContext.aria.name === 'boolean') {
			return 'some-name(Pretender Options)';
		}
		const attrName = el.pretenderContext.aria.name.fromAttr;
		const attrValue = el.getAttributePretended(attrName);
		if (attrValue) {
			return attrValue;
		}
	}
	return '';
}

function isHidden(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
) {
	return el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden');
}

function isFromContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<any, any>,
	version: ARIAVersion,
) {
	const role = getComputedRole(el.ownerMLDocument.specs, el, version);
	return !!role.role?.accessibleNameFromContent;
}
