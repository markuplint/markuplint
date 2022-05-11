import type { MLElement } from '../node/element';

import { computeAccessibleName } from 'dom-accessibility-api';

import { log } from '../../debug';

const accnameLog = log.extend('accname');

export function getAccname(el: MLElement<any, any>) {
	try {
		const name = computeAccessibleName(el);
		return name;
	} catch (err) {
		accnameLog('Raw: %s', el.raw);
		accnameLog('Error: %O', err);
		return '';
	}
}
