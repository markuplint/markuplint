import type { MLElement } from '../node/element';

import { getAccname as _getAccname } from '@markuplint/ml-spec';

import { log } from '../../debug';

const accnameLog = log.extend('accname');

export function getAccname(el: MLElement<any, any>) {
	try {
		const name = _getAccname(el);
		return name;
	} catch (err) {
		accnameLog('Raw: %s', el.raw);
		accnameLog('Error: %O', err);
		return '';
	}
}
